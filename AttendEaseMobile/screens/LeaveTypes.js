import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LeaveTypes() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave Types</Text>
      <Text>Leave types management will go here</Text>
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
