"""
Custom permission classes for KYCFlow API.
"""
from rest_framework.permissions import BasePermission


class IsMerchant(BasePermission):
    """Allow access only to authenticated users with role='merchant'."""
    message = "Access restricted to merchants only."

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'merchant'
        )


class IsReviewer(BasePermission):
    """Allow access only to authenticated users with role='reviewer'."""
    message = "Access restricted to reviewers only."

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'reviewer'
        )
