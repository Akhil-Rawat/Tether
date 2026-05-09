import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';

if (!(globalThis as { Buffer?: typeof Buffer }).Buffer) {
  (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

export default function App() {
  return (
    <>
      <AppNavigator />
      <StatusBar style="light" />
    </>
  );
}
