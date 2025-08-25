import { AxiosError } from 'axios';
import { Alert } from 'react-native';
import { config } from './config';

type ErrorWithMessage = {
  message: string;
  code?: string | number;
  status?: number;
  details?: any;
};

class AppError extends Error {
  code?: string | number;
  status?: number;
  details?: any;
  isAppError = true;

  constructor(error: string | ErrorWithMessage) {
    super(typeof error === 'string' ? error : error.message);
    
    if (typeof error !== 'string') {
      this.code = error.code;
      this.status = error.status;
      this.details = error.details;
    }

    // Capture stack trace in development
    if (config.ENVIRONMENT === 'development') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static fromAxiosError(error: AxiosError): AppError {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { data, status, statusText } = error.response;
      
      // Handle API error response format
      if (data && typeof data === 'object') {
        return new AppError({
          message: (data as any).message || statusText || 'An error occurred',
          code: (data as any).code || status,
          status,
          details: (data as any).details || data,
        });
      }
      
      return new AppError({
        message: statusText || 'An error occurred',
        code: status,
        status,
      });
    } else if (error.request) {
      // The request was made but no response was received
      return new AppError({
        message: 'No response received from server. Please check your connection.',
        code: 'NO_RESPONSE',
      });
    } else {
      // Something happened in setting up the request
      return new AppError({
        message: error.message || 'An error occurred',
        code: 'REQUEST_ERROR',
      });
    }
  }

  static fromError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new AppError({
        message: error.message,
        details: error.stack,
      });
    }
    
    if (typeof error === 'string') {
      return new AppError(error);
    }
    
    return new AppError({
      message: 'An unknown error occurred',
      details: error,
    });
  }

  static isNetworkError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.code === 'ECONNABORTED' || !error.response;
    }
    
    if (error instanceof AppError) {
      return error.code === 'NO_RESPONSE' || error.code === 'NETWORK_ERROR';
    }
    
    return false;
  }

  static isUnauthorized(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 401;
    }
    
    if (error instanceof AppError) {
      return error.status === 401 || error.code === 'UNAUTHORIZED';
    }
    
    return false;
  }

  static isForbidden(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 403;
    }
    
    if (error instanceof AppError) {
      return error.status === 403 || error.code === 'FORBIDDEN';
    }
    
    return false;
  }

  static isNotFound(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 404;
    }
    
    if (error instanceof AppError) {
      return error.status === 404 || error.code === 'NOT_FOUND';
    }
    
    return false;
  }

  static isServerError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      return status ? status >= 500 && status < 600 : false;
    }
    
    if (error instanceof AppError) {
      return error.status ? error.status >= 500 && error.status < 600 : false;
    }
    
    return false;
  }
}

const handleError = (error: unknown, options: {
  showAlert?: boolean;
  alertTitle?: string;
  logger?: (error: Error) => void;
} = {}): AppError => {
  const appError = AppError.fromError(error);
  
  // Log error in development
  if (config.ENVIRONMENT === 'development' || config.ENABLE_DEBUG_LOGS) {
    console.error('Error:', appError);
  }
  
  // Log to external service in production
  if (config.ENVIRONMENT === 'production' && config.SENTRY_DSN) {
    // TODO: Implement Sentry or other error tracking
    // captureException(appError);
  }
  
  // Show alert if configured
  if (options.showAlert !== false) {
    Alert.alert(
      options.alertTitle || 'Error',
      appError.message,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  }
  
  // Call custom logger if provided
  if (options.logger) {
    options.logger(appError);
  }
  
  return appError;
};

const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options?: {
    showAlert?: boolean;
    alertTitle?: string;
    logger?: (error: Error) => void;
    onError?: (error: AppError) => void;
  }
) => {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = handleError(error, {
        showAlert: options?.showAlert,
        alertTitle: options?.alertTitle,
        logger: options?.logger,
      });
      
      if (options?.onError) {
        options.onError(appError);
      }
      
      return undefined;
    }
  };
};

const createErrorBoundary = (
  errorHandler: (error: Error, info: { componentStack: string }) => void
) => {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
      errorHandler(error, { componentStack: info.componentStack });
    }

    render() {
      if (this.state.hasError) {
        // You can render any custom fallback UI
        return null;
      }

      return this.props.children;
    }
  };
};

export {
  AppError,
  handleError,
  withErrorHandling,
  createErrorBoundary,
  type ErrorWithMessage,
};
