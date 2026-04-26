import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function Signup() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        username: '', email: '', password: '', role: 'merchant',
        first_name: '', last_name: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await API.post('/auth/signup/', form);
            navigate('/login');
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const messages = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
                setError(messages);
            } else {
                setError('Signup failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-white">KYCFlow</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create account</h1>
                    <p className="text-gray-400 mt-1">Join KYCFlow today</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                                <input type="text" value={form.first_name}
                                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
                                    placeholder="First name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                                <input type="text" value={form.last_name}
                                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
                                    placeholder="Last name" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                            <input type="text" required value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
                                placeholder="Choose a username" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <input type="email" value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
                                placeholder="you@example.com" />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm pr-12"
                                placeholder="Minimum 6 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[30px] text-gray-500 hover:text-gray-300 transition"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['merchant', 'reviewer'].map(r => (
                                    <button key={r} type="button"
                                        onClick={() => setForm({ ...form, role: r })}
                                        className={`py-2.5 px-4 rounded-xl border text-sm font-medium capitalize transition-all ${form.role === r
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                            }`}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 mt-2">
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                    <p className="text-center text-gray-400 text-sm mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
