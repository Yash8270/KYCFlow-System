from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, KYCSubmission, Document, Notification


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'is_staff', 'date_joined']
    list_filter = ['role', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('KYC Role', {'fields': ('role',)}),
    )


@admin.register(KYCSubmission)
class KYCSubmissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'merchant', 'status', 'business_name', 'full_name', 'created_at', 'updated_at']
    list_filter = ['status']
    search_fields = ['merchant__username', 'business_name', 'full_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['created_at']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['id', 'submission', 'doc_type', 'uploaded_at']
    list_filter = ['doc_type']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'merchant', 'event_type', 'timestamp']
    list_filter = ['event_type']
    ordering = ['-timestamp']
