import { useEffect } from 'react';
import { router } from 'expo-router';

export default function LoginRedirect() {
  useEffect(() => {
    router.replace('/(onboarding)/login');
  }, []);
  return null;
}
