# KYCFlow — Merchant Onboarding & KYC System

KYCFlow is a high-performance, full-stack KYC (Know Your Customer) onboarding pipeline built for the **Playto Founding Engineering Intern Challenge**. It enables merchants to submit multi-step compliance data and allows reviewers to manage, audit, and provide feedback on submissions via a centralized queue with automated SLA tracking.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend (Django REST Framework)
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Migrations
python manage.py makemigrations kyc
python manage.py migrate
# Seed data (Creates 2 merchants + 1 reviewer)
python manage.py run_seed
# Run server
python manage.py runserver
```

### 3. Frontend (React + Tailwind CSS)
```bash
cd frontend
npm install
npm start
```
The app will be available at `http://localhost:3000`.

---

## 🧪 Test Credentials (Seed Data)

| Role | Username | Password | Context |
| :--- | :--- | :--- | :--- |
| **Admin/Superuser** | `admin` | `admin1234` | Full DB access |
| **Reviewer** | `reviewer1` | `reviewer123` | Queue & metrics access |
| **Merchant (Draft)** | `merchant_draft` | `merchant123` | Can edit/save KYC |
| **Merchant (Under Review)** | `merchant_review` | `merchant123` | Restricted access |

---

## 🏗️ Core Features

- **🔄 Centralized State Machine**: Atomic transitions between `draft`, `submitted`, `under_review`, `approved`, and `rejected`.
- **📊 Reviewer Analytics**: Real-time metrics for queue depth, approval rates, and dynamic SLA (at-risk) flagging for 24h+ delays.
- **📄 Secure Document Management**: PDF/JPG validation with atomic file replacement to prevent data clutter.
- **💬 Clarification Flow**: Built-in "More Info Requested" loop allowing reviewers to request specific fixes and merchants to respond with text and files.
- **🔐 Role-Based Security**: Isolated data views ensuring merchants can only see their own submissions.

---

## 🛠️ Tech Stack

- **Backend**: Django, DRF, SQLite (Atomic Transactions)
- **Frontend**: React, Tailwind CSS, Heroicons, Axios
- **Auth**: JWT (SimpleJWT) with local storage persistence.

---

## 📘 Documentation
- [EXPLAINER.md](EXPLAINER.md): Detailed logic, state machine code, and AI audit results.
