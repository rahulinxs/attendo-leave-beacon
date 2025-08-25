# AttendEase Mobile Services

This directory contains the service layer for the AttendEase mobile application. The services handle all the business logic, API communication, and data management for the app.

## Services Overview

### 1. API Client (`apiClient.ts`)
A configured Axios instance with interceptors for handling authentication, request/response transformation, and error handling.

### 2. Authentication Service (`authService.ts`)
Handles user authentication, token management, and session persistence.

### 3. Attendance Service (`attendanceService.ts`)
Manages attendance-related operations like check-in, check-out, and attendance history.

### 4. Leave Service (`leaveService.ts`)
Handles leave requests, balances, and approvals.

### 5. Team Service (`teamService.ts`)
Manages team-related operations and team member management.

### 6. User Service (`userService.ts`)
Handles user profile management and preferences.

### 7. Notification Service (`notificationService.ts`)
Manages push notifications and in-app notifications.

### 8. Offline Service (`offlineService.ts`)
Handles offline data synchronization and queue management.

## Usage

Import the services you need from the main index file:

```typescript
import { 
  authService, 
  attendanceService, 
  leaveService,
  teamService,
  userService,
  notificationService,
  offlineService 
} from '../services';
```

## Error Handling

All services follow a consistent error handling pattern:
- Throws errors with descriptive messages
- Handles network errors gracefully
- Provides appropriate error messages for different HTTP status codes

## Offline Support

The offline service provides a queue system for operations that need to be performed when the device is offline. It will automatically retry failed operations when the connection is restored.

## Data Persistence

- Authentication tokens and user data are stored securely using `expo-secure-store`
- Offline data is stored using `@react-native-async-storage/async-storage`
- The app automatically syncs data when the connection is restored

## Best Practices

1. Always use the service layer to interact with the API
2. Handle errors appropriately in your components
3. Use the offline service for operations that need to work offline
4. Clear sensitive data when logging out
5. Use the notification service for all push notifications

## Testing

Each service includes error handling and can be tested independently. Mock the API responses when testing components that use these services.
