from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('merchant', 'Merchant'),
        ('reviewer', 'Reviewer'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='merchant')

    def __str__(self):
        return f"{self.username} ({self.role})"


class KYCSubmission(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('more_info_requested', 'More Info Requested'),
    ]

    merchant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='submissions', limit_choices_to={'role': 'merchant'}
    )

    # Personal details
    full_name = models.CharField(max_length=255, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    # Business details
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(max_length=100, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    business_address = models.TextField(blank=True)
    annual_turnover = models.CharField(max_length=100, blank=True)

    # State
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    rejection_reason = models.TextField(blank=True)
    clarification_response = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"KYC #{self.pk} - {self.merchant.username} [{self.status}]"


class Document(models.Model):
    DOC_TYPE_CHOICES = [
        ('pan', 'PAN Card'),
        ('aadhaar', 'Aadhaar Card'),
        ('bank_statement', 'Bank Statement'),
        ('additional_info', 'Additional Information'),
    ]

    submission = models.ForeignKey(
        KYCSubmission, on_delete=models.CASCADE, related_name='documents'
    )
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    file = models.FileField(upload_to='kyc_documents/%Y/%m/%d/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.doc_type} for KYC #{self.submission_id}"


class Notification(models.Model):
    merchant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications', limit_choices_to={'role': 'merchant'}
    )
    event_type = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)
    payload = models.JSONField(default=dict)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Notification [{self.event_type}] for {self.merchant.username}"
