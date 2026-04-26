"""
API views for KYCFlow.

All endpoints are under /api/v1/
"""
from django.utils import timezone
from django.db import transaction as db_transaction
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import KYCSubmission, Document, Notification
from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    KYCSubmissionSerializer,
    KYCSubmissionWriteSerializer,
    DocumentSerializer,
    ReviewActionSerializer,
    NotificationSerializer,
)
from .permissions import IsMerchant, IsReviewer
from .state_machine import transition, InvalidTransitionError


# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'id': user.id, 'username': user.username, 'role': user.role},
            status=status.HTTP_201_CREATED
        )


class UserProfileView(APIView):
    """GET: returns the current user's id, username, and role.
    Used by the frontend after login to determine role without probing other endpoints.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'role': request.user.role,
        })


# ─────────────────────────────────────────────────────────────────────────────
# MERCHANT
# ─────────────────────────────────────────────────────────────────────────────

class MerchantSubmissionView(APIView):
    """GET/PATCH the merchant's own latest draft or active submission."""
    permission_classes = [IsMerchant]

    def _get_or_create_submission(self, user):
        submission = KYCSubmission.objects.filter(merchant=user).order_by('-created_at', '-id').first()
        if not submission:
            submission = KYCSubmission.objects.create(merchant=user, status='draft')
        return submission

    def get(self, request):
        submission = self._get_or_create_submission(request.user)
        serializer = KYCSubmissionSerializer(submission)
        return Response(serializer.data)

    def post(self, request):
        """Allow creating a fresh submission if the current one is terminal."""
        latest = self._get_or_create_submission(request.user)
        if latest.status not in ('approved', 'rejected'):
            return Response(
                {'detail': f"You already have an active submission in '{latest.status}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create fresh submission
        new_submission = KYCSubmission.objects.create(merchant=request.user, status='draft')
        return Response(KYCSubmissionSerializer(new_submission).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        submission = self._get_or_create_submission(request.user)
        if submission.status not in ('draft', 'more_info_requested'):
            return Response(
                {'detail': f"Cannot edit submission in '{submission.status}' state."},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = KYCSubmissionWriteSerializer(submission, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Refresh from DB to return latest state
        submission.refresh_from_db()
        return Response(KYCSubmissionSerializer(submission).data)


class SubmitKYCView(APIView):
    """POST: transition merchant's submission draft → submitted."""
    permission_classes = [IsMerchant]

    def post(self, request, submission_id):
        try:
            submission = KYCSubmission.objects.select_for_update().get(
                pk=submission_id, merchant=request.user
            )
        except KYCSubmission.DoesNotExist:
            return Response({'detail': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            with db_transaction.atomic():
                submission = transition(submission, 'submitted', actor=request.user)
        except InvalidTransitionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(KYCSubmissionSerializer(submission).data)


class DocumentUploadView(APIView):
    """POST: upload a document for a submission."""
    permission_classes = [IsMerchant]

    def post(self, request, submission_id):
        try:
            submission = KYCSubmission.objects.get(pk=submission_id, merchant=request.user)
        except KYCSubmission.DoesNotExist:
            return Response({'detail': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        if submission.status not in ('draft', 'more_info_requested'):
            return Response(
                {'detail': 'Documents can only be uploaded when the submission is in draft or more_info_requested state.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = DocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        doc_type = serializer.validated_data['doc_type']
        file = serializer.validated_data['file']

        # Replace existing document of the same type if it exists
        doc, created = Document.objects.update_or_create(
            submission=submission,
            doc_type=doc_type,
            defaults={'file': file}
        )
        
        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def get(self, request, submission_id):
        try:
            submission = KYCSubmission.objects.get(pk=submission_id, merchant=request.user)
        except KYCSubmission.DoesNotExist:
            return Response({'detail': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        docs = submission.documents.all()
        return Response(DocumentSerializer(docs, many=True).data)


class MerchantNotificationsView(APIView):
    permission_classes = [IsMerchant]

    def get(self, request):
        notifications = Notification.objects.filter(merchant=request.user)[:20]
        return Response(NotificationSerializer(notifications, many=True).data)


# ─────────────────────────────────────────────────────────────────────────────
# REVIEWER
# ─────────────────────────────────────────────────────────────────────────────

class ReviewerQueueView(APIView):
    """GET: list all submissions (oldest first) with SLA flag."""
    permission_classes = [IsReviewer]

    def get(self, request):
        sla_threshold = timezone.now() - timedelta(hours=24)
        submissions = KYCSubmission.objects.select_related('merchant').prefetch_related('documents').order_by('created_at')

        data = []
        for sub in submissions:
            serializer_data = KYCSubmissionSerializer(sub).data
            data.append(serializer_data)

        return Response(data)


class ReviewerSubmissionDetailView(APIView):
    """GET: full submission detail."""
    permission_classes = [IsReviewer]

    def get(self, request, submission_id):
        try:
            submission = KYCSubmission.objects.select_related('merchant').prefetch_related('documents').get(pk=submission_id)
        except KYCSubmission.DoesNotExist:
            return Response({'detail': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(KYCSubmissionSerializer(submission).data)


class ReviewActionView(APIView):
    """POST: reviewer takes action on a submission."""
    permission_classes = [IsReviewer]

    ACTION_TO_STATUS = {
        'approve': 'approved',
        'reject': 'rejected',
        'request_more_info': 'more_info_requested',
    }

    def post(self, request, submission_id):
        try:
            submission = KYCSubmission.objects.select_for_update().get(pk=submission_id)
        except KYCSubmission.DoesNotExist:
            return Response({'detail': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Auto-transition submitted → under_review if needed
        if submission.status == 'submitted':
            try:
                with db_transaction.atomic():
                    submission = transition(submission, 'under_review', actor=request.user)
            except InvalidTransitionError as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReviewActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        reason = serializer.validated_data.get('reason', '')
        new_status = self.ACTION_TO_STATUS[action]

        try:
            with db_transaction.atomic():
                submission = transition(submission, new_status, actor=request.user, reason=reason)
        except InvalidTransitionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(KYCSubmissionSerializer(submission).data)


class ReviewerMetricsView(APIView):
    """GET: dashboard metrics for reviewers."""
    permission_classes = [IsReviewer]

    def get(self, request):
        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)
        sla_threshold = now - timedelta(hours=24)

        total_pending = KYCSubmission.objects.filter(
            status__in=['submitted', 'under_review']
        ).count()

        # Approval rate in last 7 days
        resolved_7d = KYCSubmission.objects.filter(
            status__in=['approved', 'rejected'],
            updated_at__gte=seven_days_ago
        )
        approved_7d = resolved_7d.filter(status='approved').count()
        total_resolved_7d = resolved_7d.count()
        approval_rate_7d = (approved_7d / total_resolved_7d * 100) if total_resolved_7d > 0 else 0

        # Average time in queue (submitted/under_review only)
        pending_subs = KYCSubmission.objects.filter(status__in=['submitted', 'under_review'])
        if pending_subs.exists():
            total_seconds = sum(
                (now - sub.created_at).total_seconds() for sub in pending_subs
            )
            avg_seconds = total_seconds / pending_subs.count()
            avg_hours = round(avg_seconds / 3600, 2)
        else:
            avg_hours = 0

        # At-risk count
        at_risk_count = sum(
            1 for sub in pending_subs
            if (now - sub.updated_at).total_seconds() > 86400
        )

        return Response({
            'total_pending': total_pending,
            'approval_rate_7d': round(approval_rate_7d, 2),
            'avg_time_in_queue_hours': avg_hours,
            'at_risk_count': at_risk_count,
        })
