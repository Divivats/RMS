import axios from 'axios';

const API_BASE = `http://${window.location.hostname}:5275/api`;
export const BACKEND_URL = `http://${window.location.hostname}:5275`;

const api = axios.create({
    baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
    const stored = localStorage.getItem('rms_user');
    if (stored) {
        const user = JSON.parse(stored);
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('rms_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
};

export const dashboardApi = {
    getStats: () => api.get('/dashboard/stats'),
    getRecentActivity: () => api.get('/dashboard/recent-activity'),
    getPipeline: () => api.get('/dashboard/pipeline'),
};

export const jobsApi = {
    getAll: (params?: { search?: string; status?: string }) =>
        api.get('/jobpositions', { params }),
    getById: (id: number) => api.get(`/jobpositions/${id}`),
    create: (data: any) => api.post('/jobpositions', data),
    update: (id: number, data: any) => api.put(`/jobpositions/${id}`, data),
    updateStatus: (id: number, status: string) => api.patch(`/jobpositions/${id}/status`, { status }),
    delete: (id: number) => api.delete(`/jobpositions/${id}`),
};

export const candidatesApi = {
    getAll: (params?: { search?: string; status?: string; jobPositionId?: number }) =>
        api.get('/candidates', { params }),
    getById: (id: number) => api.get(`/candidates/${id}`),
    create: (formData: FormData) =>
        api.post('/candidates', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    update: (id: number, formData: FormData) =>
        api.put(`/candidates/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

export const interviewsApi = {
    getQuestions: () => api.get('/interviews/questions'),
    getCandidateInterviews: (candidateId: number) =>
        api.get(`/interviews/candidate/${candidateId}`),
    getEvaluation: (interviewId: number) =>
        api.get(`/interviews/evaluation/${interviewId}`),
    advance: (data: any) => api.post('/interviews/advance', data),
};

export const usersApi = {
    getAll: () => api.get('/users'),
    getById: (id: number) => api.get(`/users/${id}`),
    create: (data: { fullName: string; email: string; password: string }) =>
        api.post('/users', data),
    update: (id: number, data: { fullName?: string; email?: string; password?: string; isActive?: boolean }) =>
        api.put(`/users/${id}`, data),
    delete: (id: number) => api.delete(`/users/${id}`),
};

export default api;
