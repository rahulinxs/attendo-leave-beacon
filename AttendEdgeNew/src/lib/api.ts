import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Base API configuration
const API_BASE_URL = 'https://api.attendedge.example.com/v1';

// Create axios instance with base URL and default headers
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Handle token expiration (401 Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { token, refreshToken: newRefreshToken } = response.data;
          
          // Store the new tokens
          await SecureStore.setItemAsync('auth_token', token);
          await SecureStore.setItemAsync('refresh_token', newRefreshToken);
          
          // Update the Authorization header
          originalRequest.headers.Authorization = `Bearer ${token}`;
          
          // Retry the original request
          return apiClient(originalRequest);
        } else {
          // No refresh token available, redirect to login
          await SecureStore.deleteItemAsync('auth_token');
          // You might want to navigate to login screen here
          // navigation.navigate('Login');
        }
      } catch (refreshError) {
        // Refresh token failed, clear storage and redirect to login
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // navigation.navigate('Login');
        return Promise.reject(refreshError);
      }
    }
    
    // Handle other error status codes
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', error.response.data);
      
      // Handle specific error status codes
      switch (error.response.status) {
        case 400:
          console.error('Bad Request:', error.response.data);
          break;
        case 403:
          console.error('Forbidden:', error.response.data);
          // Handle forbidden access
          break;
        case 404:
          console.error('Not Found:', error.response.data);
          // Handle not found
          break;
        case 500:
          console.error('Server Error:', error.response.data);
          // Handle server error
          break;
        default:
          console.error('Unhandled Error:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Helper function to initialize the API client
export const setupHttpClient = (baseURL: string = API_BASE_URL) => {
  apiClient.defaults.baseURL = baseURL;
  return apiClient;
};

// API service methods
export const apiService = {
  // Auth
  login: (email: string, password: string) => 
    apiClient.post('/auth/login', { email, password }),
    
  register: (userData: any) => 
    apiClient.post('/auth/register', userData),
    
  forgotPassword: (email: string) => 
    apiClient.post('/auth/forgot-password', { email }),
    
  resetPassword: (token: string, password: string) => 
    apiClient.post('/auth/reset-password', { token, password }),
  
  // User
  getProfile: () => 
    apiClient.get('/users/me'),
    
  updateProfile: (userData: any) => 
    apiClient.put('/users/me', userData),
    
  // Attendance
  clockIn: (data: { location: { lat: number; lng: number } }) => 
    apiClient.post('/attendance/clock-in', data),
    
  clockOut: (data: { location: { lat: number; lng: number } }) => 
    apiClient.post('/attendance/clock-out', data),
    
  getAttendanceHistory: (params?: { startDate?: string; endDate?: string }) => 
    apiClient.get('/attendance/history', { params }),
    
  // Schedule
  getSchedule: (params?: { startDate?: string; endDate?: string }) => 
    apiClient.get('/schedule', { params }),
    
  // Leave
  requestLeave: (data: { startDate: string; endDate: string; type: string; reason?: string }) => 
    apiClient.post('/leave/request', data),
    
  getLeaveHistory: (params?: { status?: string; startDate?: string; endDate?: string }) => 
    apiClient.get('/leave/history', { params }),
    
  // Notifications
  getNotifications: () => 
    apiClient.get('/notifications'),
    
  markNotificationAsRead: (notificationId: string) => 
    apiClient.put(`/notifications/${notificationId}/read`),
};

export default apiClient;
