import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button, Card, useTheme, Avatar, Divider, ActivityIndicator, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

// Types
import { RootStackParamList } from '@navigation/AppNavigator';
import { User } from '@types/user';

// Utils
import { showToast } from '@utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const ProfileScreen = ({ navigation, route }: Props) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  
  // Mock user data - replace with actual user data from your state/context
  const [user, setUser] = useState<User>({
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    position: 'Software Engineer',
    department: 'Engineering',
    joinDate: new Date('2022-01-15'),
    avatar: null,
  });

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable camera roll permissions to upload a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        // In a real app, you would upload the image to your server here
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable camera permissions to take a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        // In a real app, you would upload the image to your server here
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showToast('error', 'Failed to take photo');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: Implement save profile API call
      // await apiService.updateProfile(updatedUser);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEditing(false);
      showToast('success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement logout logic
            // navigation.reset({
            //   index: 0,
            //   routes: [{ name: 'Login' }],
            // });
            showToast('success', 'Logged out successfully');
          } 
        },
      ]
    );
  };

  const renderAvatar = () => {
    const avatarSource = image || user.avatar;
    
    return (
      <View style={styles.avatarContainer}>
        {avatarSource ? (
          <Image 
            source={{ uri: avatarSource }} 
            style={styles.avatarImage}
          />
        ) : (
          <Avatar.Text 
            size={120} 
            label={user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            style={styles.avatarText}
            labelStyle={styles.avatarLabel}
          />
        )}
        
        {editing && (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button 
                mode="contained-tonal" 
                onPress={() => setMenuVisible(true)}
                style={styles.avatarButton}
                icon="camera"
              >
                Edit
              </Button>
            }
          >
            <Menu.Item 
              onPress={() => {
                setMenuVisible(false);
                pickImage();
              }} 
              title="Choose from gallery" 
              leadingIcon="image"
            />
            <Divider />
            <Menu.Item 
              onPress={() => {
                setMenuVisible(false);
                takePhoto();
              }} 
              title="Take photo" 
              leadingIcon="camera"
            />
            {avatarSource && (
              <>
                <Divider />
                <Menu.Item 
                  onPress={() => {
                    setMenuVisible(false);
                    setImage(null);
                  }} 
                  title="Remove photo" 
                  leadingIcon="delete"
                  titleStyle={{ color: colors.error }}
                />
              </>
            )}
          </Menu>
        )}
      </View>
    );
  };

  const renderField = (label: string, value: string, key: string) => (
    <View style={styles.fieldContainer} key={key}>
      <Text variant="labelMedium" style={styles.fieldLabel}>
        {label}
      </Text>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={(text) => setUser({ ...user, [key]: text })}
          mode="outlined"
          style={styles.input}
        />
      ) : (
        <Text variant="bodyLarge" style={styles.fieldValue}>
          {value || 'Not provided'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerText}>
            My Profile
          </Text>
          
          {!editing ? (
            <Button 
              mode="outlined" 
              onPress={() => setEditing(true)}
              icon="pencil"
            >
              Edit
            </Button>
          ) : (
            <View style={styles.editActions}>
              <Button 
                mode="text" 
                onPress={() => {
                  setEditing(false);
                  setImage(null);
                }}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSave}
                loading={saving}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </View>
          )}
        </View>

        <Card style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <Card.Content style={styles.profileContent}>
            {renderAvatar()}
            
            <View style={styles.detailsContainer}>
              {editing ? (
                <TextInput
                  value={user.name}
                  onChangeText={(text) => setUser({ ...user, name: text })}
                  mode="outlined"
                  style={[styles.nameInput, { backgroundColor: colors.surface }]}
                  textColor={colors.onSurface}
                />
              ) : (
                <Text variant="headlineSmall" style={styles.nameText}>
                  {user.name}
                </Text>
              )}
              
              <Text variant="bodyMedium" style={[styles.positionText, { color: colors.onSurfaceVariant }]}>
                {user.position}
              </Text>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons 
                    name="briefcase" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text variant="bodySmall" style={styles.statText}>
                    {user.department}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <MaterialCommunityIcons 
                    name="calendar" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text variant="bodySmall" style={styles.statText}>
                    Joined {user.joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Contact Information
            </Text>
            
            {renderField('Email', user.email, 'email')}
            <Divider style={styles.divider} />
            
            {renderField('Phone', user.phone, 'phone')}
            <Divider style={styles.divider} />
            
            <View style={styles.fieldContainer}>
              <Text variant="labelMedium" style={styles.fieldLabel}>
                Password
              </Text>
              <Button 
                mode="text" 
                onPress={() => navigation.navigate('ChangePassword')}
                style={styles.changePasswordButton}
                textColor={colors.primary}
              >
                Change Password
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Preferences
            </Text>
            
            <View style={styles.preferenceItem}>
              <Text variant="bodyLarge">Dark Mode</Text>
              {/* Add theme toggle here */}
            </View>
            <Divider style={styles.divider} />
            
            <View style={styles.preferenceItem}>
              <Text variant="bodyLarge">Notification Settings</Text>
              <Button 
                mode="text" 
                onPress={() => navigation.navigate('NotificationSettings')}
                textColor={colors.primary}
              >
                Configure
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Button 
          mode="outlined" 
          onPress={handleLogout}
          icon="logout"
          style={[styles.logoutButton, { borderColor: colors.error }]}
          textColor={colors.error}
        >
          Logout
        </Button>

        <Text variant="bodySmall" style={[styles.versionText, { color: colors.onSurfaceVariant }]}>
          App Version 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontWeight: 'bold',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 8,
  },
  profileCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  profileContent: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  avatarText: {
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  avatarLabel: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  avatarButton: {
    borderRadius: 20,
  },
  detailsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nameInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nameText: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  positionText: {
    textAlign: 'center',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  statText: {
    marginLeft: 4,
  },
  infoCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 4,
    opacity: 0.7,
  },
  fieldValue: {
    marginTop: 4,
  },
  input: {
    backgroundColor: 'transparent',
  },
  changePasswordButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 8,
  },
  logoutButton: {
    marginTop: 8,
    borderWidth: 1,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.6,
  },
});

export default ProfileScreen;
