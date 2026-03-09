import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function IndexRedirect() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // wait until auth state is known
    if (loading) return;

    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/signin');
    }
  }, [loading, user]);

  // render nothing while redirecting
  return <View />;
}