import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Platform } from 'react-native';
import { getItemAsync, deleteItemAsync } from 'expo-secure-store';
import { API_BASE_URL } from '../../config';

class ApiClient {
  private instance: AxiosInstance;
  private authToken: string | null = null;
  private refreshTokenRequest: Promise<string> | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Platform': Platform.OS,
      },
    });

    // Request interceptor
    this.instance.interceptors.request.use(
      async (config) => {
        // Get the auth token
        if (!this.authToken) {
          this.authToken = await getItemAsync('authToken');
        }

        // Add auth token to request headers
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshTokenRequest === null) {
            originalRequest._retry = true;
            this.refreshTokenRequest = this.refreshAuthToken();
          }

          try {
            const newToken = await this.refreshTokenRequest;
            this.authToken = newToken;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            // If refresh token fails, clear auth and redirect to login
            await this.clearAuth();
            return Promise.reject(refreshError);
          } finally {
            this.refreshTokenRequest = null;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAuthToken(): Promise<string> {
    try {
      const refreshToken = await getItemAsync('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data;
      await SecureStore.setItemAsync('authToken', accessToken);
      return accessToken;
    } catch (error) {
      await this.clearAuth();
      throw error;
    }
  }

  private async clearAuth(): Promise<void> {
    await Promise.all([
      deleteItemAsync('authToken'),
      deleteItemAsync('refreshToken'),
    ]);
    this.authToken = null;
    // You might want to redirect to login screen here
  }

  // HTTP Methods
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  public async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  public async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
