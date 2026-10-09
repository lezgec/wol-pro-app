import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { Device, DeviceList } from './mobileApi';

type Props = {
  data: DeviceList; refreshing: boolean; busy: boolean; wakingId: number | null;
  onRefresh: () => void; onWake: (device: Device) => void; onManage: () => void;
};
const methods: Record<string, string> = { router: 'Router por Internet', alexa: 'Alexa', local: 'Red local del servidor' };

export function DevicesScreen({ data, refreshing, busy, wakingId, onRefresh, onWake, onManage }: Props) {
  return <View style={styles.screen}>
    <FlatList data={data.devices} keyExtractor={device => String(device.id)} contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
      ListHeaderComponent={<View style={styles.intro}>
        <Text style={styles.eyebrow}>TU PANEL DE ENERGÍA</Text>
        <Text style={styles.heading}>Mis equipos</Text>
        <Text style={styles.secondary}>{data.email}</Text>
        <Text style={styles.secondary}>{data.devices.length} {data.devices.length === 1 ? 'equipo registrado' : 'equipos registrados'}</Text>
      </View>}
      ListEmptyComponent={<View style={styles.card}><Text style={styles.name}>Agrega tu primer equipo</Text><Text style={styles.secondary}>Registra su nombre y dirección MAC desde Administrar equipos.</Text></View>}
      renderItem={({ item }) => <View style={styles.card}>
        <View style={styles.row}><View style={styles.icon}><Text style={styles.iconText}>⏻</Text></View><View style={styles.details}>
          <Text style={styles.name}>{item.name}</Text><Text style={styles.mac}>{item.mac}</Text>
        </View></View>
        <Text style={styles.method}>{methods[item.wake_method] || 'Revisar configuración'}</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => onWake(item)} style={[styles.button, busy && styles.disabled]}>
          {wakingId === item.id ? <ActivityIndicator color="#082f49" /> : <Text style={styles.buttonText}>{item.can_wake ? 'Encender equipo' : item.wake_method === 'alexa' ? 'Cómo encender con Alexa' : 'Ver instrucciones'}</Text>}
        </Pressable>
      </View>}
      ListFooterComponent={<View style={styles.footer}>
        <Text style={styles.secondary}>Enviar una orden no confirma que el equipo haya arrancado.</Text>
        <Pressable accessibilityRole="button" onPress={onManage} style={styles.manage}><Text style={styles.link}>Administrar equipos y cuenta</Text></Pressable>
      </View>} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1220' }, list: { padding: 20, gap: 16, flexGrow: 1 },
  intro: { gap: 8, marginBottom: 10 }, eyebrow: { color: '#22d3ee', fontSize: 11, letterSpacing: 2 },
  heading: { color: '#f1f5f9', fontSize: 30, fontWeight: '700' }, secondary: { color: '#94a3b8', fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#162033', padding: 20, borderRadius: 20, gap: 16, borderWidth: 1, borderColor: '#263449' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 }, details: { flex: 1, gap: 6 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#083344', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#22d3ee', fontSize: 28 }, name: { color: '#f8fafc', fontSize: 19, fontWeight: '600' },
  mac: { color: '#94a3b8', fontSize: 12, letterSpacing: 1 }, method: { color: '#a5f3fc', fontSize: 12 },
  button: { backgroundColor: '#22d3ee', padding: 15, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#082f49', fontWeight: '700' }, disabled: { opacity: 0.5 },
  footer: { gap: 16, paddingVertical: 12 }, manage: { paddingVertical: 14, alignItems: 'center' },
  link: { color: '#38bdf8', fontWeight: '600' },
});
