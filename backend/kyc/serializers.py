"""
Serializers for KYCFlow API.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import KYCSubmission, Document, Notification
from .validators import validate_document_file

User = get_user_model()


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=['merchant', 'reviewer'])

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'first_name', 'last_name']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name']


# ── Documents ─────────────────────────────────────────────────────────────────

class DocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField()

    class Meta:
        model = Document
        fields = ['id', 'doc_type', 'file', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def validate_file(self, value):
        validate_document_file(value)
        return value


# ── KYC Submission ────────────────────────────────────────────────────────────

class KYCSubmissionSerializer(serializers.ModelSerializer):
    """Full read serializer — includes nested documents and merchant info."""
    documents = DocumentSerializer(many=True, read_only=True)
    merchant = UserSerializer(read_only=True)
    is_at_risk = serializers.SerializerMethodField()

    class Meta:
        model = KYCSubmission
        fields = [
            'id', 'merchant',
            # Personal
            'full_name', 'date_of_birth', 'address', 'phone', 'email',
            # Business
            'business_name', 'business_type', 'registration_number',
            'business_address', 'annual_turnover',
            # State
            'status', 'rejection_reason', 'clarification_response',
            # Meta
            'created_at', 'updated_at', 'is_at_risk',
            # Nested
            'documents',
        ]
        read_only_fields = ['id', 'merchant', 'status', 'rejection_reason', 'created_at', 'updated_at']

    def get_is_at_risk(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        if obj.status in ('submitted', 'under_review'):
            return (timezone.now() - obj.updated_at) > timedelta(hours=24)
        return False


class KYCSubmissionWriteSerializer(serializers.ModelSerializer):
    """Write serializer for creating/updating a KYC draft."""

    # Explicitly declare date_of_birth to accept null and empty strings
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = KYCSubmission
        fields = [
            'full_name', 'date_of_birth', 'address', 'phone', 'email',
            'business_name', 'business_type', 'registration_number',
            'business_address', 'annual_turnover', 'clarification_response',
        ]

    def validate_date_of_birth(self, value):
        if value:
            from django.utils import timezone
            from datetime import date
            today = date.today()
            age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
            if age < 18:
                raise serializers.ValidationError("Merchant must be at least 18 years old.")
        return value

    def validate_registration_number(self, value):
        if value:
            import re
            # GSTIN Format: 2 digits, 10 alphanumeric, 1 digit, 1 char, 1 digit (Total 15)
            gstin_regex = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            # If standard GSTIN is too strict for the user's test data, we can relax it to 15 alphanumeric
            # But let's try a robust one first or a simpler 15-char one.
            # User said "GSTIN number like it should be a number or string like that"
            if not re.match(r'^[0-9A-Z]{15}$', value.upper()):
                raise serializers.ValidationError("Registration number must be a valid 15-character alphanumeric GSTIN.")
        return value.upper() if value else value

    def validate_annual_turnover(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Annual turnover cannot be negative.")
        return value

    def validate(self, data):
        # Convert empty string date_of_birth to None so DateField doesn't reject it
        if data.get('date_of_birth') == '':
            data['date_of_birth'] = None
        return data


# ── Reviewer Actions ──────────────────────────────────────────────────────────

class ReviewActionSerializer(serializers.Serializer):
    ACTION_CHOICES = ['approve', 'reject', 'request_more_info']
    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['action'] in ('reject', 'request_more_info') and not data.get('reason'):
            action_name = "rejecting" if data['action'] == 'reject' else "requesting more information"
            raise serializers.ValidationError(
                {'reason': f'A reason is required when {action_name}.'}
            )
        return data


# ── Notifications ────────────────────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'event_type', 'timestamp', 'payload']
