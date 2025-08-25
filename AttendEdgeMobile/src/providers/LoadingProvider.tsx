import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useTheme } from '../theme';
import { Text } from '../components/ui/Text';

type LoadingContextType = {
  /**
   * Show a loading indicator with the given message
   * @param message Optional message to display
   * @param options Additional options
   * @returns A unique ID for this loading instance that can be used to dismiss it
   */
  showLoading: (message?: string, options?: LoadingOptions) => string;
  
  /**
   * Hide the loading indicator with the given ID
   * If no ID is provided, all loading indicators will be hidden
   * @param id Optional ID of the loading indicator to hide
   */
  hideLoading: (id?: string) => void;
  
  /**
   * Check if a specific loading indicator is visible
   * @param id The ID of the loading indicator to check
   * @returns boolean indicating if the loading indicator is visible
   */
  isLoading: (id?: string) => boolean;
};

type LoadingOptions = {
  /**
   * Whether to show a semi-transparent overlay
   * @default true
   */
  overlay?: boolean;
  
  /**
   * Color of the loading indicator
   * @default theme.colors.primary
   */
  color?: string;
  
  /**
   * Size of the loading indicator
   * @default 'large' on iOS, 36 on Android
   */
  size?: 'small' | 'large' | number;
  
  /**
   * Custom styles for the container
   */
  containerStyle?: any;
  
  /**
   * Custom styles for the loading indicator
   */
  indicatorStyle?: any;
  
  /**
   * Custom styles for the message text
   */
  textStyle?: any;
  
  /**
   * Callback when the loading indicator is shown
   */
  onShow?: () => void;
  
  /**
   * Callback when the loading indicator is hidden
   */
  onHide?: () => void;
};

type LoadingItem = {
  id: string;
  message?: string;
  options: Required<LoadingOptions>;
};

const defaultOptions: Required<LoadingOptions> = {
  overlay: true,
  color: '', // Will use theme primary color by default
  size: Platform.OS === 'ios' ? 'large' : 36,
  containerStyle: {},
  indicatorStyle: {},
  textStyle: {},
  onShow: () => {},
  onHide: () => {},
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const [loadingItems, setLoadingItems] = useState<LoadingItem[]>([]);
  const spinValue = useRef(new Animated.Value(0));
  
  // Spin animation
  const spinAnimation = useRef<Animated.CompositeAnimation>();
  
  // Start spin animation
  const startSpin = useCallback(() => {
    spinValue.current.setValue(0);
    
    spinAnimation.current = Animated.loop(
      Animated.timing(spinValue.current, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    spinAnimation.current.start();
  }, []);
  
  // Stop spin animation
  const stopSpin = useCallback(() => {
    if (spinAnimation.current) {
      spinAnimation.current.stop();
    }
  }, []);
  
  // Show loading indicator
  const showLoading = useCallback<LoadingContextType['showLoading']>((message, options = {}) => {
    const id = Math.random().toString(36).substr(2, 9);
    const mergedOptions: Required<LoadingOptions> = {
      ...defaultOptions,
      ...options,
      color: options.color || theme.colors.primary,
    };
    
    setLoadingItems(prevItems => {
      // Start animation if this is the first loading item
      if (prevItems.length === 0) {
        startSpin();
      }
      
      const newItem: LoadingItem = {
        id,
        message,
        options: mergedOptions,
      };
      
      // Call onShow callback
      if (mergedOptions.onShow) {
        mergedOptions.onShow();
      }
      
      return [...prevItems, newItem];
    });
    
    return id;
  }, [startSpin, theme.colors.primary]);
  
  // Hide loading indicator
  const hideLoading = useCallback<LoadingContextType['hideLoading']>((id) => {
    setLoadingItems(prevItems => {
      // If no ID provided, clear all
      if (id === undefined) {
        // Call onHide for all items
        prevItems.forEach(item => {
          if (item.options.onHide) {
            item.options.onHide();
          }
        });
        
        // Stop animation
        stopSpin();
        
        return [];
      }
      
      // Find the item to remove
      const itemToRemove = prevItems.find(item => item.id === id);
      if (!itemToRemove) return prevItems;
      
      // Call onHide callback
      if (itemToRemove.options.onHide) {
        itemToRemove.options.onHide();
      }
      
      // Remove the item
      const newItems = prevItems.filter(item => item.id !== id);
      
      // Stop animation if no more items
      if (newItems.length === 0) {
        stopSpin();
      }
      
      return newItems;
    });
  }, [stopSpin]);
  
  // Check if loading
  const isLoading = useCallback<LoadingContextType['isLoading']>((id) => {
    if (id === undefined) {
      return loadingItems.length > 0;
    }
    return loadingItems.some(item => item.id === id);
  }, [loadingItems]);
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      stopSpin();
    };
  }, [stopSpin]);
  
  // Don't render anything if no loading items
  if (loadingItems.length === 0) {
    return (
      <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
        {children}
      </LoadingContext.Provider>
    );
  }
  
  // Get the top-most loading item (last in the array)
  const currentItem = loadingItems[loadingItems.length - 1];
  const { message, options } = currentItem;
  const {
    overlay,
    color,
    size,
    containerStyle,
    indicatorStyle,
    textStyle,
  } = options;
  
  // Calculate rotation for the spinner
  const spin = spinValue.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      {children}
      
      <View style={[styles.overlay, overlay && styles.overlayBackground]}>
        <View style={[styles.container, containerStyle]}>
          <Animated.View
            style={[
              styles.spinner,
              {
                borderTopColor: color,
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
                width: typeof size === 'number' ? size : size === 'large' ? 36 : 20,
                height: typeof size === 'number' ? size : size === 'large' ? 36 : 20,
                borderRadius: typeof size === 'number' ? size / 2 : size === 'large' ? 18 : 10,
                transform: [{ rotate: spin }],
              },
              indicatorStyle,
            ]}
          />
          
          {message && (
            <Text style={[styles.message, { color: theme.colors.text }, textStyle]}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 120,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  spinner: {
    borderWidth: 3,
    marginBottom: 10,
  },
  message: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default LoadingProvider;
