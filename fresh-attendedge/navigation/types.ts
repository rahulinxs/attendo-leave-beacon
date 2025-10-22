// Define the parameter list for the root stack
export type RootStackParamList = {
  Auth: undefined;
  MainApp: undefined;
  // Add other screen params as needed
};

// Define the parameter list for the drawer navigator
export type DrawerParamList = {
  MainTabs: undefined;
  AttendanceManagement: undefined;
  LeaveManagement: undefined;
  Reports: undefined;
  RecruitmentReports: undefined;
  EmployeeManagement: undefined;
  TeamManagement: undefined;
  LeaveTypes: undefined;
  HolidayManagement: undefined;
  Settings: undefined;
};

// Define the parameter list for the bottom tabs
// This should match the screens in your MainTabs component
export type MainTabsParamList = {
  Home: undefined;
  Attendance: undefined;
  Leave: undefined;
  Profile: undefined;
};

// Combine all param lists for easy access
export type AllParamList = RootStackParamList & DrawerParamList & MainTabsParamList;

// This is a helper type to get the navigation prop type for any screen
export type ScreenProps<T extends keyof AllParamList> = {
  navigation: {
    navigate: (screen: T, params?: AllParamList[T]) => void;
    goBack: () => void;
    reset: (options: {
      index: number;
      routes: { name: keyof RootStackParamList }[];
    }) => void;
    dispatch: (action: any) => void;
  };
  route: {
    params: AllParamList[T];
  };
};
