import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Keyboard,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface SearchBarProps extends TextInputProps {
  /**
   * Current search query
   */
  value: string;
  /**
   * Callback when the search query changes
   */
  onChangeText: (text: string) => void;
  /**
   * Placeholder text
   * @default 'Search...'
   */
  placeholder?: string;
  /**
   * Whether to show the cancel button
   * @default true
   */
  showCancel?: boolean;
  /**
   * Whether to show the search icon
   * @default true
   */
  showSearchIcon?: boolean;
  /**
   * Whether to show the clear button when there's text
   * @default true
   */
  showClearButton?: boolean;
  /**
   * Whether to animate the search bar when focused
   * @default true
   */
  animateOnFocus?: boolean;
  /**
   * Custom container style
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Custom input container style
   */
  inputContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Custom input style
   */
  inputStyle?: StyleProp<TextStyle>;
  /**
   * Custom cancel button style
   */
  cancelButtonStyle?: StyleProp<ViewStyle>;
  /**
   * Custom cancel button text style
   */
  cancelButtonTextStyle?: StyleProp<TextStyle>;
  /**
   * Custom icon color
   */
  iconColor?: string;
  /**
   * Custom icon size
   * @default 20
   */
  iconSize?: number;
  /**
   * Callback when the cancel button is pressed
   */
  onCancel?: () => void;
  /**
   * Callback when the search is submitted
   */
  onSubmit?: () => void;
  /**
   * Callback when the search bar is focused
   */
  onFocus?: () => void;
  /**
   * Callback when the search bar is blurred
   */
  onBlur?: () => void;
  /**
   * Test ID for testing
   */
  testID?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  showCancel = true,
  showSearchIcon = true,
  showClearButton = true,
  animateOnFocus = true,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  cancelButtonStyle,
  cancelButtonTextStyle,
  iconColor,
  iconSize = 20,
  onCancel,
  onSubmit,
  onFocus,
  onBlur,
  testID,
  ...rest
}) => {
  const { colors, spacing, borderRadius } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const cancelButtonWidth = useRef(new Animated.Value(0)).current;
  const searchIconOpacity = useRef(new Animated.Value(1)).current;
  const searchIconTranslateX = useRef(new Animated.Value(0)).current;
  const searchIconScale = useRef(new Animated.Value(1)).current;

  // Calculate the width of the cancel button
  const CANCEL_BUTTON_WIDTH = 70;

  // Animate the cancel button in/out
  useEffect(() => {
    if (!showCancel) return;

    const toValue = isFocused ? CANCEL_BUTTON_WIDTH : 0;
    
    Animated.parallel([
      Animated.timing(cancelButtonWidth, {
        toValue,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(searchIconOpacity, {
        toValue: isFocused ? 0 : 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(searchIconTranslateX, {
        toValue: isFocused ? -10 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(searchIconScale, {
        toValue: isFocused ? 0.9 : 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused, cancelButtonWidth, searchIconOpacity, searchIconTranslateX, searchIconScale, showCancel]);

  // Handle focus
  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus();
  };

  // Handle blur
  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur();
  };

  // Handle cancel button press
  const handleCancel = () => {
    // Clear the input
    if (onChangeText) {
      onChangeText('');
    }
    
    // Blur the input
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // Call the onCancel callback if provided
    if (onCancel) {
      onCancel();
    }
    
    // Dismiss the keyboard
    Keyboard.dismiss();
  };

  // Handle clear button press
  const handleClear = () => {
    if (onChangeText) {
      onChangeText('');
    }
    
    // Focus the input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
    
    // Dismiss the keyboard
    Keyboard.dismiss();
  };

  // Determine if we should show the clear button
  const shouldShowClearButton = showClearButton && value.length > 0;
  
  // Determine the icon color
  const iconColorFinal = iconColor || colors.textSecondary;

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      <View 
        style={[
          styles.inputContainer, 
          { 
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.lg,
            paddingHorizontal: spacing.md,
          },
          inputContainerStyle,
        ]}
      >
        {showSearchIcon && (
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                opacity: searchIconOpacity,
                transform: [
                  { translateX: searchIconTranslateX },
                  { scale: searchIconScale },
                ],
              },
            ]}
          >
            <Icon 
              name="magnify" 
              size={iconSize} 
              color={iconColorFinal} 
            />
          </Animated.View>
        )}
        
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { 
              color: colors.text,
              paddingLeft: showSearchIcon ? spacing.sm : 0,
              paddingRight: shouldShowClearButton ? spacing.xl : 0,
            },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          underlineColorAndroid="transparent"
          clearButtonMode="never"
          {...rest}
        />
        
        {shouldShowClearButton && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon 
              name="close-circle" 
              size={18} 
              color={colors.textTertiary} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {showCancel && (
        <Animated.View 
          style={[
            styles.cancelButtonContainer,
            { width: cancelButtonWidth },
          ]}
        >
          <TouchableOpacity 
            style={[styles.cancelButton, cancelButtonStyle]}
            onPress={handleCancel}
          >
            <Text 
              style={[
                styles.cancelButtonText, 
                { color: colors.primary },
                cancelButtonTextStyle,
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  iconContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    padding: 0,
    margin: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  cancelButtonContainer: {
    overflow: 'hidden',
  },
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SearchBar;
