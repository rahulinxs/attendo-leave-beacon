import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Switch, 
  Modal, 
  SafeAreaView, 
  RefreshControl, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Mock APP_NAME since branding module is missing
const APP_NAME = 'AttendEase';

// Define types for the profile data
interface FamilyMember {
  name: string;
  relation: string;
  dob?: string;
  [key: string]: any;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
  [key: string]: any;
}

interface UserProfile {
  name: string;
  email: string;
  hire_date?: string;
  position?: string;
  department?: string;
  employee_profile?: {
    [key: string]: any;
  };
  [key: string]: any;
}

// Mock the useDetailedProfile hook for now
const useDetailedProfile = () => {
  return {
    profileData: { profile: {} as UserProfile },
    loading: false,
    error: null as Error | null,
    fetchDetailedProfile: async () => {},
    updateBasicProfile: async (data: any) => {},
    updateEmployeeProfile: async (data: any) => {},
    updateFamilyMembers: async (data: any) => {},
    updateEmergencyContacts: async (data: any) => {}
  };
};

// Mock ScreenWrapper component
const ScreenWrapper = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flex: 1 }}>{children}</View>
);

interface ProfileScreenProps {
  navigation: any; // Consider importing NavigationProp from @react-navigation/native for proper typing
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { profileData, loading, error, fetchDetailedProfile, updateBasicProfile, updateEmployeeProfile, updateFamilyMembers, updateEmergencyContacts } = useDetailedProfile();
  
  // State for edit mode and form data
  const [editMode, setEditMode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState('');
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  
  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDetailedProfile();
    } catch (err) {
      console.error('Error refreshing profile:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDetailedProfile]);
  
  // Load profile data
  useEffect(() => {
    if (profileData?.profile) {
      setFormData({
        name: profileData.profile.name || '',
        email: profileData.profile.email || '',
      });
    }
  }, [profileData]);
  const [showFamilyModal, setShowFamilyModal] = useState(false);

  // Personal Info Form
  const [personalForm, setPersonalForm] = useState({
    name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    marital_status: '',
    marriage_anniversary: '',
  });

  // Contact Info Form
  const [contactForm, setContactForm] = useState({
    personal_email: '',
    phone_number: '',
    alternate_phone_number: '',
    current_address: '',
    permanent_address: '',
    house_type: '',
    residing_since: '',
    living_in_city_since: '',
    linkedin: '',
    facebook: '',
    twitter: '',
  });

  // Work Info Form
  const [workForm, setWorkForm] = useState({
    employee_code: '',
    date_of_joining: '',
    probation_period: 0,
    employee_type: '',
    work_location: '',
    probation_status: '',
    work_experience_years: 0,
    designation: '',
    job_title: '',
    department: '',
    sub_department: '',
    id_card_issued: false,
    visiting_card_issued: false,
  });

  // Family & Emergency Form
  const [familyForm, setFamilyForm] = useState({
    family_members: [] as FamilyMember[],
    emergency_contacts: [] as EmergencyContact[],
  });

  useEffect(() => {
    if (profileData?.profile) {
      const profile = profileData.profile;
      const empProfile = profile.employee_profile || {};
      
      setPersonalForm({
        name: profile.name || '',
        date_of_birth: empProfile.date_of_birth || '',
        gender: empProfile.gender || '',
        blood_group: empProfile.blood_group || '',
        marital_status: empProfile.marital_status || '',
        marriage_anniversary: empProfile.marriage_anniversary || '',
      });
      
      setContactForm({
        personal_email: empProfile.personal_email || profile.email || '',
        phone_number: empProfile.phone_number || '',
        alternate_phone_number: empProfile.alternate_phone_number || '',
        current_address: empProfile.current_address || '',
        permanent_address: empProfile.permanent_address || '',
        house_type: empProfile.house_type || '',
        residing_since: empProfile.residing_since || '',
        living_in_city_since: empProfile.living_in_city_since || '',
        linkedin: empProfile.social_profiles?.linkedin || '',
        facebook: empProfile.social_profiles?.facebook || '',
        twitter: empProfile.social_profiles?.twitter || '',
      });
      
      setWorkForm({
        employee_code: empProfile.employee_code || '',
        date_of_joining: empProfile.date_of_joining || profile.hire_date || '',
        probation_period: empProfile.probation_period || 0,
        employee_type: empProfile.employee_type || '',
        work_location: empProfile.work_location || '',
        probation_status: empProfile.probation_status || '',
        work_experience_years: empProfile.work_experience_years || 0,
        designation: empProfile.designation || profile.position || '',
        job_title: empProfile.job_title || profile.position || '',
        department: empProfile.department || profile.department || '',
        sub_department: empProfile.sub_department || '',
        id_card_issued: empProfile.id_card_issued || false,
        visiting_card_issued: empProfile.visiting_card_issued || false,
      });
      
      setFamilyForm({
        family_members: empProfile.family_members || [],
        emergency_contacts: empProfile.emergency_contacts || [],
      });
    }
  }, [profileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetailedProfile().finally(() => setRefreshing(false));
  }, [fetchDetailedProfile]);

  const savePersonalInfo = async () => {
    try {
      setSaveLoading(true);
      // Update basic profile
      await updateBasicProfile({
        name: personalForm.name,
      });
      // Update employee profile
      await updateEmployeeProfile({
        date_of_birth: personalForm.date_of_birth,
        gender: personalForm.gender,
        blood_group: personalForm.blood_group,
        marital_status: personalForm.marital_status,
        marriage_anniversary: personalForm.marriage_anniversary,
      });
      setShowPersonalModal(false);
      setShowSuccessMessage('Personal information updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update personal information');
    } finally {
      setSaveLoading(false);
    }
  };

  const saveContactInfo = async () => {
    try {
      setSaveLoading(true);
      await updateEmployeeProfile({
        personal_email: contactForm.personal_email,
        phone_number: contactForm.phone_number,
        alternate_phone_number: contactForm.alternate_phone_number,
        current_address: contactForm.current_address,
        permanent_address: contactForm.permanent_address,
        house_type: contactForm.house_type,
        residing_since: contactForm.residing_since,
        living_in_city_since: contactForm.living_in_city_since,
        social_profiles: {
          linkedin: contactForm.linkedin,
          facebook: contactForm.facebook,
          twitter: contactForm.twitter,
        },
      });
      setShowContactModal(false);
      setShowSuccessMessage('Contact information updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update contact information');
    } finally {
      setSaveLoading(false);
    }
  };

  const saveWorkInfo = async () => {
    try {
      setSaveLoading(true);
      // Update basic profile
      await updateBasicProfile({
        department: workForm.department,
        position: workForm.designation,
        hire_date: workForm.date_of_joining,
      });
      // Update employee profile
      await updateEmployeeProfile({
        employee_code: workForm.employee_code,
        date_of_joining: workForm.date_of_joining,
        probation_period: workForm.probation_period,
        employee_type: workForm.employee_type,
        work_location: workForm.work_location,
        probation_status: workForm.probation_status,
        work_experience_years: workForm.work_experience_years,
        designation: workForm.designation,
        job_title: workForm.job_title,
        sub_department: workForm.sub_department,
        id_card_issued: workForm.id_card_issued,
        visiting_card_issued: workForm.visiting_card_issued,
      });
      setShowWorkModal(false);
      setShowSuccessMessage('Work information updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update work information');
    } finally {
      setSaveLoading(false);
    }
  };

  const saveFamilyInfo = async () => {
    try {
      setSaveLoading(true);
      await updateEmployeeProfile({
        family_members: familyForm.family_members,
        emergency_contacts: familyForm.emergency_contacts,
      });
      setShowFamilyModal(false);
      setShowSuccessMessage('Family & emergency information updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update family information');
    } finally {
      setSaveLoading(false);
    }
  };

  const addFamilyMember = () => {
    setFamilyForm(prev => ({
      ...prev,
      family_members: [...prev.family_members, { name: '', relation: '', dob: '' } as FamilyMember]
    }));
  };

  const removeFamilyMember = (index: number) => {
    setFamilyForm(prev => ({
      ...prev,
      family_members: prev.family_members.filter((_, i) => i !== index)
    }));
  };

  const updateFamilyMember = (index: number, field: string, value: string) => {
    setFamilyForm(prev => ({
      ...prev,
      family_members: prev.family_members.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const addEmergencyContact = () => {
    setFamilyForm(prev => ({
      ...prev,
      emergency_contacts: [...prev.emergency_contacts, { name: '', phone: '', relation: '' } as EmergencyContact]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFamilyForm(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    setFamilyForm(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
    },
    logo: {
      marginBottom: 20,
      alignSelf: 'center',
      backgroundColor: '#f3f4f6',
      borderRadius: 60,
    },
    loadingText: {
      fontSize: 16,
      color: '#64748b',
      textAlign: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#ef4444',
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 16,
      color: '#ef4444',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ef4444',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontWeight: '600',
      marginLeft: 8,
      fontSize: 16,
    },
    header: {
      backgroundColor: '#fff',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    backButton: {
      marginRight: 16,
      padding: 4,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1e293b',
      marginLeft: 12,
    },
    subtitle: {
      fontSize: 16,
      color: '#64748b',
      textAlign: 'center',
    },
    scrollView: {
      flex: 1,
    },
    cardsContainer: {
      padding: 20,
      gap: 16,
    },
    profileCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
      borderWidth: 1,
      borderColor: '#f1f5f9',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1e293b',
      marginLeft: 12,
    },
    editButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: '#f8fafc',
    },
    cardContent: {
      gap: 8,
    },
    cardMainText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: 8,
    },
    cardDetails: {
      gap: 4,
    },
    cardDetailText: {
      fontSize: 14,
      color: '#64748b',
      lineHeight: 20,
    },
    successContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0fdf4',
      marginHorizontal: 20,
      marginVertical: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#bbf7d0',
    },
    successText: {
      color: '#10b981',
      fontWeight: '600',
      marginLeft: 8,
      fontSize: 16,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    saveText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#2563eb',
    },
    modalContent: {
      flex: 1,
      padding: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: '#374151',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: '#fff',
      color: '#1e293b',
    },
    disabledInput: {
      backgroundColor: '#f9fafb',
      color: '#9ca3af',
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1e293b',
      marginTop: 24,
      marginBottom: 16,
    },
    familyMemberCard: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },
    familyMemberHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    familyMemberTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1e293b',
    },
    addButton: {
      flexDirection: 'row',
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#2563eb',
      marginLeft: 8,
    },
    saveButton: {
      backgroundColor: '#4f46e5',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    editForm: {
      marginTop: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
      backgroundColor: '#f8fafc',
    },
    infoText: {
      fontSize: 16,
      color: '#1e293b',
      marginBottom: 8,
      lineHeight: 24,
    },
    infoLabel: {
      fontWeight: '600',
      color: '#475569',
    },
  };

  return (
    <ScreenWrapper>
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.title}>Profile</Text>
          </View>
        </SafeAreaView>
        
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4f46e5']}
              tintColor="#4f46e5"
            />
          }
        >
          <View style={styles.cardsContainer}>
            {/* Personal Info Card */}
            <View style={styles.profileCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Ionicons name="person" size={20} color="#4f46e5" />
                  <Text style={styles.cardTitle}>Personal Information</Text>
                </View>
                <TouchableOpacity onPress={() => setEditMode(prev => (prev === 'personal' ? null : 'personal'))}>
                  <Ionicons 
                    name={editMode === 'personal' ? 'close' : 'pencil'} 
                    size={20} 
                    color={editMode === 'personal' ? '#ef4444' : '#4f46e5'} 
                  />
                </TouchableOpacity>
              </View>
              
              {editMode === 'personal' ? (
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={formData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={savePersonalInfo}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.infoText}><Text style={styles.infoLabel}>Name:</Text> {profileData?.profile?.name || 'Not provided'}</Text>
                  <Text style={styles.infoText}><Text style={styles.infoLabel}>Email:</Text> {profileData?.profile?.email || 'Not provided'}</Text>
                </View>
              )}
            </View>

            {/* Add other cards for Contact Info, Work Info, Family Info, etc. */}
            
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

export default ProfileScreen;