import { View, Text, StyleSheet, FlatList } from 'react-native';
import { theme } from '../../../../theme';

const TeamScreen = () => {
  // Sample team data
  const teamMembers = [
    { id: '1', name: 'John Doe', role: 'Team Lead' },
    { id: '2', name: 'Jane Smith', role: 'Developer' },
    { id: '3', name: 'Bob Johnson', role: 'Designer' },
    { id: '4', name: 'Alice Williams', role: 'QA Engineer' },
  ];

  const renderItem = ({ item }: { item: { id: string; name: string; role: string } }) => (
    <View style={styles.teamMemberCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberRole}>{item.role}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Members</Text>
      <FlatList
        data={teamMembers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

export default TeamScreen;
