import { useEffect } from 'react';
import { router } from 'expo-router';

export default function SignupRedirect() {
  useEffect(() => {
    router.replace('/(onboarding)/signup');
  }, []);
  return null;
}
