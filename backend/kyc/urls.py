"""
URL configuration for the kyc app.
All routes are under /api/v1/
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/signup/', views.SignupView.as_view(), name='signup'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.UserProfileView.as_view(), name='user-profile'),

    # ── Merchant ───────────────────────────────────────────────────────────────
    # View/edit own submission (creates draft if none exists)
    path('submissions/me/', views.MerchantSubmissionView.as_view(), name='my-submission'),
    # Submit the KYC (draft → submitted)
    path('submissions/<int:submission_id>/submit/', views.SubmitKYCView.as_view(), name='submit-kyc'),
    # Upload/list documents for a submission
    path('submissions/<int:submission_id>/documents/', views.DocumentUploadView.as_view(), name='documents'),
    # Merchant notifications
    path('notifications/', views.MerchantNotificationsView.as_view(), name='notifications'),

    # ── Reviewer ───────────────────────────────────────────────────────────────
    path('reviewer/queue/', views.ReviewerQueueView.as_view(), name='reviewer-queue'),
    path('reviewer/queue/<int:submission_id>/', views.ReviewerSubmissionDetailView.as_view(), name='reviewer-detail'),
    path('reviewer/queue/<int:submission_id>/action/', views.ReviewActionView.as_view(), name='reviewer-action'),
    path('reviewer/metrics/', views.ReviewerMetricsView.as_view(), name='reviewer-metrics'),
]
