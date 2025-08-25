# AttendEase Mobile Utilities

This directory contains utility functions and classes used throughout the AttendEase mobile application. These utilities are designed to be reusable, testable, and follow best practices for React Native development.

## Table of Contents

- [API Client](#api-client)
- [Authentication](#authentication)
- [Storage](#storage)
- [Validation](#validation)
- [Date & Time](#date--time)
- [Error Handling](#error-handling)
- [Caching](#caching)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## API Client

The `apiClient` provides a robust HTTP client with built-in request/response interceptors, authentication, and error handling.

### Features
- Automatic token refresh
- Request/response interceptors
- Error handling
- Request/response transformation
- Timeout handling
- Progress tracking for uploads/downloads

### Example
```typescript
import { apiClient } from './api';

// GET request
const users = await apiClient.get('/users');

// POST request
const newUser = await apiClient.post('/users', { name: 'John Doe' });
```

## Authentication

Handles user authentication, token management, and session persistence.

### Features
- Secure token storage
- Session management
- Automatic token refresh
- Biometric authentication support

### Example
```typescript
import { authService } from '../services';

// Login
await authService.login(email, password);

// Logout
await authService.logout();

// Check authentication status
const isAuthenticated = await authService.isAuthenticated();
```

## Storage

Provides a unified interface for secure and non-secure storage with encryption support.

### Features
- Secure storage for sensitive data
- AsyncStorage for non-sensitive data
- Namespaced keys
- Type-safe API

### Example
```typescript
import { storage } from './storage';

// Set item
await storage.setItem('user', { id: 1, name: 'John' });

// Get item
const user = await storage.getItem<{ id: number; name: string }>('user');

// Remove item
await storage.removeItem('user');
```

## Validation

A flexible validation library for form and data validation.

### Features
- Built-in validators (required, email, min/max length, etc.)
- Custom validation functions
- Async validation support
- Form validation

### Example
```typescript
import { validation } from './validation';

const schema = {
  email: {
    required: 'Email is required',
    email: 'Invalid email format',
  },
  password: {
    required: true,
    minLength: { value: 8, message: 'Must be at least 8 characters' },
  },
};

const validator = new Validator(schema);
const { isValid, errors } = await validator.validate({ email, password });
```

## Date & Time

Utilities for date manipulation, formatting, and timezone handling.

### Features
- Date formatting
- Timezone conversion
- Date arithmetic
- Relative time formatting

### Example
```typescript
import { formatDate, getRelativeDate } from './date';

// Format date
const formatted = formatDate(new Date(), 'MM/DD/YYYY');

// Get relative time
const relative = getRelativeDate(someDate);
```

## Error Handling

Centralized error handling and reporting.

### Features
- Error boundary component
- Error reporting
- User-friendly error messages
- Error logging

### Example
```typescript
import { handleError, withErrorHandling } from './error';

// Basic error handling
try {
  // ...
} catch (error) {
  handleError(error, { showAlert: true });
}

// Higher-order function for error handling
const fetchData = withErrorHandling(async () => {
  const response = await api.get('/data');
  return response.data;
});
```

## Caching

API response caching with TTL support.

### Features
- Memory and disk caching
- TTL support
- Cache invalidation
- ETag and Last-Modified support

### Example
```typescript
import { apiClient } from './apiCache';

// Get with caching
const data = await apiClient.get('/data', {
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    useCache: true,
  },
});

// Invalidate cache
await invalidateCache(/^@cache:\/api/);
```

## Usage Examples

### Making an API Call with Caching

```typescript
import { apiClient } from './api';
import { handleError } from './error';

const fetchUserProfile = async (userId: string) => {
  try {
    const user = await apiClient.get(`/users/${userId}`, {
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
    return user;
  } catch (error) {
    handleError(error, { showAlert: true });
    throw error;
  }
};
```

### Form Validation

```typescript
import { validation } from './validation';

const loginSchema = {
  email: {
    required: 'Email is required',
    email: 'Please enter a valid email',
  },
  password: {
    required: 'Password is required',
    minLength: { value: 8, message: 'Must be at least 8 characters' },
  },
};

const validateLogin = async (values: { email: string; password: string }) => {
  const validator = new Validator(loginSchema);
  return validator.validate(values);
};
```

## Best Practices

1. **Error Handling**
   - Always wrap API calls in try/catch blocks
   - Use the error handling utilities to provide consistent error messages
   - Log errors in development, show user-friendly messages in production

2. **Caching**
   - Cache API responses when appropriate to improve performance
   - Set appropriate TTL values based on data freshness requirements
   - Invalidate cache when data is updated

3. **Storage**
   - Use secure storage for sensitive data (tokens, user credentials)
   - Use AsyncStorage for non-sensitive data
   - Always handle storage errors gracefully

4. **Validation**
   - Validate data on both client and server
   - Provide clear, user-friendly error messages
   - Use the validation utilities consistently

5. **API Client**
   - Use the provided apiClient for all HTTP requests
   - Configure interceptors for common tasks (auth, error handling)
   - Use the caching options when appropriate

6. **Date/Time**
   - Always handle timezones correctly
   - Use the date utilities for consistent formatting
   - Consider the user's locale when displaying dates/times

7. **Authentication**
   - Use the auth service for all authentication-related tasks
   - Handle token refresh automatically
   - Secure sensitive data appropriately

## Contributing

When adding new utilities:

1. Follow the existing code style and patterns
2. Add appropriate TypeScript types
3. Include JSDoc comments
4. Add unit tests
5. Update this README if necessary

## License

This project is licensed under the MIT License - see the LICENSE file for details.
