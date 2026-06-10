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
    getStats: (params?: { dateFrom?: string; dateTo?: string }) =>
        api.get('/dashboard/stats', { params }),
    getRecentActivity: (params?: { dateFrom?: string; dateTo?: string }) =>
        api.get('/dashboard/recent-activity', { params }),
    getPipeline: (params?: { dateFrom?: string; dateTo?: string }) =>
        api.get('/dashboard/pipeline', { params }),
};

export const jobsApi = {
    getAll: (params?: { search?: string; status?: string; approvalStatus?: string; dateFrom?: string; dateTo?: string }) =>
        api.get('/jobpositions', { params }),
    getById: (id: number) => api.get(`/jobpositions/${id}`),
    create: (data: any) => api.post('/jobpositions', data),
    update: (id: number, data: any) => api.put(`/jobpositions/${id}`, data),
    updateStatus: (id: number, status: string) => api.patch(`/jobpositions/${id}/status`, { status }),
    delete: (id: number) => api.delete(`/jobpositions/${id}`),
    // Approval workflow
    submitForApproval: (id: number) => api.post(`/jobpositions/${id}/submit`),
    approve: (id: number, comments?: string) => api.post(`/jobpositions/${id}/approve`, { comments }),
    reject: (id: number, comments: string) => api.post(`/jobpositions/${id}/reject`, { comments }),
    activate: (id: number, comments?: string) => api.post(`/jobpositions/${id}/activate`, { comments }),
    sendBack: (id: number, comments: string) => api.post(`/jobpositions/${id}/send-back`, { comments }),
};

export const candidatesApi = {
    getAll: (params?: { search?: string; status?: string; jobPositionId?: number; dateFrom?: string; dateTo?: string }) =>
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
    uploadResume: (candidateId: number, file: File) => {
        const fd = new FormData();
        fd.append('resume', file);
        return api.post(`/candidates/${candidateId}/upload-resume`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    rescoreAts: (candidateId: number) =>
        api.post(`/candidates/${candidateId}/rescore-ats`),
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
    create: (data: { fullName: string; email: string; password: string; role: string }) =>
        api.post('/users', data),
    update: (id: number, data: { fullName?: string; email?: string; password?: string; isActive?: boolean }) =>
        api.put(`/users/${id}`, data),
    delete: (id: number) => api.delete(`/users/${id}`),
};

export const notificationsApi = {
    getAll: (page?: number) => api.get('/notifications', { params: { page } }),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markRead: (id: number) => api.post(`/notifications/${id}/read`),
    markAllRead: () => api.post('/notifications/read-all'),
};

export const onboardingApi = {
    getAll: (params?: { type?: string; search?: string; status?: string; dateFrom?: string; dateTo?: string }) =>
        api.get('/onboarding', { params }),
    getStats: (params?: { dateFrom?: string; dateTo?: string }) =>
        api.get('/onboarding/stats', { params }),
    getById: (id: number) => api.get(`/onboarding/${id}`),
    move: (data: any) => api.post('/onboarding/move', data),
    update: (id: number, data: any) => api.put(`/onboarding/${id}`, data),
    promote: (id: number) => api.post(`/onboarding/${id}/promote`),
    complete: (id: number, accepted: boolean) => api.post(`/onboarding/${id}/complete`, { accepted }),
    uploadMilestoneDoc: (milestoneId: number, docType: string, file: File) => {
        const fd = new FormData();
        fd.append('docType', docType);
        fd.append('file', file);
        return api.post(`/onboarding/milestone/${milestoneId}/upload`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    updateMilestone: (milestoneId: number, data: { performanceRating?: number; performanceRemarks?: string }) =>
        api.put(`/onboarding/milestone/${milestoneId}`, data),
};

export default api;
