import * as Yup from 'yup';

export const loginValidationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export const signupValidationSchema = Yup.object().shape({
  fullName: Yup.string()
    .min(2, 'Name is too short')
    .max(50, 'Name is too long')
    .required('Full name is required'),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

export const resetPasswordValidationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
});

export const updateProfileValidationSchema = Yup.object().shape({
  fullName: Yup.string()
    .min(2, 'Name is too short')
    .max(50, 'Name is too long')
    .required('Full name is required'),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  phone: Yup.string()
    .matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
      'Please enter a valid phone number'
    ),
  position: Yup.string()
    .max(100, 'Position is too long'),
  department: Yup.string()
    .max(100, 'Department is too long'),
});

export const changePasswordValidationSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .notOneOf(
      [Yup.ref('currentPassword'), null],
      'New password must be different from current password'
    )
    .required('New password is required'),
  confirmNewPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
    .required('Please confirm your new password'),
});
