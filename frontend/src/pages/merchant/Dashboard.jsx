import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['Personal Details', 'Business Details', 'Documents', 'Review & Submit'];

const STATUS_COLORS = {
    draft: 'bg-gray-700 text-gray-300',
    submitted: 'bg-blue-900/50 text-blue-300',
    under_review: 'bg-yellow-900/50 text-yellow-300',
    approved: 'bg-green-900/50 text-green-300',
    rejected: 'bg-red-900/50 text-red-300',
    more_info_requested: 'bg-orange-900/50 text-orange-300',
};

export default function MerchantDashboard() {
    const { user, logout } = useAuth();
    const [submission, setSubmission] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '', date_of_birth: '', address: '', phone: '', email: '',
        business_name: '', business_type: '', registration_number: '',
        business_address: '', annual_turnover: '', clarification_response: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [subRes, notifRes] = await Promise.all([
                API.get('/submissions/me/'),
                API.get('/notifications/'),
            ]);
            const sub = subRes.data;
            setSubmission(sub);
            setFormData({
                full_name: sub.full_name || '',
                date_of_birth: sub.date_of_birth || '',
                address: sub.address || '',
                phone: sub.phone || '',
                email: sub.email || '',
                business_name: sub.business_name || '',
                business_type: sub.business_type || '',
                registration_number: sub.registration_number || '',
                business_address: sub.business_address || '',
                annual_turnover: sub.annual_turnover || '',
                clarification_response: sub.clarification_response || '',
            });
            setNotifications(notifRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveDraft = async () => {
        setSaving(true);
        setMessage('');
        try {
            await API.patch('/submissions/me/', formData);
            await fetchData();
            setMessage('✅ Draft saved successfully!');
        } catch (err) {
            setMessage('❌ Failed to save: ' + (err.response?.data?.detail || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const handleDocumentUpload = async (docType, file) => {
        if (!file) return;
        setUploading(true);
        setMessage('');
        const data = new FormData();
        data.append('doc_type', docType);
        data.append('file', file);
        try {
            await API.post(`/submissions/${submission.id}/documents/`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchData();
            setMessage(`✅ ${docType.toUpperCase()} uploaded!`);
        } catch (err) {
            const errData = err.response?.data;
            setMessage('❌ Upload failed: ' + (errData?.file?.[0] || errData?.detail || 'File too large or invalid type'));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setMessage('');
        try {
            await API.patch('/submissions/me/', formData);
            await API.post(`/submissions/${submission.id}/submit/`);
            await fetchData();
            setMessage('✅ KYC submitted successfully!');
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.detail || 'Submission failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const canEdit = submission?.status === 'draft' || submission?.status === 'more_info_requested';


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <span className="font-bold text-white text-lg">KYCFlow</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">👤 {user?.username}</span>
                        <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition">Logout</button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: KYC Status */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Status Card */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">KYC Status</h2>
                            {submission && (
                                <>
                                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize mb-3 ${STATUS_COLORS[submission.status] || 'bg-gray-700 text-gray-300'}`}>
                                        {submission.status?.replace(/_/g, ' ')}
                                    </div>

                                    {(submission.status === 'rejected' || submission.status === 'approved') && (
                                        <div className="mb-4">
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm('This will start a fresh KYC application. Continue?')) {
                                                        setLoading(true);
                                                        try {
                                                            const res = await API.post('/submissions/me/');
                                                            const newSub = res.data;
                                                            setSubmission(newSub);
                                                            setFormData({
                                                                full_name: '', date_of_birth: '', address: '', phone: '', email: '',
                                                                business_name: '', business_type: '', registration_number: '',
                                                                business_address: '', annual_turnover: '', clarification_response: '',
                                                            });
                                                            setStep(0);
                                                            setMessage('✅ Fresh application started. Please fill details.');
                                                            setLoading(false);
                                                        } catch (err) {
                                                            setMessage('❌ Failed to start new application');
                                                            setLoading(false);
                                                        }
                                                    }
                                                }}
                                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-900/20"
                                            >
                                                Start New Application
                                            </button>
                                        </div>
                                    )}

                                    {submission.is_at_risk && (
                                        <div className="mt-2 flex items-center gap-2 text-orange-400 text-xs mb-3">
                                            <span>⚠️</span> <span>At risk — in queue &gt; 24h</span>
                                        </div>
                                    )}

                                    {['rejected', 'more_info_requested'].includes(submission?.status) && submission?.rejection_reason && (
                                        <div className={`mt-3 p-3 rounded-lg border ${submission.status === 'more_info_requested' ? 'bg-orange-900/20 border-orange-800' : 'bg-red-900/20 border-red-800'}`}>
                                            <p className={`text-xs font-semibold mb-1 ${submission.status === 'more_info_requested' ? 'text-orange-300' : 'text-red-300'}`}>
                                                {submission.status === 'more_info_requested' ? '📋 Reviewer Note (Action Required):' : '❌ Rejection Reason:'}
                                            </p>
                                            <p className={`text-sm ${submission.status === 'more_info_requested' ? 'text-orange-200' : 'text-red-200'}`}>
                                                {submission.rejection_reason}
                                            </p>
                                        </div>
                                    )}
                                    <div className="mt-3 text-xs text-gray-500">
                                        Submission #{submission.id} · Updated {new Date(submission.updated_at).toLocaleDateString()}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Documents */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Documents</h2>
                            <div className="space-y-2">
                                {['pan', 'aadhaar', 'bank_statement'].map(docType => {
                                    const uploaded = submission?.documents?.find(d => d.doc_type === docType);
                                    return (
                                        <div key={docType} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${uploaded ? 'bg-green-400' : 'bg-gray-600'}`} />
                                                <span className="text-sm text-gray-300 capitalize">{docType.replace(/_/g, ' ').toUpperCase()}</span>
                                            </div>
                                            {canEdit ? (
                                                <label className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 transition">
                                                    {uploaded ? 'Replace' : 'Upload'}
                                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                                        onChange={e => handleDocumentUpload(docType, e.target.files[0])} />
                                                </label>
                                            ) : (
                                                <span className="text-xs text-gray-500">{uploaded ? '✓' : '—'}</span>
                                            )}
                                        </div>
                                    );
                                })}

                                {submission?.documents?.find(d => d.doc_type === 'additional_info') && (
                                    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-400" />
                                            <span className="text-sm text-gray-300 font-semibold text-blue-400">ADDITIONAL INFO</span>
                                        </div>
                                        {canEdit && (
                                            <label className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 transition">
                                                Replace
                                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                                    onChange={e => handleDocumentUpload('additional_info', e.target.files[0])} />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                            {uploading && <p className="text-xs text-blue-400 mt-2">Uploading...</p>}
                        </div>

                        {/* Notifications */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Notifications</h2>
                            {notifications.length === 0 ? (
                                <p className="text-gray-500 text-sm">No notifications yet</p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {notifications.map(n => (
                                        <div key={n.id} className="py-2 border-b border-gray-800 last:border-0">
                                            <p className="text-xs font-medium text-blue-400">{n.event_type.replace(/_/g, ' ')}</p>
                                            <p className="text-xs text-gray-500">{new Date(n.timestamp).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: KYC Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            {/* Step Navigation */}
                            <div className="border-b border-gray-800 p-5">
                                <div className="flex gap-1">
                                    {STEPS.map((s, i) => (
                                        <button key={i} onClick={() => setStep(i)}
                                            className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg transition-all ${i === step ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                                                }`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Message */}
                                {message && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>
                                        {message}
                                    </div>
                                )}

                                {/* Clarification UI */}
                                {submission?.status === 'more_info_requested' && (
                                    <div className="mb-8 p-6 bg-blue-900/10 border border-blue-800/50 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-white">Provide Clarification</h3>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                            The reviewer has requested additional information. Please provide your response below and upload any supporting documents if needed.
                                        </p>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-2">Reviewer's Note</label>
                                                <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl text-sm italic text-gray-400">
                                                    "{submission.rejection_reason || 'Please provide missing details.'}"
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-2">Your Response</label>
                                                <textarea
                                                    value={formData.clarification_response}
                                                    onChange={e => setFormData({ ...formData, clarification_response: e.target.value })}
                                                    placeholder="Explain the changes you made or provide more context..."
                                                    rows={4}
                                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm resize-none"
                                                />
                                            </div>

                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-dashed border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-white">Additional Document</h4>
                                                        <p className="text-xs text-gray-400 mt-0.5">Supporting PDF/Image (Optional)</p>
                                                    </div>
                                                    <label className="cursor-pointer">
                                                        <span className="inline-block px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-blue-900/20">
                                                            {submission?.documents?.find(d => d.doc_type === 'additional_info') ? 'Replace File' : 'Upload File'}
                                                        </span>
                                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                                            onChange={e => handleDocumentUpload('additional_info', e.target.files[0])} />
                                                    </label>
                                                </div>
                                                {submission?.documents?.find(d => d.doc_type === 'additional_info') && (
                                                    <div className="mt-3 flex items-center gap-2 text-xs text-green-400 font-medium">
                                                        <span>✓</span> <span>Additional file uploaded successfully</span>
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-500 italic">
                                                💡 If you were asked to correct an existing document (like PAN), please use the "Replace" buttons in the Documents section on the left.
                                            </p>

                                            <button
                                                onClick={handleSubmit}
                                                disabled={submitting || !formData.clarification_response}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-blue-900/20 mt-2"
                                            >
                                                {submitting ? 'Submitting Updates...' : 'Submit Final Updates'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 0: Personal */}
                                {step === 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-white mb-2">Personal Information</h3>
                                        {[
                                            { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Your full legal name' },
                                            { label: 'Date of Birth', key: 'date_of_birth', type: 'date' },
                                            { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
                                            { label: 'Email Address', key: 'email', type: 'email', placeholder: 'you@example.com' },
                                        ].map(f => (
                                            <div key={f.key}>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">{f.label}</label>
                                                <input type={f.type} value={formData[f.key]} disabled={!canEdit}
                                                    onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder={f.placeholder} />
                                            </div>
                                        ))}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                                            <textarea value={formData.address} disabled={!canEdit}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                rows={3}
                                                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm disabled:opacity-50 resize-none"
                                                placeholder="Your residential address" />
                                        </div>
                                    </div>
                                )}

                                {/* Step 1: Business */}
                                {step === 1 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-white mb-2">Business Information</h3>
                                        {[
                                            { label: 'Business Name', key: 'business_name', type: 'text', placeholder: 'Acme Corp' },
                                            { label: 'Business Type', key: 'business_type', type: 'text', placeholder: 'e.g. Sole Proprietorship' },
                                            { label: 'GSTIN / Registration Number', key: 'registration_number', type: 'text', placeholder: '15-digit GSTIN (e.g. 22AAAAA0000A1Z5)' },
                                            { label: 'Annual Turnover (₹)', key: 'annual_turnover', type: 'number', placeholder: 'e.g. 5000000' },
                                        ].map(f => (
                                            <div key={f.key}>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">{f.label}</label>
                                                <input type={f.type} value={formData[f.key]} disabled={!canEdit}
                                                    onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder={f.placeholder} />
                                            </div>
                                        ))}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Business Address</label>
                                            <textarea value={formData.business_address} disabled={!canEdit}
                                                onChange={e => setFormData({ ...formData, business_address: e.target.value })}
                                                rows={3}
                                                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm disabled:opacity-50 resize-none"
                                                placeholder="Registered business address" />
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Documents */}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-white mb-2">Document Upload</h3>
                                        <p className="text-sm text-gray-400 mb-4">Allowed formats: PDF, JPG, PNG · Max size: 5 MB</p>
                                        {[
                                            { key: 'pan', label: 'PAN Card', desc: 'Government issued PAN card' },
                                            { key: 'aadhaar', label: 'Aadhaar Card', desc: '12-digit Aadhaar card' },
                                            { key: 'bank_statement', label: 'Bank Statement', desc: 'Last 3 months bank statement' },
                                        ].map(doc => {
                                            const uploaded = submission?.documents?.find(d => d.doc_type === doc.key);
                                            return (
                                                <div key={doc.key} className={`border rounded-xl p-4 transition-all ${uploaded ? 'border-green-700 bg-green-900/10' : 'border-gray-700 bg-gray-800/50'}`}>
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-white">{doc.label}</h4>
                                                            <p className="text-xs text-gray-400 mt-0.5">{doc.desc}</p>
                                                            {uploaded && (
                                                                <p className="text-xs text-green-400 mt-1">✓ Uploaded</p>
                                                            )}
                                                        </div>
                                                        {canEdit && (
                                                            <label className="cursor-pointer">
                                                                <span className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition">
                                                                    {uploaded ? 'Replace' : 'Upload'}
                                                                </span>
                                                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                                                    onChange={e => handleDocumentUpload(doc.key, e.target.files[0])} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Step 3: Review & Submit */}
                                {step === 3 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-white mb-2">Review & Submit</h3>
                                        <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                                            <p className="text-gray-400">Submission ID: <span className="text-white">#{submission?.id}</span></p>
                                            <p className="text-gray-400">Status: <span className={`font-semibold capitalize ${submission?.status === 'draft' ? 'text-gray-300' : 'text-blue-300'}`}>{submission?.status?.replace(/_/g, ' ')}</span></p>
                                            <p className="text-gray-400">Full Name: <span className="text-white">{formData.full_name || '—'}</span></p>
                                            <p className="text-gray-400">Business: <span className="text-white">{formData.business_name || '—'}</span></p>
                                            <p className="text-gray-400">Documents: <span className="text-white">{submission?.documents?.length || 0}/3 uploaded</span></p>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            {canEdit && submission?.status !== 'more_info_requested' && (
                                                <>
                                                    <button onClick={saveDraft} disabled={saving}
                                                        className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
                                                        {saving ? 'Saving...' : 'Save Draft'}
                                                    </button>
                                                    <button onClick={handleSubmit} disabled={submitting}
                                                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-900/30">
                                                        {submitting ? 'Submitting...' : 'Submit KYC'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Navigation buttons */}
                                {step < 3 && submission?.status !== 'more_info_requested' && (
                                    <div className="flex justify-between mt-6 pt-4 border-t border-gray-800">
                                        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition disabled:opacity-30">
                                            ← Previous
                                        </button>
                                        <div className="flex gap-3">
                                            {canEdit && (
                                                <button onClick={saveDraft} disabled={saving}
                                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl transition disabled:opacity-50">
                                                    {saving ? 'Saving...' : 'Save Draft'}
                                                </button>
                                            )}
                                            <button onClick={() => setStep(s => Math.min(3, s + 1))}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition">
                                                Next →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
