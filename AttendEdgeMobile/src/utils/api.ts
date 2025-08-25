import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios';
// Using a simple string for platform detection
const platform = 'web'; // Default value, will be overridden in React Native

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    skipAuth?: boolean;
    skipAuthRefresh?: boolean;
    retry?: number;
  }
}
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import config from './config';

// Extend the global type to include expoConfig
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

interface ExpoConfig {
  version?: string;
  extra?: {
    [key: string]: any;
  };
}

// Extend the AxiosRequestConfig to include our custom options
// Using the extended AxiosRequestConfig from the module declaration
interface CustomRequestConfig extends AxiosRequestConfig {
  headers?: AxiosRequestHeaders & {
    [key: string]: string | number | boolean | null | undefined;
  };
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

type RequestConfig = AxiosRequestConfig & {
  retry?: number;
  timeout?: number;
};

class ApiClient {
  private instance: AxiosInstance;
  private authToken: string | null = null;
  private refreshTokenPromise: Promise<string | null> | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: config.API_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Platform': platform,
        'X-App-Version': (Constants.expoConfig as ExpoConfig)?.version || '1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private async getAuthToken(): Promise<string | null> {
    if (this.authToken) return this.authToken;
    
    try {
      this.authToken = await SecureStore.getItemAsync('authToken');
      return this.authToken;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return null;

      this.refreshTokenPromise = (async () => {
        try {
          const response = await this.instance.post<{ accessToken: string }>(
            '/auth/refresh-token', 
            { refreshToken },
            { skipAuthRefresh: true } as CustomRequestConfig
          );
          const { accessToken } = response.data;
          
          if (accessToken) {
            await SecureStore.setItemAsync('accessToken', accessToken);
            this.authToken = accessToken;
            return accessToken;
          }
          return null;
        } catch (error) {
          console.error('Error refreshing token:', error);
          await this.clearAuthTokens();
          return null;
        } finally {
          this.refreshTokenPromise = null;
        }
      })();

      return this.refreshTokenPromise;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await this.clearAuthTokens();
      return null;
    }
  }

  private async clearAuthTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('authToken'),
        SecureStore.deleteItemAsync('refreshToken'),
      ]);
      this.authToken = null;
    } catch (error) {
      console.error('Failed to clear auth:', error);
    }
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const customConfig = config as CustomRequestConfig;
        
        // Skip auth header for auth endpoints
        if (customConfig.skipAuth) {
          return config;
        }

        // Add auth token to request
        const token = await this.getAuthToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as CustomRequestConfig;
        if (!originalRequest) {
          return Promise.reject(error);
        }

        // If the error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              // Retry the original request with the new token
              const newConfig = {
                ...originalRequest,
                headers: {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${newToken}`
                }
              };
              return this.instance(newConfig);
            }
          } catch (refreshError) {
            // If refresh fails, clear auth and redirect to login
            await this.clearAuthTokens();
            // TODO: Redirect to login screen
          }
        }

        // Skip retry if already retried or not a retryable error
        if (
          !originalRequest || 
          originalRequest.retry === undefined ||
          !this.isRetryableError(error)
        ) {
          return Promise.reject(error);
        }

        // Retry with exponential backoff
        const retryCount = originalRequest.retry || 0;
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                this.instance({
                  ...originalRequest,
                  retry: retryCount + 1,
                })
              );
            }, delay);
          });
        }

        return Promise.reject(error);
      }
    );
  }

  private isRetryableError(error: AxiosError): boolean {
    // Don't retry if it's not an axios error
    if (!error.isAxiosError) return false;

    // Don't retry if there's no response (network error)
    if (!error.response) return true; // Retry network errors

    // Don't retry for these status codes
    const nonRetryableStatuses = [400, 401, 403, 404, 422];
    if (nonRetryableStatuses.includes(error.response.status)) {
      return false;
    }

    // Retry server errors and timeouts
    return error.response.status >= 500 || error.code === 'ECONNABORTED';
  }

  // Public methods
  public async get<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  public async delete<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  // File upload helper
  public async upload<T = any>(
    url: string,
    fileUri: string,
    fieldName: string = 'file',
    extraData: Record<string, any> = {},
    onUploadProgress?: (progress: number) => void
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData();
    
    // @ts-ignore - File type is compatible
    formData.append(fieldName, {
      uri: fileUri,
      name: fileUri.split('/').pop(),
      type: 'image/jpeg', // Default type, should be detected properly
    });

    // Append extra data
    Object.entries(extraData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(progress);
        }
      },
    });
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();

export default apiClient;
