import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import EncounterScreen from './screens/EncounterScreen';
import BiometricScreen from './screens/BiometricScreen';
import PatientsScreen from './screens/PatientsScreen';
import PatientDetailScreen from './screens/PatientDetailScreen';
import AudioCaptureScreen from './screens/AudioCaptureScreen';
import ClaimsScreen from './screens/ClaimsScreen';
import SettingsScreen from './screens/SettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Biometric: undefined;
  Home: undefined;
  Encounter: { encounterId?: string };
  Patients: undefined;
  PatientDetail: { patientId: string };
  AudioCapture: { encounterId?: string };
  Claims: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: '#2168e3' },
            headerTintColor: 'white',
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen name="Login"          component={LoginScreen}         options={{ headerShown: false }} />
          <Stack.Screen name="Biometric"      component={BiometricScreen}     options={{ title: 'Verify identity' }} />
          <Stack.Screen name="Home"           component={HomeScreen}          options={{ title: 'MedGuard360' }} />
          <Stack.Screen name="Patients"       component={PatientsScreen}      options={{ title: 'Patients' }} />
          <Stack.Screen name="PatientDetail"  component={PatientDetailScreen} options={{ title: 'Patient' }} />
          <Stack.Screen name="Encounter"      component={EncounterScreen}     options={{ title: 'Encounter' }} />
          <Stack.Screen name="AudioCapture"   component={AudioCaptureScreen}  options={{ title: 'Dictation' }} />
          <Stack.Screen name="Claims"         component={ClaimsScreen}        options={{ title: 'Claims' }} />
          <Stack.Screen name="Settings"       component={SettingsScreen}      options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
