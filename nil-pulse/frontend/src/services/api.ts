import axios, { AxiosResponse, AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore, getAuthHeaders } from '@/stores/authStore'
import type { 
  ApiResponse, 
  PaginatedResponse,
  DashboardSummary,
  PulseData,
  NILContent,
  NILDeal,
  StateLaw,
  UserAlert,
  Trend,
  SearchResponse,
  SearchFilters,
  User
} from '@/types'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth headers
api.interceptors.request.use(
  (config) => {
    const authHeaders = getAuthHeaders()
    config.headers = { ...config.headers, ...authHeaders }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const authStore = useAuthStore.getState()
      
      try {
        // Try to refresh token
        await authStore.refreshToken()
        
        // Retry original request with new token
        const authHeaders = getAuthHeaders()
        originalRequest.headers = { ...originalRequest.headers, ...authHeaders }
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        await authStore.logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors
    const errorMessage = getErrorMessage(error)
    
    // Don't show toast for certain error types
    const suppressToast = [401, 403].includes(error.response?.status || 0)
    
    if (!suppressToast) {
      toast.error(errorMessage)
    }

    return Promise.reject(error)
  }
)

// Helper function to extract error messages
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as any
    return data.message || data.error || 'An error occurred'
  }
  
  if (error.message === 'Network Error') {
    return 'Network connection failed. Please check your internet connection.'
  }
  
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.'
  }
  
  return error.message || 'An unexpected error occurred'
}

// Generic API methods
async function get<T>(url: string, params?: any): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, { params })
  return response.data.data as T
}

async function post<T>(url: string, data?: any): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, data)
  return response.data.data as T
}

async function put<T>(url: string, data?: any): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, data)
  return response.data.data as T
}

async function del<T>(url: string): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url)
  return response.data.data as T
}

// Dashboard API
export const dashboardApi = {
  getSummary: (params?: { hours?: number }): Promise<DashboardSummary> =>
    get('/dashboard/summary', params),

  getPulse: (params?: { window?: number }): Promise<PulseData> =>
    get('/dashboard/pulse', params),

  getTimeline: (params?: { days?: number; category?: string }) =>
    get('/dashboard/timeline', params),

  getWidgetData: (widgetId: string, params?: { timeframe?: string }) =>
    get(`/dashboard/widgets/${widgetId}/data`, params),
}

// Content API
export const contentApi = {
  getContent: (params?: {
    page?: number
    limit?: number
    category?: string
    jurisdiction?: string
    importance_min?: number
    search?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<NILContent>> =>
    get('/content', params),

  getContentById: (id: string): Promise<NILContent> =>
    get(`/content/${id}`),

  createContent: (data: Partial<NILContent>): Promise<NILContent> =>
    post('/content', data),

  updateContent: (id: string, data: Partial<NILContent>): Promise<NILContent> =>
    put(`/content/${id}`, data),

  deleteContent: (id: string): Promise<void> =>
    del(`/content/${id}`),
}

// Deals API
export const dealsApi = {
  getDeals: (params?: {
    page?: number
    limit?: number
    sport?: string
    state?: string
    value_min?: number
    value_max?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<NILDeal>> =>
    get('/deals', params),

  getDealById: (id: string): Promise<NILDeal> =>
    get(`/deals/${id}`),

  getLeaderboard: (params?: {
    timeframe?: string
    sport?: string
    metric?: 'value' | 'count'
  }) =>
    get('/deals/leaderboard', params),

  createDeal: (data: Partial<NILDeal>): Promise<NILDeal> =>
    post('/deals', data),

  updateDeal: (id: string, data: Partial<NILDeal>): Promise<NILDeal> =>
    put(`/deals/${id}`, data),

  deleteDeal: (id: string): Promise<void> =>
    del(`/deals/${id}`),
}

// State Laws API
export const statesApi = {
  getStateLaws: (params?: {
    status?: string
    allows_high_school?: boolean
  }): Promise<StateLaw[]> =>
    get('/states', params),

  getStateLaw: (stateCode: string): Promise<StateLaw> =>
    get(`/states/${stateCode}`),

  getStateTimeline: (stateCode: string) =>
    get(`/states/${stateCode}/timeline`),

  updateStateLaw: (stateCode: string, data: Partial<StateLaw>): Promise<StateLaw> =>
    put(`/states/${stateCode}`, data),
}

// Alerts API
export const alertsApi = {
  getAlerts: (): Promise<UserAlert[]> =>
    get('/alerts'),

  getAlertById: (id: string): Promise<UserAlert> =>
    get(`/alerts/${id}`),

  createAlert: (data: Omit<UserAlert, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<UserAlert> =>
    post('/alerts', data),

  updateAlert: (id: string, data: Partial<UserAlert>): Promise<UserAlert> =>
    put(`/alerts/${id}`, data),

  deleteAlert: (id: string): Promise<void> =>
    del(`/alerts/${id}`),

  getAlertDeliveries: (id: string, params?: { page?: number; limit?: number }) =>
    get(`/alerts/${id}/deliveries`, params),

  testAlert: (id: string): Promise<void> =>
    post(`/alerts/${id}/test`),
}

// Trends API
export const trendsApi = {
  getTrends: (params?: {
    trend_type?: string
    period_hours?: number
    limit?: number
  }): Promise<Trend[]> =>
    get('/trends', params),

  getHotTopics: (params?: { limit?: number }) =>
    get('/trends/hot', params),

  getVelocityTrends: (params?: { timeframe?: string }) =>
    get('/trends/velocity', params),

  getMarketGaps: (params?: { severity?: string }) =>
    get('/trends/gaps', params),
}

// Search API
export const searchApi = {
  search: (params: SearchFilters): Promise<SearchResponse> =>
    get('/search', params),

  autocomplete: (params: { query: string; limit?: number }) =>
    get('/search/autocomplete', params),

  getSuggestions: (params: { query: string }) =>
    get('/search/suggestions', params),
}

// Analytics API
export const analyticsApi = {
  getOverview: (params?: { date_from?: string; date_to?: string }) =>
    get('/analytics/overview', params),

  exportData: (params: {
    format: 'json' | 'csv' | 'pdf'
    date_from?: string
    date_to?: string
    filters?: any
  }) =>
    get('/analytics/export', params),

  getUserActivity: (params?: { user_id?: string; date_from?: string; date_to?: string }) =>
    get('/analytics/users', params),
}

// Admin APIs
export const adminApi = {
  // Sources management
  getSources: (): Promise<any[]> =>
    get('/sources'),

  getSourceById: (id: string) =>
    get(`/sources/${id}`),

  createSource: (data: any) =>
    post('/sources', data),

  updateSource: (id: string, data: any) =>
    put(`/sources/${id}`, data),

  deleteSource: (id: string): Promise<void> =>
    del(`/sources/${id}`),

  testSource: (id: string) =>
    post(`/sources/${id}/test`),

  // User management
  getUsers: (): Promise<User[]> =>
    get('/admin/users'),

  getUserById: (id: string): Promise<User> =>
    get(`/admin/users/${id}`),

  createUser: (data: Partial<User>): Promise<User> =>
    post('/admin/users', data),

  updateUser: (id: string, data: Partial<User>): Promise<User> =>
    put(`/admin/users/${id}`, data),

  deleteUser: (id: string): Promise<void> =>
    del(`/admin/users/${id}`),

  // System health
  getSystemHealth: () =>
    get('/admin/health'),

  getSystemStats: () =>
    get('/admin/stats'),
}

// Auth API (handled by auth store, but included for completeness)
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    post('/auth/login', credentials),

  logout: () =>
    post('/auth/logout'),

  getCurrentUser: () =>
    get('/auth/me'),

  refreshToken: (refreshToken: string) =>
    post('/auth/refresh', { refresh_token: refreshToken }),

  changePassword: (data: { current_password: string; new_password: string }) =>
    post('/auth/change-password', data),

  updateProfile: (data: { name?: string; metadata?: any }) =>
    post('/auth/update-profile', data),
}

// Export the axios instance for direct use if needed
export { api }

// Export commonly used types
export type { AxiosError, AxiosResponse }