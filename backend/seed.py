"""
Seed script — creates:
  - 2 merchants (one with draft KYC, one with under_review KYC)
  - 1 reviewer

Usage:
    cd backend
    python seed.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kycflow.settings')
django.setup()

from django.contrib.auth import get_user_model
from kyc.models import KYCSubmission
from kyc.state_machine import transition

User = get_user_model()


def seed():
    print("🌱 Seeding database...")

    # ── Reviewer ──────────────────────────────────────────────────────────────
    reviewer, created = User.objects.get_or_create(
        username='reviewer1',
        defaults={
            'email': 'reviewer1@kycflow.com',
            'role': 'reviewer',
            'first_name': 'Alice',
            'last_name': 'Reviewer',
        }
    )
    if created:
        reviewer.set_password('reviewer123')
        reviewer.save()
        print(f"  ✅ Created reviewer: {reviewer.username}")
    else:
        print(f"  ⚠️  Reviewer already exists: {reviewer.username}")

    # ── Merchant 1: draft KYC ─────────────────────────────────────────────────
    merchant1, created = User.objects.get_or_create(
        username='merchant_draft',
        defaults={
            'email': 'merchant_draft@kycflow.com',
            'role': 'merchant',
            'first_name': 'Bob',
            'last_name': 'Draft',
        }
    )
    if created:
        merchant1.set_password('merchant123')
        merchant1.save()
        print(f"  ✅ Created merchant: {merchant1.username}")
    else:
        print(f"  ⚠️  Merchant already exists: {merchant1.username}")

    sub1, created = KYCSubmission.objects.get_or_create(
        merchant=merchant1,
        defaults={
            'full_name': 'Bob Draft',
            'date_of_birth': '1990-05-15',
            'address': '123 Draft Street, Mumbai',
            'phone': '9876543210',
            'email': 'bob@example.com',
            'business_name': 'Draft Enterprises',
            'business_type': 'Sole Proprietorship',
            'registration_number': 'DRAFT001',
            'business_address': '123 Draft Street, Mumbai',
            'annual_turnover': '500000',
            'status': 'draft',
        }
    )
    if created:
        print(f"  ✅ Created draft KYC #{sub1.pk} for {merchant1.username}")
    else:
        print(f"  ⚠️  KYC already exists for {merchant1.username}")

    # ── Merchant 2: under_review KYC ─────────────────────────────────────────
    merchant2, created = User.objects.get_or_create(
        username='merchant_review',
        defaults={
            'email': 'merchant_review@kycflow.com',
            'role': 'merchant',
            'first_name': 'Carol',
            'last_name': 'Review',
        }
    )
    if created:
        merchant2.set_password('merchant123')
        merchant2.save()
        print(f"  ✅ Created merchant: {merchant2.username}")
    else:
        print(f"  ⚠️  Merchant already exists: {merchant2.username}")

    sub2, created = KYCSubmission.objects.get_or_create(
        merchant=merchant2,
        defaults={
            'full_name': 'Carol Review',
            'date_of_birth': '1985-11-22',
            'address': '456 Review Avenue, Delhi',
            'phone': '9123456780',
            'email': 'carol@example.com',
            'business_name': 'Review Corp',
            'business_type': 'Private Limited',
            'registration_number': 'REVIEW002',
            'business_address': '456 Review Avenue, Delhi',
            'annual_turnover': '2000000',
            'status': 'draft',
        }
    )
    if created:
        # Transition: draft → submitted → under_review
        try:
            sub2 = transition(sub2, 'submitted', actor=merchant2)
            sub2 = transition(sub2, 'under_review', actor=reviewer)
            print(f"  ✅ Created under_review KYC #{sub2.pk} for {merchant2.username}")
        except Exception as e:
            print(f"  ❌ Could not transition KYC: {e}")
    else:
        print(f"  ⚠️  KYC already exists for {merchant2.username}")

    print("\n✅ Seeding complete!")
    print("\nCredentials:")
    print("  reviewer1      / reviewer123  (role: reviewer)")
    print("  merchant_draft / merchant123  (role: merchant, status: draft)")
    print("  merchant_review/ merchant123  (role: merchant, status: under_review)")


if __name__ == '__main__':
    seed()
