import { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const key = 'wolpro.biometric-lock.v1';
// Store only the lock preference. HttpOnly authentication cookies stay in WebView.
export function useBiometricLock() {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(true);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const authenticating = useRef(false);
  const backgrounded = useRef(false);
  const enabledRef = useRef(false);
  const load = async () => {
    try {
      const value = await SecureStore.getItemAsync(key);
      enabledRef.current = value === 'enabled';
      setEnabled(enabledRef.current);
      setLocked(enabledRef.current);
      setReady(true);
    } catch { Alert.alert('Acceso seguro', 'No pudimos leer la configuración de acceso. Reintenta para continuar.'); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (authenticating.current && state === 'background') backgrounded.current = true;
      if (state !== 'active' && enabledRef.current && !authenticating.current) setLocked(true);
    });
    return () => sub.remove();
  }, []);
  const authenticate = async () => {
    if (authenticating.current) return false;
    authenticating.current = true; backgrounded.current = false; setWorking(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquear WoL Pro', cancelLabel: 'Cancelar', fallbackLabel: 'Usar código del teléfono', biometricsSecurityLevel: 'strong' });
      return result.success && !backgrounded.current;
    } catch { Alert.alert('Acceso seguro', 'No pudimos verificar tu identidad. Inténtalo de nuevo.'); return false; }
    finally { authenticating.current = false; setWorking(false); }
  };
  const unlock = async () => { if (!ready) { await load(); return; } if (await authenticate()) setLocked(false); };
  const toggle = async () => {
    if (!enabled && !(await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync())) {
      Alert.alert('Biometría no disponible', 'Configura Face ID, huella u otra biometría compatible en los ajustes del teléfono.'); return;
    }
    if (!(await authenticate())) return;
    const next = !enabled;
    try {
      await SecureStore.setItemAsync(key, next ? 'enabled' : 'disabled');
      enabledRef.current = next; setEnabled(next); setLocked(false);
    } catch { Alert.alert('Acceso seguro', 'No pudimos guardar tu preferencia.'); }
  };
  return { enabled, locked, ready, working, unlock, toggle };
}
