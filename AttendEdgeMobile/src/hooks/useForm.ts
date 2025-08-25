import { useState, useCallback } from 'react';
import * as Yup from 'yup';

type FormErrors<T> = Partial<Record<keyof T, string>>;
type FormTouched<T> = Partial<Record<keyof T, boolean>>;

interface UseFormOptions<T> {
  initialValues: T;
  validationSchema: Yup.ObjectSchema<Partial<T>>;
  onSubmit: (values: T) => Promise<void> | void;
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
}: UseFormOptions<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user types
    if (errors[name as keyof T]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }, [errors]);

  // Handle blur events
  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  }, []);

  // Validate form
  const validateForm = useCallback(async (): Promise<boolean> => {
    try {
      await validationSchema.validate(values, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        const newErrors = err.inner.reduce<FormErrors<T>>((acc, curr) => {
          const path = curr.path as keyof T;
          if (path) {
            acc[path] = curr.message;
          }
          return acc;
        }, {} as FormErrors<T>);
        
        setErrors(newErrors);
        
        // Mark all fields with errors as touched
        const touchedFields = Object.keys(newErrors).reduce<FormTouched<T>>((acc, key) => {
          acc[key as keyof T] = true;
          return acc;
        }, {} as FormTouched<T>);
        
        setTouched(prev => ({
          ...prev,
          ...touchedFields,
        }));
      }
      return false;
    }
  }, [values, validationSchema]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, validateForm, values]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Set field value
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Set field touched
  const setFieldTouched = useCallback((name: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({
      ...prev,
      [name]: isTouched,
    }));
  }, []);

  // Set field error
  const setFieldError = useCallback((name: keyof T, error: string | undefined) => {
    setErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  // Get field props
  const getFieldProps = useCallback((name: keyof T) => ({
    value: values[name],
    onChangeText: (value: any) => handleChange(name, value),
    onBlur: () => handleBlur(name),
    error: errors[name],
    touched: !!touched[name],
  }), [errors, handleBlur, handleChange, touched, values]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    getFieldProps,
    setValues,
    setErrors,
    setTouched,
  };
};

export default useForm;
