import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
  Text,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import DateTimePickerModal from '@react-native-community/datetimepicker';
import { useTheme } from '../../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';

type DateTimePickerMode = 'date' | 'time' | 'datetime';
type DateTimeDisplayFormat = 'default' | 'short' | 'medium' | 'long' | 'full' | string;

export interface DateTimePickerProps {
  /**
   * The currently selected date
   */
  value: Date;
  /**
   * Callback when the date changes
   */
  onChange: (date: Date) => void;
  /**
   * The mode of the picker
   * @default 'date'
   */
  mode?: DateTimePickerMode;
  /**
   * The display format for the date/time
   * Can be a predefined format or a custom format string
   * @default 'medium'
   */
  displayFormat?: DateTimeDisplayFormat;
  /**
   * The minimum date that can be selected
   */
  minimumDate?: Date;
  /**
   * The maximum date that can be selected
   */
  maximumDate?: Date;
  /**
   * The interval at which minutes can be selected
   * @default 1
   */
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  /**
   * The locale to use for formatting
   * @default 'en-US'
   */
  locale?: string;
  /**
   * Whether the picker is disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * Placeholder text when no date is selected
   */
  placeholder?: string;
  /**
   * Label to display above the picker
   */
  label?: string;
  /**
   * Error message to display below the picker
   */
  error?: string;
  /**
   * Whether to show the icon
   * @default true
   */
  showIcon?: boolean;
  /**
   * Custom icon name (from MaterialCommunityIcons)
   */
  iconName?: string;
  /**
   * Custom container style
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Custom input container style
   */
  inputContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Custom text style
   */
  textStyle?: StyleProp<TextStyle>;
  /**
   * Custom placeholder text style
   */
  placeholderStyle?: StyleProp<TextStyle>;
  /**
   * Custom label style
   */
  labelStyle?: StyleProp<TextStyle>;
  /**
   * Custom error text style
   */
  errorStyle?: StyleProp<TextStyle>;
  /**
   * Test ID for testing
   */
  testID?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  mode = 'date',
  displayFormat = 'medium',
  minimumDate,
  maximumDate,
  minuteInterval = 1,
  locale = 'en-US',
  disabled = false,
  placeholder = 'Select date',
  label,
  error,
  showIcon = true,
  iconName,
  style,
  inputContainerStyle,
  textStyle,
  placeholderStyle,
  labelStyle,
  errorStyle,
  testID,
}) => {
  const { colors, spacing, borderRadius } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [internalDate, setInternalDate] = useState<Date>(value || new Date());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Update internal date when value prop changes
  useEffect(() => {
    if (value) {
      setInternalDate(value);
    }
  }, [value]);

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    // On Android, we need to dismiss the modal first
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    // If user cancels the picker, selectedDate will be undefined
    if (selectedDate === undefined) {
      return;
    }

    // Update the internal date
    setInternalDate(selectedDate);
    
    // Call the onChange callback
    if (onChange) {
      onChange(selectedDate);
    }

    // On iOS, we keep the picker open for time selection in datetime mode
    if (Platform.OS === 'ios' && mode === 'datetime' && event.type === 'set') {
      return;
    }

    // Close the picker
    if (Platform.OS === 'ios') {
      closePicker();
    }
  };

  // Show the picker with animation
  const showPickerWithAnimation = () => {
    if (disabled) return;
    
    setShowPicker(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  // Close the picker with animation
  const closePicker = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowPicker(false);
      }
    });
  };

  // Format the date based on the display format
  const formatDate = (date: Date): string => {
    if (!date) return '';
    
    // Use predefined formats
    const formatMap: Record<string, string> = {
      short: 'P',
      medium: 'PP',
      long: 'PPPP',
      full: 'PPPP',
      time: 'p',
      'date-time': 'PPpp',
    };

    // Use the provided format or look it up in the map
    const dateFormat = formatMap[displayFormat] || displayFormat;
    
    try {
      return format(date, dateFormat, { locale: require('date-fns/locale/en-US') });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toString();
    }
  };

  // Determine which icon to show based on the mode
  const getIconName = () => {
    if (iconName) return iconName;
    
    switch (mode) {
      case 'time':
        return 'clock-outline';
      case 'datetime':
        return 'calendar-clock';
      case 'date':
      default:
        return 'calendar-month-outline';
    }
  };

  // Render the picker based on the platform
  const renderPicker = () => {
    if (!showPicker) return null;

    // iOS uses a modal with a custom header
    if (Platform.OS === 'ios') {
      return (
        <Modal
          transparent
          animationType="fade"
          visible={showPicker}
          onRequestClose={closePicker}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closePicker}
          >
            <Animated.View 
              style={[
                styles.modalContent,
                { 
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                  backgroundColor: colors.background,
                  borderRadius: borderRadius.md,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closePicker}>
                  <Text style={[styles.modalButton, { color: colors.primary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {mode === 'time' ? 'Select Time' : mode === 'date' ? 'Select Date' : 'Select Date & Time'}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (onChange) {
                      onChange(internalDate);
                    }
                    closePicker();
                  }}
                >
                  <Text style={[styles.modalButton, { color: colors.primary }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePickerModal
                value={internalDate || new Date()}
                mode={mode}
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                minuteInterval={minuteInterval}
                locale={locale}
                themeVariant={colors.mode === 'dark' ? 'dark' : 'light'}
                style={styles.picker}
              />
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      );
    }

    // Android uses the native picker
    return (
      <DateTimePickerModal
        value={internalDate || new Date()}
        mode={mode}
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        minuteInterval={minuteInterval}
        locale={locale}
        style={styles.picker}
      />
    );
  };

  const hasValue = !!internalDate;
  const displayText = hasValue ? formatDate(internalDate) : '';
  const icon = getIconName();

  return (
    <View style={[styles.container, style]} testID={testID}>
      {label && (
        <Text 
          style={[
            styles.label, 
            { color: colors.textSecondary, marginBottom: spacing.xs },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            opacity: disabled ? 0.6 : 1,
          },
          inputContainerStyle,
        ]}
        onPress={showPickerWithAnimation}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.inputContent}>
          {hasValue ? (
            <Text 
              style={[
                styles.text, 
                { color: colors.text },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {displayText}
            </Text>
          ) : (
            <Text 
              style={[
                styles.placeholder, 
                { color: colors.textTertiary },
                placeholderStyle,
              ]}
              numberOfLines={1}
            >
              {placeholder}
            </Text>
          )}
          
          {showIcon && (
            <Icon 
              name={icon} 
              size={24} 
              color={colors.textSecondary} 
              style={styles.icon} 
            />
          )}
        </View>
      </TouchableOpacity>
      
      {error && (
        <Text 
          style={[
            styles.error, 
            { color: colors.error, marginTop: spacing.xs },
            errorStyle,
          ]}
        >
          {error}
        </Text>
      )}
      
      {renderPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  inputContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    flex: 1,
    fontSize: 16,
    textAlign: 'left',
  },
  placeholder: {
    flex: 1,
    fontSize: 16,
    textAlign: 'left',
  },
  icon: {
    marginLeft: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButton: {
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  picker: {
    width: '100%',
  },
});

export default DateTimePicker;
