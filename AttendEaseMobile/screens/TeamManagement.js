import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TeamManagement() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Management</Text>
      <Text>Team management content will go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
