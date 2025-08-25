type ValidationRule<T = any> = {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: T) => boolean | string | Promise<boolean | string>;
  email?: boolean | string;
  match?: {
    value: RegExp;
    message: string;
  };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  custom?: (value: T) => boolean | string | Promise<boolean | string>;
};

type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

const defaultMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be at most ${max} characters`,
  min: (min: number) => `Must be at least ${min}`,
  max: (max: number) => `Must be at most ${max}`,
  pattern: 'Invalid format',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class Validator<T extends Record<string, any>> {
  private rules: Record<keyof T, ValidationRule>;

  constructor(rules: Record<keyof T, ValidationRule>) {
    this.rules = rules;
  }

  async validate(data: Partial<T>): Promise<ValidationResult> {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(this.rules) as [
      keyof T,
      ValidationRule
    ][]) {
      const value = data[field];
      const error = await this.validateField(field as string, value, rules);

      if (error) {
        errors[field as string] = error;
        isValid = false;
      }
    }

    return { isValid, errors };
  }

  private async validateField(
    field: string,
    value: any,
    rules: ValidationRule
  ): Promise<string | null> {
    // Handle required validation
    if (rules.required) {
      const message =
        typeof rules.required === 'string' ? rules.required : defaultMessages.required;

      if (value === undefined || value === null || value === '') {
        return message;
      }
    }

    // Skip further validation if value is empty (unless required)
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // Email validation
    if (rules.email) {
      const message =
        typeof rules.email === 'string' ? rules.email : defaultMessages.email;

      if (!emailRegex.test(String(value).toLowerCase())) {
        return message;
      }
    }

    // Min length validation
    if (rules.minLength !== undefined) {
      const minLength = this.getNumericValue(rules.minLength);
      const message =
        typeof rules.minLength === 'object'
          ? rules.minLength.message
          : defaultMessages.minLength(minLength);

      if (String(value).length < minLength) {
        return message;
      }
    }

    // Max length validation
    if (rules.maxLength !== undefined) {
      const maxLength = this.getNumericValue(rules.maxLength);
      const message =
        typeof rules.maxLength === 'object'
          ? rules.maxLength.message
          : defaultMessages.maxLength(maxLength);

      if (String(value).length > maxLength) {
        return message;
      }
    }

    // Pattern validation
    if (rules.pattern) {
      if (!rules.pattern.value.test(String(value))) {
        return rules.pattern.message;
      }
    }

    // Min value validation
    if (rules.min !== undefined) {
      const min = this.getNumericValue(rules.min);
      const message =
        typeof rules.min === 'object' ? rules.min.message : defaultMessages.min(min);

      if (Number(value) < min) {
        return message;
      }
    }

    // Max value validation
    if (rules.max !== undefined) {
      const max = this.getNumericValue(rules.max);
      const message =
        typeof rules.max === 'object' ? rules.max.message : defaultMessages.max(max);

      if (Number(value) > max) {
        return message;
      }
    }

    // Custom validation function
    if (rules.validate) {
      const result = await Promise.resolve(rules.validate(value));
      if (result !== true) {
        return typeof result === 'string' ? result : 'Invalid value';
      }
    }

    // Custom validation function (alias for validate)
    if (rules.custom) {
      const result = await Promise.resolve(rules.custom(value));
      if (result !== true) {
        return typeof result === 'string' ? result : 'Invalid value';
      }
    }

    return null;
  }

  private getNumericValue(
    value: number | { value: number; message: string }
  ): number {
    return typeof value === 'number' ? value : value.value;
  }
}

// Helper functions for common validation rules
const validation = {
  required: (message?: string): ValidationRule => ({
    required: message || true,
  }),
  email: (message?: string): ValidationRule => ({
    email: message || true,
  }),
  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: message ? { value: min, message } : min,
  }),
  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: message ? { value: max, message } : max,
  }),
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    pattern: { value: regex, message },
  }),
  min: (min: number, message?: string): ValidationRule => ({
    min: message ? { value: min, message } : min,
  }),
  max: (max: number, message?: string): ValidationRule => ({
    max: message ? { value: max, message } : max,
  }),
  custom: <T>(validator: (value: T) => boolean | string | Promise<boolean | string>): ValidationRule<T> => ({
    custom: validator,
  }),
  match: (fieldName: string, message?: string): ValidationRule => ({
    validate: (value, formValues) => {
      return value === formValues[fieldName] || (message || 'Values do not match');
    },
  }),
};

export { Validator, validation, type ValidationRule, type ValidationResult };

export const validateEmail = (email: string): boolean => {
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true };
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Simple phone number validation - adjust based on your requirements
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,3}[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,4}$/;
  return phoneRegex.test(phone);
};

export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateDate = (date: string | Date): boolean => {
  return !isNaN(new Date(date).getTime());
};

export const validateTime = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(time);
};

export const validateNumber = (value: string | number): boolean => {
  return !isNaN(Number(value));
};

export const validateInteger = (value: string | number): boolean => {
  return Number.isInteger(Number(value));
};

export const validatePositiveNumber = (value: string | number): boolean => {
  return !isNaN(Number(value)) && Number(value) > 0;
};

export const validateNonNegativeNumber = (value: string | number): boolean => {
  return !isNaN(Number(value)) && Number(value) >= 0;
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  return file.size <= maxSizeInMB * 1024 * 1024;
};

export const validateImageDimensions = async (
  file: File,
  options: { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number }
): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      const { width, height } = img;
      
      if (options.minWidth && width < options.minWidth) {
        resolve(false);
        return;
      }
      
      if (options.maxWidth && width > options.maxWidth) {
        resolve(false);
        return;
      }
      
      if (options.minHeight && height < options.minHeight) {
        resolve(false);
        return;
      }
      
      if (options.maxHeight && height > options.maxHeight) {
        resolve(false);
        return;
      }
      
      resolve(true);
    };
    
    img.onerror = () => {
      resolve(false);
    };
  });
};
