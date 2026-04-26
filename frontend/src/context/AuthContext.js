import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('role');
        const username = localStorage.getItem('username');
        const userId = localStorage.getItem('user_id');
        if (token && role) {
            setUser({ token, role, username, userId });
        }
        setLoading(false);
    }, []);

    const login = (data, role, username, userId) => {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('role', role);
        localStorage.setItem('username', username);
        localStorage.setItem('user_id', userId);
        setUser({ token: data.access, role, username, userId });
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
