import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
    draft: 'bg-gray-700 text-gray-300',
    submitted: 'bg-blue-900/50 text-blue-300',
    under_review: 'bg-yellow-900/50 text-yellow-300',
    approved: 'bg-green-900/50 text-green-300',
    rejected: 'bg-red-900/50 text-red-300',
    more_info_requested: 'bg-orange-900/50 text-orange-300',
};

export default function ReviewerQueue() {
    const { user, logout } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [queueRes, metricsRes] = await Promise.all([
                API.get('/reviewer/queue/'),
                API.get('/reviewer/metrics/'),
            ]);
            setSubmissions(queueRes.data);
            setMetrics(metricsRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = filter === 'all'
        ? submissions
        : submissions.filter(s => s.status === filter);

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
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <span className="font-bold text-white text-lg">KYCFlow</span>
                        <span className="text-gray-600">|</span>
                        <span className="text-gray-400 text-sm">Reviewer Dashboard</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">🔍 {user?.username}</span>
                        <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition">Logout</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Metrics */}
                {metrics && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Pending', value: metrics.total_pending, icon: '⏳', color: 'text-yellow-400' },
                            { label: 'Approval Rate (7d)', value: `${metrics.approval_rate_7d}%`, icon: '✅', color: 'text-green-400' },
                            { label: 'Avg Time in Queue', value: `${metrics.avg_time_in_queue_hours}h`, icon: '⏱️', color: 'text-blue-400' },
                            { label: 'At Risk', value: metrics.at_risk_count, icon: '⚠️', color: 'text-orange-400' },
                        ].map(m => (
                            <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xl">{m.icon}</span>
                                </div>
                                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {['all', 'submitted', 'under_review', 'approved', 'rejected', 'more_info_requested'].map(s => (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition capitalize ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}>
                            {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>

                {/* Submissions Table */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="border-b border-gray-800 px-6 py-4">
                        <h2 className="font-semibold text-white">KYC Submissions</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{filtered.length} submission{filtered.length !== 1 ? 's' : ''} · oldest first</p>
                    </div>
                    {filtered.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No submissions yet</div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {filtered.map(sub => (
                                <div key={sub.id} className="px-6 py-4 hover:bg-gray-800/50 transition-all">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-sm font-semibold text-white">#{sub.id} — {sub.merchant?.username}</span>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[sub.status] || ''}`}>
                                                    {sub.status?.replace(/_/g, ' ')}
                                                </span>
                                                {sub.is_at_risk && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-900/40 border border-orange-700 rounded-full text-xs text-orange-300">
                                                        ⚠ At Risk
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-4 text-xs text-gray-500">
                                                <span>👤 {sub.full_name || 'Name not provided'}</span>
                                                <span>🏢 {sub.business_name || 'Business not provided'}</span>
                                                <span>📎 {sub.documents?.length || 0} docs</span>
                                                <span>🕒 {new Date(sub.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <Link to={`/reviewer/submission/${sub.id}`}
                                            className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition">
                                            Review →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
