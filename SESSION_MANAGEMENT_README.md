# Session Management System

## Overview
The AttendEase application now includes a comprehensive session management system that provides security, user experience improvements, and compliance features.

## Features

### 🔐 Core Session Management
- **Automatic Session Timeout**: Sessions automatically expire after 30 minutes of inactivity
- **Activity Monitoring**: Tracks user activity (mouse, keyboard, scroll, touch, focus)
- **Session Extension**: Users can extend their session before timeout
- **Warning System**: 5-minute warning before session expiration

### 🛡️ Security Features
- **Device Fingerprinting**: Unique device identification for session validation
- **Login Attempt Tracking**: Prevents brute force attacks (5 attempts max, 15-minute lockout)
- **Session Integrity Validation**: Ensures session hasn't been tampered with
- **Suspicious Activity Detection**: Monitors for unusual navigation patterns
- **Security Event Logging**: Logs security events to database

### 📱 User Experience
- **Session Status Indicator**: Real-time display of session status in dashboard header
- **Timeout Warning Modal**: User-friendly warning with countdown timer
- **Session Settings Page**: Dedicated page for session configuration
- **Activity-Based Timer Reset**: Automatic timer reset on user activity

### ⚙️ Configuration Options
- **Custom Timeout Settings**: Configurable session duration (5 minutes to 8 hours)
- **Notification Preferences**: Toggle session timeout warnings
- **Auto-extension Settings**: Automatic session extension on activity
- **Advanced Security Options**: Device validation and monitoring settings

## Components

### 1. SessionContext (`src/contexts/SessionContext.tsx`)
- Manages session state and timeout logic
- Handles user activity monitoring
- Provides session management functions

### 2. SessionTimeoutModal (`src/components/SessionTimeoutModal.tsx`)
- Displays timeout warning with countdown
- Allows users to extend session or logout
- Auto-closes when time expires

### 3. SessionStatusIndicator (`src/components/SessionStatusIndicator.tsx`)
- Shows current session status in dashboard header
- Displays time remaining with color-coded status
- Provides quick access to session actions

### 4. SessionSettings (`src/components/SessionSettings.tsx`)
- Comprehensive session configuration page
- Shows current session information
- Allows customization of session preferences

### 5. SessionSecurity (`src/lib/sessionUtils.ts`)
- Security utilities for session management
- Device fingerprinting and validation
- Login attempt tracking and lockout

## Usage

### Basic Session Management
```typescript
import { useSession } from '@/contexts/SessionContext';

const MyComponent = () => {
  const { 
    isSessionActive, 
    extendSession, 
    logout, 
    showTimeoutWarning 
  } = useSession();

  // Extend session
  const handleExtend = () => {
    extendSession();
  };

  // Manual logout
  const handleLogout = () => {
    logout();
  };
};
```

### Session Security
```typescript
import { SessionSecurity } from '@/lib/sessionUtils';

// Track login attempts
const { attempts, locked } = SessionSecurity.trackLoginAttempt(email);

// Check if account is locked
if (SessionSecurity.isAccountLocked(email)) {
  const remainingTime = SessionSecurity.getRemainingLockoutTime(email);
  // Show lockout message
}

// Validate session integrity
if (!SessionSecurity.validateSession()) {
  // Redirect to login
}
```

## Configuration

### Session Timeout Settings
- **Default Timeout**: 30 minutes
- **Warning Time**: 5 minutes before expiration
- **Check Interval**: Every 30 seconds
- **Warning Interval**: Every 1 minute

### Security Settings
- **Max Login Attempts**: 5
- **Lockout Duration**: 15 minutes
- **Device Fingerprinting**: Enabled by default
- **Activity Monitoring**: All user interactions tracked

## Database Schema

### Security Logs Table
```sql
CREATE TABLE security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## Security Considerations

### Session Hijacking Prevention
- Device fingerprinting validation
- Session data encryption
- Regular session integrity checks

### Brute Force Protection
- Login attempt tracking
- Progressive lockout periods
- IP-based monitoring

### Data Privacy
- Local storage encryption
- Secure session data handling
- Automatic cleanup on logout

## Browser Compatibility

### Supported Features
- **Modern Browsers**: Full feature support
- **Mobile Browsers**: Touch and focus event support
- **Progressive Web Apps**: Service worker integration ready

### Polyfills
- Canvas API for device fingerprinting
- LocalStorage for session persistence
- Event listeners for activity monitoring

## Monitoring and Analytics

### Session Metrics
- Session duration tracking
- User activity patterns
- Timeout frequency analysis
- Security event monitoring

### Performance Impact
- Minimal CPU usage for activity monitoring
- Efficient timer management
- Optimized event handling

## Troubleshooting

### Common Issues
1. **Session expires too quickly**: Check activity monitoring settings
2. **Warning not showing**: Verify notification preferences
3. **Device validation fails**: Clear browser cache and cookies
4. **Login lockout**: Wait for lockout period or contact admin

### Debug Mode
Enable debug logging by setting:
```typescript
localStorage.setItem('session_debug', 'true');
```

## Future Enhancements

### Planned Features
- **Multi-factor Authentication**: SMS/Email verification
- **Session Synchronization**: Cross-device session management
- **Advanced Analytics**: User behavior insights
- **Compliance Reporting**: GDPR/CCPA compliance tools

### Integration Possibilities
- **Single Sign-On (SSO)**: Enterprise authentication systems
- **Active Directory**: Windows domain integration
- **OAuth Providers**: Google, Microsoft, GitHub
- **Biometric Authentication**: Fingerprint/Face recognition

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

---

**Note**: This session management system is designed to balance security with user experience. All security features can be configured or disabled based on organizational requirements.
