import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EmployeeManagement() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Employee Management</Text>
      <Text>Employee management content will go here</Text>
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
