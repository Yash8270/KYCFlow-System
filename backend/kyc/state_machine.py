"""
Centralized state machine for KYC submissions.
All status transitions must go through this module.
"""
from django.utils import timezone
from django.db import transaction
from .models import Notification


class InvalidTransitionError(Exception):
    """Raised when an invalid state transition is attempted."""
    pass


# Define all allowed transitions
ALLOWED_TRANSITIONS = {
    'draft': ['submitted'],
    'submitted': ['under_review'],
    'under_review': ['approved', 'rejected', 'more_info_requested'],
    'more_info_requested': ['submitted'],
    # Terminal states — no further transitions
    'approved': [],
    'rejected': [],
}

# Map transition → event_type for notifications
TRANSITION_EVENTS = {
    ('draft', 'submitted'): 'kyc_submitted',
    ('submitted', 'under_review'): 'kyc_under_review',
    ('under_review', 'approved'): 'kyc_approved',
    ('under_review', 'rejected'): 'kyc_rejected',
    ('under_review', 'more_info_requested'): 'kyc_more_info_requested',
    ('more_info_requested', 'submitted'): 'kyc_resubmitted',
}


@transaction.atomic
def transition(submission, new_status, actor, reason=''):
    """
    Attempt to transition a KYCSubmission to new_status.
    Entire function is atomic to prevent race conditions during status checks.
    """
    current_status = submission.status

    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise InvalidTransitionError(
            f"Transition from '{current_status}' to '{new_status}' is not allowed. "
            f"Allowed transitions: {allowed or 'none (terminal state)'}"
        )

    # Apply the transition
    submission.status = new_status
    if new_status in ('rejected', 'more_info_requested'):
        submission.rejection_reason = reason
    elif new_status == 'approved':
        submission.rejection_reason = ''

    submission.save(update_fields=['status', 'rejection_reason', 'updated_at'])

    # Log notification
    event_type = TRANSITION_EVENTS.get((current_status, new_status), 'kyc_status_changed')
    Notification.objects.create(
        merchant=submission.merchant,
        event_type=event_type,
        payload={
            'submission_id': submission.pk,
            'from_status': current_status,
            'to_status': new_status,
            'actor_id': actor.pk,
            'actor_username': actor.username,
            'reason': reason,
            'timestamp': timezone.now().isoformat(),
        }
    )

    return submission
