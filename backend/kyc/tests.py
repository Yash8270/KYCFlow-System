"""
Tests for KYCFlow — state machine validation.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import KYCSubmission
from .state_machine import transition, InvalidTransitionError

User = get_user_model()


class TestInvalidStateTransition(TestCase):
    def setUp(self):
        self.merchant = User.objects.create_user(
            username='test_merchant', password='pass1234', role='merchant'
        )
        self.reviewer = User.objects.create_user(
            username='test_reviewer', password='pass1234', role='reviewer'
        )

    def test_direct_draft_to_approved_fails(self):
        """draft → approved is not an allowed transition."""
        submission = KYCSubmission.objects.create(
            merchant=self.merchant, status='draft'
        )
        with self.assertRaises(InvalidTransitionError):
            transition(submission, 'approved', actor=self.reviewer)

    def test_valid_transitions_succeed(self):
        """Test the full happy path: draft → submitted → under_review → approved."""
        submission = KYCSubmission.objects.create(
            merchant=self.merchant, status='draft'
        )
        submission = transition(submission, 'submitted', actor=self.merchant)
        self.assertEqual(submission.status, 'submitted')

        submission = transition(submission, 'under_review', actor=self.reviewer)
        self.assertEqual(submission.status, 'under_review')

        submission = transition(submission, 'approved', actor=self.reviewer)
        self.assertEqual(submission.status, 'approved')

    def test_terminal_state_cannot_transition(self):
        """Approved submissions cannot be transitioned further."""
        submission = KYCSubmission.objects.create(
            merchant=self.merchant, status='approved'
        )
        with self.assertRaises(InvalidTransitionError):
            transition(submission, 'rejected', actor=self.reviewer)

    def test_rejected_requires_reason(self):
        """Rejected submissions should at least have a reason when going through the API."""
        submission = KYCSubmission.objects.create(
            merchant=self.merchant, status='under_review'
        )
        # The state machine itself allows it, but checks reason param is captured
        submission = transition(submission, 'rejected', actor=self.reviewer, reason='Fake documents detected')
        self.assertEqual(submission.status, 'rejected')
        self.assertEqual(submission.rejection_reason, 'Fake documents detected')

    def test_more_info_to_submitted_succeeds(self):
        """more_info_requested → submitted is a valid re-submission."""
        submission = KYCSubmission.objects.create(
            merchant=self.merchant, status='more_info_requested'
        )
        submission = transition(submission, 'submitted', actor=self.merchant)
        self.assertEqual(submission.status, 'submitted')
