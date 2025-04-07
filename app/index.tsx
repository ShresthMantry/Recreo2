import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is logged in, check if they have selected activities
        if (user.activities && user.activities.length > 0) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/select-activities');
        }
      } else {
        // User is not logged in
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, user, router]);

  // Show loading indicator while checking authentication state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // This will not be rendered as the useEffect will redirect
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});