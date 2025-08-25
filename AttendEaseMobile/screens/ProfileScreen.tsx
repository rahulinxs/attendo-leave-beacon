import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
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
import { useDetailedProfile } from '../lib/useDetailedProfile';
import { APP_NAME } from '../branding';

const LOGO = require('../assets/attendedge-logo.png');

const ProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { profileData, loading, error, fetchDetailedProfile, updateBasicProfile, updateEmployeeProfile, updateFamilyMembers, updateEmergencyContacts } = useDetailedProfile();

  // Modal and editing states
  const [activeModal, setActiveModal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState('');
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
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
    family_members: [],
    emergency_contacts: [],
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
      family_members: [...prev.family_members, { name: '', relation: '', dob: '' }]
    }));
  };

  const removeFamilyMember = (index) => {
    setFamilyForm(prev => ({
      ...prev,
      family_members: prev.family_members.filter((_, i) => i !== index)
    }));
  };

  const updateFamilyMember = (index, field, value) => {
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
      emergency_contacts: [...prev.emergency_contacts, { name: '', phone: '', relation: '' }]
    }));
  };

  const removeEmergencyContact = (index) => {
    setFamilyForm(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  const updateEmergencyContact = (index, field, value) => {
    setFamilyForm(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="person-circle-outline" size={64} color="#2563eb" />
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Ionicons name="person-circle" size={32} color="#2563eb" />
          <Text style={styles.title}>My Profile</Text>
        </View>
        <Text style={styles.subtitle}>Manage your personal information</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Cards Grid */}
        <View style={styles.cardsContainer}>
          {/* Personal Info Card */}
          <View style={styles.profileCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="person" size={24} color="#2563eb" />
                <Text style={styles.cardTitle}>Personal Info</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => setActiveModal('personal')}
              >
                <Ionicons name="create-outline" size={20} color="#2563eb" />
              </TouchableOpacity>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardMainText}>
                {personalForm.name || 'No Name'}
              </Text>
              <View style={styles.cardDetails}>
                <Text style={styles.cardDetailText}>DOB: {personalForm.date_of_birth || '-'}</Text>
                <Text style={styles.cardDetailText}>Gender: {personalForm.gender || '-'}</Text>
                <Text style={styles.cardDetailText}>Blood: {personalForm.blood_group || '-'}</Text>
                <Text style={styles.cardDetailText}>Status: {personalForm.marital_status || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Contact Info Card */}
          <View style={styles.profileCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="call" size={24} color="#10b981" />
                <Text style={styles.cardTitle}>Contact Info</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => setActiveModal('contact')}
              >
                <Ionicons name="create-outline" size={20} color="#10b981" />
              </TouchableOpacity>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardMainText}>
                {contactForm.personal_email || 'No Email'}
              </Text>
              <View style={styles.cardDetails}>
                <Text style={styles.cardDetailText}>Phone: {contactForm.phone_number || '-'}</Text>
                <Text style={styles.cardDetailText}>Alt: {contactForm.alternate_phone_number || '-'}</Text>
                <Text style={styles.cardDetailText}>Address: {contactForm.current_address || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Work Info Card */}
          <View style={styles.profileCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="briefcase" size={24} color="#8b5cf6" />
                <Text style={styles.cardTitle}>Work Info</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => setActiveModal('work')}
              >
                <Ionicons name="create-outline" size={20} color="#8b5cf6" />
              </TouchableOpacity>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardMainText}>
                {workForm.designation || 'No Designation'}
              </Text>
              <View style={styles.cardDetails}>
                <Text style={styles.cardDetailText}>Code: {workForm.employee_code || '-'}</Text>
                <Text style={styles.cardDetailText}>Dept: {workForm.department || '-'}</Text>
                <Text style={styles.cardDetailText}>Job: {workForm.job_title || '-'}</Text>
                <Text style={styles.cardDetailText}>Location: {workForm.work_location || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Family & Emergency Card */}
          <View style={styles.profileCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="people" size={24} color="#f59e0b" />
                <Text style={styles.cardTitle}>Family & Emergency</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => setActiveModal('family')}
              >
                <Ionicons name="create-outline" size={20} color="#f59e0b" />
              </TouchableOpacity>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardMainText}>
                {familyForm.family_members.length} Family Members
              </Text>
              <View style={styles.cardDetails}>
                <Text style={styles.cardDetailText}>
                  Emergency Contacts: {familyForm.emergency_contacts.length}
                </Text>
                {familyForm.family_members.slice(0, 2).map((member, index) => (
                  <Text key={index} style={styles.cardDetailText}>
                    {member.name} ({member.relation})
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Success Message */}
        {showSuccessMessage ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.successText}>{showSuccessMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Personal Info Modal */}
      <Modal
        visible={activeModal === 'personal'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Personal Info</Text>
            <TouchableOpacity onPress={savePersonalInfo} disabled={saveLoading}>
              {saveLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={personalForm.name}
                editable={false}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                value={personalForm.date_of_birth}
                onChangeText={(text) => setPersonalForm(prev => ({ ...prev, date_of_birth: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <TextInput
                style={styles.input}
                value={personalForm.gender}
                onChangeText={(text) => setPersonalForm(prev => ({ ...prev, gender: text }))}
                placeholder="Male/Female/Other"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Blood Group</Text>
              <TextInput
                style={styles.input}
                value={personalForm.blood_group}
                onChangeText={(text) => setPersonalForm(prev => ({ ...prev, blood_group: text }))}
                placeholder="A+, B+, O+, etc."
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Marital Status</Text>
              <TextInput
                style={styles.input}
                value={personalForm.marital_status}
                onChangeText={(text) => setPersonalForm(prev => ({ ...prev, marital_status: text }))}
                placeholder="Single/Married/Divorced/Widowed"
              />
            </View>
            {personalForm.marital_status === 'Married' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Marriage Anniversary</Text>
                <TextInput
                  style={styles.input}
                  value={personalForm.marriage_anniversary}
                  onChangeText={(text) => setPersonalForm(prev => ({ ...prev, marriage_anniversary: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Contact Info Modal */}
      <Modal
        visible={activeModal === 'contact'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Contact Info</Text>
            <TouchableOpacity onPress={saveContactInfo} disabled={saveLoading}>
              {saveLoading ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Personal Email</Text>
              <TextInput
                style={styles.input}
                value={contactForm.personal_email}
                onChangeText={(text) => setContactForm(prev => ({ ...prev, personal_email: text }))}
                placeholder="your@email.com"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={contactForm.phone_number}
                onChangeText={(text) => setContactForm(prev => ({ ...prev, phone_number: text }))}
                placeholder="+1234567890"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alternate Phone</Text>
              <TextInput
                style={styles.input}
                value={contactForm.alternate_phone_number}
                onChangeText={(text) => setContactForm(prev => ({ ...prev, alternate_phone_number: text }))}
                placeholder="+1234567890"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={contactForm.current_address}
                onChangeText={(text) => setContactForm(prev => ({ ...prev, current_address: text }))}
                placeholder="Your current address"
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Permanent Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={contactForm.permanent_address}
                onChangeText={(text) => setContactForm(prev => ({ ...prev, permanent_address: text }))}
                placeholder="Your permanent address"
                multiline
                numberOfLines={3}
              />
            </View>
            <Text style={styles.sectionTitle}>Social Profiles</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>LinkedIn</Text>
              <TextInput
                style={styles.input}
                value={contactForm.social_linkedin}
                onChangeText={(text) => setContactForm(prev => ({ ...prev, social_linkedin: text }))}
                placeholder="LinkedIn profile URL"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Facebook</Text>
              <TextInput
                style={styles.input}
                value={contactForm.social_facebook}
                onChangeText={(text) => setContactForm(prev => ({ ...prev, social_facebook: text }))}
                placeholder="Facebook profile URL"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Twitter</Text>
              <TextInput
                style={styles.input}
                value={contactForm.social_twitter}
                onChangeText={(text) => setContactForm(prev => ({ ...prev, social_twitter: text }))}
                placeholder="Twitter profile URL"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Work Info Modal */}
      <Modal
        visible={activeModal === 'work'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Work Info</Text>
            <TouchableOpacity onPress={saveWorkInfo} disabled={saveLoading}>
              {saveLoading ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Employee Code</Text>
              <TextInput
                style={styles.input}
                value={workForm.employee_code}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, employee_code: text }))}
                placeholder="EMP001"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Joining</Text>
              <TextInput
                style={styles.input}
                value={workForm.date_of_joining}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, date_of_joining: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Employee Type</Text>
              <TextInput
                style={styles.input}
                value={workForm.employee_type}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, employee_type: text }))}
                placeholder="Full-time/Part-time/Contract"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Work Location</Text>
              <TextInput
                style={styles.input}
                value={workForm.work_location}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, work_location: text }))}
                placeholder="Office/Remote/Hybrid"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Designation</Text>
              <TextInput
                style={styles.input}
                value={workForm.designation}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, designation: text }))}
                placeholder="Senior Developer"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Job Title</Text>
              <TextInput
                style={styles.input}
                value={workForm.job_title}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, job_title: text }))}
                placeholder="Software Engineer"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Department</Text>
              <TextInput
                style={styles.input}
                value={workForm.department}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, department: text }))}
                placeholder="Engineering"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sub Department</Text>
              <TextInput
                style={styles.input}
                value={workForm.sub_department}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, sub_department: text }))}
                placeholder="Frontend Team"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Work Experience (Years)</Text>
              <TextInput
                style={styles.input}
                value={workForm.work_experience_years}
                onChangeText={(text) => setWorkForm(prev => ({ ...prev, work_experience_years: text }))}
                placeholder="5"
                keyboardType="numeric"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Family & Emergency Modal */}
      <Modal
        visible={activeModal === 'family'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Family & Emergency</Text>
            <TouchableOpacity onPress={saveFamilyInfo} disabled={saveLoading}>
              {saveLoading ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Family Members</Text>
            {familyForm.family_members.map((member, index) => (
              <View key={index} style={styles.familyMemberCard}>
                <View style={styles.familyMemberHeader}>
                  <Text style={styles.familyMemberTitle}>Member {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeFamilyMember(index)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={member.name}
                    onChangeText={(text) => updateFamilyMember(index, 'name', text)}
                    placeholder="Family member name"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Relation</Text>
                  <TextInput
                    style={styles.input}
                    value={member.relation}
                    onChangeText={(text) => updateFamilyMember(index, 'relation', text)}
                    placeholder="Father/Mother/Spouse/Child"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <TextInput
                    style={styles.input}
                    value={member.dob}
                    onChangeText={(text) => updateFamilyMember(index, 'dob', text)}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addFamilyMember}>
              <Ionicons name="add" size={20} color="#2563eb" />
              <Text style={styles.addButtonText}>Add Family Member</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            {familyForm.emergency_contacts.map((contact, index) => (
              <View key={index} style={styles.familyMemberCard}>
                <View style={styles.familyMemberHeader}>
                  <Text style={styles.familyMemberTitle}>Contact {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeEmergencyContact(index)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={contact.name}
                    onChangeText={(text) => updateEmergencyContact(index, 'name', text)}
                    placeholder="Contact name"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={contact.phone}
                    onChangeText={(text) => updateEmergencyContact(index, 'phone', text)}
                    placeholder="+1234567890"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Relation</Text>
                  <TextInput
                    style={styles.input}
                    value={contact.relation}
                    onChangeText={(text) => updateEmergencyContact(index, 'relation', text)}
                    placeholder="Friend/Colleague/Relative"
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addEmergencyContact}>
              <Ionicons name="add" size={20} color="#2563eb" />
              <Text style={styles.addButtonText}>Add Emergency Contact</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 8,
  },
});

export default ProfileScreen; 