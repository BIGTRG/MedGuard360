import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PatientsScreen } from '../screens/PatientsScreen';
import { CrisisScreen } from '../screens/CrisisScreen';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand[700] }}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Patients" component={PatientsScreen} options={{ headerShown: true, title: 'Patients', headerStyle: { backgroundColor: COLORS.brand[700] }, headerTintColor: COLORS.white }} />
            <Stack.Screen name="Crisis" component={CrisisScreen} options={{ headerShown: true, title: 'Crisis Response', headerStyle: { backgroundColor: COLORS.danger }, headerTintColor: COLORS.white }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
