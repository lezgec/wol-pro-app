import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Device } from './mobileApi';

type Props = { device: Device | 'new'; busy: boolean; error: string | null; onClose: () => void; onSave: (name: string, mac: string) => void };
export function DeviceEditor({ device, busy, error, onClose, onSave }: Props) {
  const [name, setName] = useState(device === 'new' ? '' : device.name);
  const [mac, setMac] = useState(device === 'new' ? '' : device.mac);
  const [validation, setValidation] = useState<string | null>(null);
  const existingOther = device !== 'new' && device.wake_method !== 'alexa';
  const save = () => {
    if (!name.trim() || name.trim().length > 100) { setValidation('Escribe un nombre de entre 1 y 100 caracteres.'); return; }
    if (!/^[0-9a-f]{12}$/i.test(mac.trim().replace(/[:-]/g, ''))) { setValidation('Introduce una MAC válida, como AA:BB:CC:DD:EE:FF.'); return; }
    setValidation(null); onSave(name.trim(), mac.trim());
  };
  return <Modal animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><Text style={styles.headerText}>{device === 'new' ? 'Nuevo dispositivo' : 'Editar dispositivo'}</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onClose}><Text style={styles.link}>Cerrar</Text></Pressable></View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.heading}>{device === 'new' ? 'Dale un nombre.\nConéctalo a Alexa.' : 'Actualiza tu\ndispositivo.'}</Text>
          <Text style={styles.secondary}>{device === 'new' ? 'Usa un nombre fácil de pronunciar, como «Escritorio».' : 'Revisa el nombre y la dirección MAC de tu equipo.'}</Text>
          <View style={styles.field}><Text style={styles.label}>Nombre del dispositivo</Text><TextInput accessibilityLabel="Nombre del dispositivo" editable={!busy} value={name} onChangeText={setName} maxLength={100} placeholder="PC Escritorio" placeholderTextColor="#64748b" style={styles.input} /></View>
          <View style={styles.field}><Text style={styles.label}>Dirección MAC</Text><TextInput accessibilityLabel="Dirección MAC" editable={!busy} value={mac} onChangeText={setMac} autoCapitalize="characters" autoCorrect={false} maxLength={17} placeholder="AA:BB:CC:DD:EE:FF" placeholderTextColor="#64748b" style={styles.input} /><Text style={styles.secondary}>La encontrarás en la configuración de red de tu equipo.</Text></View>
          <Text style={styles.label}>Método de encendido</Text>
          <View style={[styles.method, !existingOther && styles.selected]}><View style={styles.row}><Text style={styles.label}>Alexa</Text><Text style={styles.tag}>{existingOther ? 'Disponible para nuevos equipos' : 'Seleccionado'}</Text></View><Text style={styles.secondary}>Enciende con tu voz o desde la app Alexa.</Text></View>
          <View accessibilityState={{ disabled: true }} style={styles.method}><View style={styles.row}><Text style={styles.muted}>Router por Internet</Text><Text style={styles.soon}>PRÓXIMAMENTE</Text></View><Text style={styles.secondary}>Estamos preparando el encendido directo desde la app.</Text></View>
          {existingOther && <Text style={styles.secondary}>Conservaremos el método actual de este dispositivo. Aquí puedes editar su nombre y MAC.</Text>}
          <View style={styles.tip}><Text style={styles.secondary}>Después de guardar, pide a Alexa que descubra dispositivos. Si cambias el nombre o la MAC, vuelve a descubrirlos.</Text></View>
          {(validation || error) && <Text accessibilityRole="alert" style={styles.error}>{validation || error}</Text>}
          <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={[styles.button, busy && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.buttonText}>{device === 'new' ? 'Agregar dispositivo' : 'Guardar cambios'}</Text>}</Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1220' }, flex: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerText: { color: '#f8fafc', fontWeight: '600', fontSize: 17 }, link: { color: '#22d3ee', padding: 8 },
  content: { padding: 24, gap: 20, paddingBottom: 40 }, heading: { color: '#f8fafc', fontSize: 30, fontWeight: '700', lineHeight: 38 }, secondary: { color: '#94a3b8', fontSize: 14, lineHeight: 22 },
  field: { gap: 10 }, label: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' }, input: { color: '#f8fafc', backgroundColor: '#162033', borderWidth: 1, borderColor: '#334155', borderRadius: 14, padding: 16, fontSize: 16 },
  method: { backgroundColor: '#162033', borderRadius: 16, padding: 18, gap: 10, borderWidth: 1, borderColor: '#263449' }, selected: { borderColor: '#22d3ee' }, row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, tag: { color: '#22d3ee', fontSize: 11 }, muted: { color: '#94a3b8', fontWeight: '600' }, soon: { color: '#cbd5e1', fontSize: 10, letterSpacing: 1 },
  tip: { padding: 16, backgroundColor: '#102738', borderRadius: 14 }, error: { color: '#fda4af', lineHeight: 21 },
  button: { backgroundColor: '#22d3ee', borderRadius: 14, padding: 18, alignItems: 'center' }, buttonText: { color: '#082f49', fontWeight: '700', fontSize: 16 },
});
