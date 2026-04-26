import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../../api/axios';

const STATUS_COLORS = {
    draft: 'bg-gray-700 text-gray-300',
    submitted: 'bg-blue-900/50 text-blue-300',
    under_review: 'bg-yellow-900/50 text-yellow-300',
    approved: 'bg-green-900/50 text-green-300',
    rejected: 'bg-red-900/50 text-red-300',
    more_info_requested: 'bg-orange-900/50 text-orange-300',
};

export default function SubmissionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');
    const [selectedAction, setSelectedAction] = useState('');

    useEffect(() => {
        fetchSubmission();
    }, [id]);

    const fetchSubmission = async () => {
        try {
            const res = await API.get(`/reviewer/queue/${id}/`);
            setSubmission(res.data);
        } catch (err) {
            console.error('Failed to fetch submission:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedAction) return;
        if (['reject', 'request_more_info'].includes(selectedAction) && !reason.trim()) {
            setMessage(`❌ Please provide a ${selectedAction === 'reject' ? 'rejection reason' : 'note for the merchant'}.`);
            return;
        }
        setActionLoading(true);
        setMessage('');
        try {
            await API.post(`/reviewer/queue/${id}/action/`, {
                action: selectedAction,
                reason: reason,
            });
            setMessage('✅ Action applied successfully!');
            await fetchSubmission();
            setSelectedAction('');
            setReason('');
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.detail || 'Action failed'));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
                Submission not found.
            </div>
        );
    }

    const canAct = ['submitted', 'under_review'].includes(submission.status);

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link to="/reviewer/queue" className="text-gray-400 hover:text-white transition text-sm">← Back</Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <span className="font-bold text-white">KYC #{submission.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[submission.status] || ''}`}>
                            {submission.status?.replace(/_/g, ' ')}
                        </span>
                        {submission.is_at_risk && (
                            <span className="px-2 py-0.5 bg-orange-900/40 border border-orange-700 rounded-full text-xs text-orange-300">⚠ At Risk</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Details */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Personal */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Personal Details</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {[
                                    ['Full Name', submission.full_name],
                                    ['Date of Birth', submission.date_of_birth],
                                    ['Phone', submission.phone],
                                    ['Email', submission.email],
                                    ['Address', submission.address],
                                ].map(([label, value]) => (
                                    <div key={label} className={label === 'Address' ? 'col-span-2' : ''}>
                                        <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                                        <p className="text-white">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Business */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Business Details</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {[
                                    ['Business Name', submission.business_name],
                                    ['Business Type', submission.business_type],
                                    ['Registration #', submission.registration_number],
                                    ['Annual Turnover', submission.annual_turnover ? `₹${Number(submission.annual_turnover).toLocaleString('en-IN')}` : '—'],
                                    ['Business Address', submission.business_address],
                                ].map(([label, value]) => (
                                    <div key={label} className={label === 'Business Address' ? 'col-span-2' : ''}>
                                        <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                                        <p className="text-white">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                                Documents ({submission.documents?.filter(d => d.doc_type !== 'additional_info').length || 0})
                            </h2>
                            {submission.documents?.filter(d => d.doc_type !== 'additional_info').length === 0 ? (
                                <p className="text-gray-500 text-sm">No primary documents uploaded</p>
                            ) : (
                                <div className="space-y-2">
                                    {submission.documents?.filter(d => d.doc_type !== 'additional_info').map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-900/50 rounded-lg flex items-center justify-center text-blue-400 text-sm">
                                                    📄
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white capitalize">{doc.doc_type.replace(/_/g, ' ').toUpperCase()}</p>
                                                    <p className="text-xs text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <a href={`http://localhost:8000${doc.file}`} target="_blank" rel="noreferrer"
                                                className="text-xs text-blue-400 hover:text-blue-300 transition">View ↗</a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Additional Information Block */}
                        {(submission.clarification_response || submission.documents?.some(d => d.doc_type === 'additional_info')) && (
                            <div className="bg-blue-900/10 border border-blue-800/50 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                        ℹ️
                                    </div>
                                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Additional Information (Clarification)</h2>
                                </div>
                                <div className="space-y-4">
                                    {submission.clarification_response && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Merchant's Response:</p>
                                            <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-300">
                                                {submission.clarification_response}
                                            </div>
                                        </div>
                                    )}
                                    {submission.documents?.find(d => d.doc_type === 'additional_info') && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-2">Supporting Document:</p>
                                            {submission.documents.filter(d => d.doc_type === 'additional_info').map(doc => (
                                                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                                            DOC
                                                        </div>
                                                        <p className="text-sm font-medium text-white">ADDITIONAL DOCUMENT</p>
                                                    </div>
                                                    <a href={`http://localhost:8000${doc.file}`} target="_blank" rel="noreferrer"
                                                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 transition">View Full ↗</a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="space-y-4">
                        {/* Merchant Info */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Merchant</h2>
                            <p className="text-white font-medium">{submission.merchant?.username}</p>
                            <p className="text-gray-400 text-sm">{submission.merchant?.email || '—'}</p>
                            <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 space-y-1">
                                <p>Submitted: {new Date(submission.created_at).toLocaleString()}</p>
                                <p>Updated: {new Date(submission.updated_at).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Action Panel */}
                        {canAct ? (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Take Action</h2>
                                {message && (
                                    <div className={`mb-3 p-2.5 rounded-lg text-xs ${message.startsWith('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>
                                        {message}
                                    </div>
                                )}
                                <div className="space-y-2 mb-4">
                                    {[
                                        { id: 'approve', label: 'Approve', icon: '✓', color: 'border-green-700 hover:bg-green-900/30 text-green-400' },
                                        { id: 'reject', label: 'Reject', icon: '✗', color: 'border-red-700 hover:bg-red-900/30 text-red-400' },
                                        { id: 'request_more_info', label: 'Request More Info', icon: '?', color: 'border-orange-700 hover:bg-orange-900/30 text-orange-400' },
                                    ].map(action => (
                                        <button key={action.id} onClick={() => setSelectedAction(selectedAction === action.id ? '' : action.id)}
                                            className={`w-full py-2.5 px-4 border rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${selectedAction === action.id ? action.color + ' bg-opacity-100' : 'border-gray-700 text-gray-400 hover:' + action.color
                                                } ${selectedAction === action.id ? action.color : ''}`}>
                                            <span className="font-mono">{action.icon}</span> {action.label}
                                        </button>
                                    ))}
                                </div>

                                {selectedAction && (
                                    <div className="space-y-3">
                                        <textarea
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
                                            placeholder={['reject', 'request_more_info'].includes(selectedAction) ? `Reason/Note for merchant (required)...` : 'Optional note...'}
                                        />
                                        <button onClick={handleAction} disabled={actionLoading}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-900/30">
                                            {actionLoading ? 'Processing...' : `Confirm ${selectedAction.replace(/_/g, ' ')}`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                                <p className="text-gray-400 text-sm text-center py-4">
                                    No actions available for <span className="capitalize">{submission.status?.replace(/_/g, ' ')}</span> submissions.
                                </p>
                                {submission.rejection_reason && (
                                    <div className={`mt-4 p-3 rounded-lg border ${submission.status === 'more_info_requested' ? 'bg-orange-900/20 border-orange-800' : 'bg-red-900/20 border-red-800'}`}>
                                        <p className={`text-xs font-medium mb-1 ${submission.status === 'more_info_requested' ? 'text-orange-300' : 'text-red-300'}`}>
                                            {submission.status === 'more_info_requested' ? 'Reviewer Note:' : 'Rejection Reason:'}
                                        </p>
                                        <p className={`text-sm ${submission.status === 'more_info_requested' ? 'text-orange-200' : 'text-red-200'}`}>
                                            {submission.rejection_reason}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
