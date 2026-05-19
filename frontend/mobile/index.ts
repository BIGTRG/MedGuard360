import { registerRootComponent } from 'expo';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { View } from 'react-native';

function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

registerRootComponent(App);
