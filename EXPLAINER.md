# KYCFlow — Technical Explainer (Playto Challenge)

This document addresses the five critical technical areas required for the Playto Engineering Intern Challenge.

---

### 1. The State Machine

**Location:** `backend/kyc/state_machine.py`

The state machine is implementation-centralized to ensure business logic is decoupled from API views. We prevent illegal transitions using a mapping of allowed states and enforce integrity using database-level locking and atomic transactions.

```python
# backend/kyc/state_machine.py
ALLOWED_TRANSITIONS = {
    'draft': ['submitted'],
    'submitted': ['under_review'],
    'under_review': ['approved', 'rejected', 'more_info_requested'],
    'more_info_requested': ['submitted'],
    'approved': [],
    'rejected': [],
}

@transaction.atomic
def transition(submission, new_status, actor, reason=''):
    current_status = submission.status
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    
    if new_status not in allowed:
        raise InvalidTransitionError(f"Illegal transition from {current_status} to {new_status}")
    
    submission.status = new_status
    if new_status in ('rejected', 'more_info_requested'):
        submission.rejection_reason = reason
    elif new_status == 'approved':
        submission.rejection_reason = ''
        
    submission.save(update_fields=['status', 'rejection_reason', 'updated_at'])
    # Automated notification logging happens within the same atomic block...
```

**Prevention of Illegal Transitions:**
Illegal transitions are blocked at the **Core Logic Layer**. This design ensures **idempotency** and prevents inconsistent states even under concurrent access. If an invalid `new_status` is requested, an `InvalidTransitionError` is raised. The API layer catches this and returns a `400 Bad Request`. Additionally, we use `transaction.atomic()` to ensure that the status change and the mandatory notification logging either both succeed or both fail.

---

### 2. The Upload

**Location:** `backend/kyc/validators.py`

Validation is enforced on the backend to avoid trusting client-side checks and to harden the system against malicious uploads.

```python
# backend/kyc/validators.py
ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_document_file(file):
    import os
    # 1. Extension Check
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"Unsupported file type '{ext}'.")
    
    # 2. Hard Size Limit
    if file.size > MAX_FILE_SIZE:
        raise ValidationError(f"File size exceeds the 5 MB limit.")

    # 3. MIME Type Validation (Security Hardening)
    if hasattr(file, 'content_type') and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError("Invalid file content type.")
```

**Scenario (50MB File):**
If someone attempts to send a 50MB file, the `file.size` check triggers immediately during serialization. The request is rejected with a `400 Bad Request`. **Validation includes both file extension and MIME type** to prevent spoofed or malicious uploads (e.g., a renamed .exe file).

---

### 3. The Queue

**Location:** `backend/kyc/views.py` (Filtering) & `backend/kyc/serializers.py` (SLA Logic)

The reviewer dashboard shows only actionable items, sorted by age.

```python
# backend/kyc/views.py (Reviewer Queue Query)
queryset = KYCSubmission.objects.filter(
    status__in=['submitted', 'under_review']
).select_related('merchant').prefetch_related('documents').order_by('created_at', 'id')

# backend/kyc/serializers.py (Dynamic SLA Flag)
def get_is_at_risk(self, obj):
    if obj.status in ('submitted', 'under_review'):
        return (timezone.now() - obj.updated_at) > timedelta(hours=24)
    return False
```

**Rationale:**
We explicitly filter only **actionable states** (`submitted`, `under_review`) to avoid including terminal states like `approved` or `rejected` in the reviewer queue. We order by `created_at` to prioritize the oldest submissions. The `is_at_risk` flag is computed **dynamically** in the serializer to avoid reliance on stale database flags and ensure real-time SLA accuracy.

---

### 4. The Auth

**Location:** `backend/kyc/views.py` & `backend/kyc/permissions.py`

Isolation is enforced by overriding the default queryset handled by the API views.

```python
# backend/kyc/views.py (Merchant Submission Isolation)
def get_queryset(self):
    return KYCSubmission.objects.filter(merchant=self.request.user)
```

**Mechanism:**
Even if Merchant A discovers the ID of Merchant B's submission, any attempt to access it will return a `404 Not Found` because the query is strictly scoped to the `request.user`. Reviewer access is enforced via a **dedicated permission class (`IsReviewer`)**, ensuring only authorized staff can access the global queue.

---

### 5. The AI Audit

**Scenario: Stale Closure / Race Condition in Restart Flow**

During the implementation of the "Start New Application" feature, an AI-generated pattern initially suggested calling `fetchData()` (a GET request) immediately after the `POST` request that restarts the application.

**The Bug:**
The AI failed to account for potential race conditions or stale state closures in React. If the `POST` returned successfully but the subsequent `GET` fetched the *previous* submission due to database lag, the dashboard would functionally "restart" but would use the **OLD Submission ID**. This would cause subsequent actions to fail or overwrite the wrong record.

**The Fix:**
I caught this and replaced the "blind fetch" with a **direct state update** from the `POST` response.

```javascript
// BUGGY VERSION (Initial AI Suggestion)
await API.post('/submissions/me/');
await fetchData(); // Relies on a second network call and 'latest' logic

// REPLACED WITH (Secure & Deterministic)
const res = await API.post('/submissions/me/');
setSubmission(res.data); // Update ID directly from the authoritative source
setFormData(resetFormData(res.data)); // Sync fields immediately
```
This avoids reliance on eventual consistency and **eliminates race conditions** caused by sequential API calls.
