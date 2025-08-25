import React, { forwardRef } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface FormFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  touched?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputContainerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  showError?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  onLeftIconPress?: () => void;
}

const FormField = forwardRef<TextInput, FormFieldProps>(({
  label,
  error,
  touched = false,
  icon,
  containerStyle,
  labelStyle,
  inputContainerStyle,
  inputStyle,
  errorStyle,
  showError = true,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onLeftIconPress,
  ...props
}, ref) => {
  const hasError = !!error && touched;
  const isFocused = props.value && props.value.length > 0;

  const renderIcon = (
    iconName: keyof typeof Ionicons.glyphMap,
    onPress?: () => void,
    position: 'left' | 'right' = 'left'
  ) => (
    <Ionicons
      name={iconName}
      size={20}
      color={hasError ? theme.colors.error : theme.colors.textSecondary}
      style={[
        styles.icon,
        position === 'left' ? styles.leftIcon : styles.rightIcon,
        onPress && styles.clickableIcon,
      ]}
      onPress={onPress}
    />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {props.required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        hasError && styles.inputContainerError,
        isFocused && styles.inputContainerFocused,
        inputContainerStyle,
      ]}>
        {leftIcon && renderIcon(leftIcon, onLeftIconPress, 'left')}
        
        <TextInput
          ref={ref}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholderTextColor={theme.colors.textSecondary + '80'}
          {...props}
        />
        
        {rightIcon && renderIcon(rightIcon, onRightIconPress, 'right')}
      </View>
      
      {showError && hasError && (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  required: {
    color: theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    padding: theme.spacing.m,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  inputWithLeftIcon: {
    paddingLeft: theme.spacing.s,
  },
  inputWithRightIcon: {
    paddingRight: theme.spacing.s,
  },
  icon: {
    marginHorizontal: theme.spacing.m,
  },
  leftIcon: {
    marginRight: 0,
  },
  rightIcon: {
    marginLeft: 0,
  },
  clickableIcon: {
    padding: theme.spacing.s,
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
});

export default FormField;
