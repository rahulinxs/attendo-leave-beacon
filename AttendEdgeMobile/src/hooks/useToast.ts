import { useCallback } from 'react';
import { ToastAndroid, Platform } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const TOAST_DURATION = {
  SHORT: 2000,
  LONG: 3500,
} as const;

export const useToast = () => {
  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: 'SHORT' | 'LONG' = 'SHORT') => {
      if (Platform.OS === 'android') {
        ToastAndroid.showWithGravityAndOffset(
          message,
          TOAST_DURATION[duration],
          ToastAndroid.BOTTOM,
          0,
          100
        );
      } else {
        // For iOS, you might want to use a custom toast component or Alert
        console.log(`[${type.toUpperCase()}]: ${message}`);
      }
    },
    []
  );

  return {
    showSuccess: (message: string, duration?: 'SHORT' | 'LONG') =>
      showToast(message, 'success', duration),
    showError: (message: string, duration?: 'SHORT' | 'LONG') =>
      showToast(message, 'error', duration),
    showInfo: (message: string, duration?: 'SHORT' | 'LONG') =>
      showToast(message, 'info', duration),
    showWarning: (message: string, duration?: 'SHORT' | 'LONG') =>
      showToast(message, 'warning', duration),
  };
};

export default useToast;
