import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LeaveManagement() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave Management</Text>
      <Text>Leave management content will go here</Text>
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
