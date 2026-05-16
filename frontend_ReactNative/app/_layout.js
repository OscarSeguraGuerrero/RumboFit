import { Stack } from 'expo-router';
import { STRIPE_PUBLISHABLE_KEY } from '../config';
import StripeWrapper from '../components/StripeWrapper';

export default function Layout() {
  return (
    <StripeWrapper publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <Stack screenOptions={{ headerShown: false }} />
    </StripeWrapper>
  );
}