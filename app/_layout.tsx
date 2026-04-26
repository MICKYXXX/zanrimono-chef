import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="recipe-detail" />
      <Stack.Screen name="kitchen-note" />
      <Stack.Screen name="cooking-complete" />
    </Stack>
  );
}
