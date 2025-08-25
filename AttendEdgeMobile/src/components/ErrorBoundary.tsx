import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Button, Platform } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from './ui/Icon';

type ErrorBoundaryProps = {
  /**
   * Fallback component to render when an error occurs
   * If not provided, a default error screen will be shown
   */
  FallbackComponent?: React.ComponentType<{ error: Error; resetError: () => void }>;
  /**
   * Called when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Called when the error is reset
   */
  onReset?: () => void;
  /**
   * Children to render
   */
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Default error fallback component
 */
const DefaultErrorFallback = ({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) => {
  const theme = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Icon
          name="alert-circle"
          size={64}
          color={theme.colors.error}
          style={styles.icon}
        />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Something went wrong
        </Text>
        <Text style={[styles.error, { color: theme.colors.textSecondary }]}>
          {error.message}
        </Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Try Again"
            onPress={resetError}
            color={theme.colors.primary}
          />
        </View>
        {process.env.NODE_ENV === 'development' && (
          <View style={styles.stackTrace}>
            <Text style={[styles.stackTraceTitle, { color: theme.colors.text }]}>
              Stack Trace:
            </Text>
            <Text style={[styles.stackTraceText, { color: theme.colors.textSecondary }]}>
              {error.stack}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    // Reset the error state
    this.setState({ hasError: false, error: null });
    
    // Call the onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { hasError, error } = this.state;
    const { children, FallbackComponent = DefaultErrorFallback } = this.props;

    if (hasError && error) {
      // Render the fallback UI
      return <FallbackComponent error={error} resetError={this.resetError} />;
    }

    // Normally, just render children
    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%',
    maxWidth: 200,
  },
  stackTrace: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 5,
    width: '100%',
  },
  stackTraceTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stackTraceText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
});

export default ErrorBoundary;
