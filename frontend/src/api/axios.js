import axios from 'axios';

const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
});

// Inject JWT token on every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-refresh on 401 (optional enhancement)
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const { data } = await axios.post(
                        `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/auth/refresh/`,
                        { refresh: refreshToken }
                    );
                    localStorage.setItem('access_token', data.access);
                    originalRequest.headers.Authorization = `Bearer ${data.access}`;
                    return API(originalRequest);
                } catch {
                    localStorage.clear();
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default API;
