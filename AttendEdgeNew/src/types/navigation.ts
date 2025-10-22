import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  Home: undefined;
  // Add other screens here
};

export type TabParamList = {
  Home: undefined;
  Attendance: undefined;
  Schedule: undefined;
  Profile: undefined;
};

export type RootTabParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  // Add other stack screens here
};
