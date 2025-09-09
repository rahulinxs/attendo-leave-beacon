import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HolidayManagement() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Holiday Management</Text>
      <Text>Holiday management content will go here</Text>
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
