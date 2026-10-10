import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DevicesScreen } from './DevicesScreen';
import type { Device, DeviceList } from './mobileApi';
export type Tab = 'home' | 'devices' | 'control' | 'account';
type Props = { showPlan: boolean; planScreen: ReactNode; banner: ReactNode; onPlan: () => void; onAdPrivacy: () => void; data: DeviceList; tab: Tab; onTab: (tab: Tab) => void; busy: boolean; onRefresh: () => void; onAdd: () => void; onEdit: (device: Device) => void; onAlexa: (device?: Device) => void; onLogout: () => void; backend: string; controlScreen: ReactNode; onControl: (device: Device) => void; onDelete: (device: Device) => void; biometricEnabled: boolean; biometricBusy: boolean; onBiometric: () => void; onRemember: () => void };

function Icon({ kind, selected }: { kind: Tab; selected: boolean }) {
  const color = selected ? '#22d3ee' : '#64748b';
  return <View style={styles.iconBox}>
    {kind === 'control' ? <Text style={{ color, fontSize: 21, fontWeight: '700' }}>⌘</Text> : kind === 'home' ? <><View style={[styles.roof, { borderColor: color }]} /><View style={[styles.house, { borderColor: color }]} /></>
      : kind === 'devices' ? <><View style={[styles.monitor, { borderColor: color }]} /><View style={[styles.stand, { backgroundColor: color }]} /></>
      : <><View style={[styles.personHead, { borderColor: color }]} /><View style={[styles.personBody, { borderColor: color }]} /></>}
  </View>;
}
export function NativeShell({ showPlan, planScreen, banner, onPlan, onAdPrivacy, data, tab, onTab, busy, onRefresh, onAdd, onEdit, onAlexa, onLogout, backend, controlScreen, onControl, onDelete, biometricEnabled, biometricBusy, onBiometric, onRemember }: Props) {
  return <View style={styles.shell}>
    <>{banner}</>
    <View style={styles.body}>
      {showPlan ? planScreen : tab === 'control' ? controlScreen : tab === 'devices' ? <DevicesScreen data={data} busy={busy} wakingId={null} refreshing={busy} onRefresh={onRefresh} onWake={onAlexa} onAdd={onAdd} onEdit={onEdit} onControl={onControl} onDelete={onDelete} />
        : <ScrollView contentContainerStyle={styles.content}>
          {tab === 'home' ? <>
            <Text style={styles.eyebrow}>BIENVENIDO A WOL PRO</Text>
            <Text style={styles.heading}>Tu espacio.{ '\n' }Donde estés.</Text>
            <Text style={styles.secondary}>Controla tus equipos desde cualquier conexión a Internet.</Text>
            <View style={styles.hero}><Text style={styles.number}>{data.devices.length.toString().padStart(2, '0')}</Text><Text style={styles.heroLabel}>{data.devices.length === 1 ? 'dispositivo registrado' : 'dispositivos registrados'}</Text>
              <Pressable accessibilityRole="button" onPress={() => onTab('devices')} style={styles.heroLink}><Text style={styles.link}>Ver mis dispositivos →</Text></Pressable></View>
            <Pressable accessibilityRole="button" disabled={busy} onPress={onAdd} style={styles.primary}><Text style={styles.primaryText}>+ Agregar dispositivo</Text></Pressable>
            <View style={styles.card}><View style={styles.row}><Text style={styles.cardTitle}>Alexa</Text><Text style={styles.badge}>{data.alexa_ready ? 'CUENTA VINCULADA' : 'VINCULACIÓN PENDIENTE'}</Text></View><Text style={styles.secondary}>{data.alexa_ready ? 'Tu cuenta está vinculada. Descubre tus dispositivos desde la app Alexa.' : 'Vincula tu cuenta con la skill de WoL Pro desde la app Alexa.'}</Text>
              <Pressable accessibilityRole="button" onPress={() => onAlexa()}><Text style={styles.link}>Cómo funciona →</Text></Pressable></View>
            <Pressable accessibilityRole="button" onPress={() => onTab('control')} style={styles.card}><Text style={styles.cardTitle}>Control remoto de Windows</Text><Text style={styles.secondary}>Abre aplicaciones, ejecuta comandos autorizados y consulta el historial, incluso desde datos móviles.</Text><Text style={styles.link}>Ir a Control →</Text></Pressable>

          </> : <>
            <Text style={styles.eyebrow}>TU CUENTA</Text><Text style={styles.heading}>Todo en un lugar.</Text>
            <Pressable accessibilityRole="button" onPress={onPlan} style={styles.card}><Text style={styles.cardTitle}>Mi plan · {data.plan?.tier === 'premium' ? 'Premium' : 'Free'}</Text><Text style={styles.secondary}>Equipos activos, suscripción y pausas sin publicidad.</Text><Text style={styles.link}>Ver mi plan →</Text></Pressable>
            {data.plan?.ads.enabled && <Pressable accessibilityRole="button" onPress={onAdPrivacy} style={styles.option}><Text style={styles.optionText}>Opciones de privacidad publicitaria</Text></Pressable>}
            <View style={styles.card}><View style={styles.avatar}><Icon kind="account" selected /></View><Text style={styles.cardTitle}>{data.email || 'Cuenta WoL Pro'}</Text><Text style={styles.secondary}>Sesión iniciada</Text></View>
            <View style={styles.card}><Text style={styles.cardTitle}>Vinculación con Alexa</Text><Text style={styles.secondary}>{data.alexa_ready ? 'Cuenta vinculada con Alexa.' : 'Vincula la skill de WoL Pro desde la app Alexa.'}</Text><Pressable accessibilityRole="button" onPress={() => onAlexa()}><Text style={styles.link}>Ver instrucciones</Text></Pressable></View>
            <View style={styles.card}><Text style={styles.cardTitle}>Mantener sesión en este teléfono</Text><Text style={styles.secondary}>Conserva tu sesión hasta 30 días para entrar rápido. Cerrar sesión revoca este acceso. No guardamos tu contraseña.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={onRemember}><Text style={styles.link}>{data.remembered ? 'Dejar de conservar la sesión' : 'Mantener sesión 30 días'}</Text></Pressable></View>
            <View style={styles.card}><Text style={styles.cardTitle}>Acceso con biometría</Text><Text style={styles.secondary}>Desbloquea tu sesión con Face ID, huella o el código del teléfono. Activa Mantener sesión para conservarla al cerrar la app. Si caduca, deberás iniciar sesión otra vez.</Text><Pressable accessibilityRole="button" disabled={biometricBusy} onPress={onBiometric}><Text style={styles.link}>{biometricEnabled ? 'Desactivar bloqueo biométrico' : 'Activar acceso biométrico'}</Text></Pressable></View>
            <Pressable accessibilityRole="button" onPress={() => { void Linking.openURL(`${backend}/privacy`).catch(() => undefined); }} style={styles.option}><Text style={styles.optionText}>Política de privacidad</Text><Text style={styles.link}>↗</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { void Linking.openURL(`${backend}/terms`).catch(() => undefined); }} style={styles.option}><Text style={styles.optionText}>Términos de uso</Text><Text style={styles.link}>↗</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { void Linking.openURL(`${backend}/account-deletion`).catch(() => { Alert.alert('Eliminación de cuenta', 'No pudimos abrir la página. Visita wol.luiszamora.dev/account-deletion desde tu navegador.'); }); }} style={styles.option}><Text style={styles.optionText}>Solicitar eliminación de cuenta</Text><Text style={styles.link}>↗</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={onLogout} style={styles.logout}><Text style={styles.logoutText}>Cerrar sesión</Text></Pressable>
          </>}
        </ScrollView>}
    </View>
    <View style={styles.nav}>
      {([{ id: 'home', label: 'Inicio' }, { id: 'devices', label: 'Dispositivos' }, { id: 'control', label: 'Control' }, { id: 'account', label: 'Cuenta' }] as const).map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => onTab(item.id)} style={[styles.navItem, tab === item.id && styles.navSelected]}>
        <Icon kind={item.id} selected={tab === item.id} /><Text style={[styles.navLabel, tab === item.id && styles.navLabelSelected]}>{item.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0b1220' }, body: { flex: 1 }, content: { padding: 24, paddingBottom: 32, gap: 20 },
  eyebrow: { color: '#22d3ee', fontSize: 11, letterSpacing: 2 }, heading: { color: '#f8fafc', fontSize: 33, lineHeight: 42, fontWeight: '700' }, secondary: { color: '#94a3b8', fontSize: 14, lineHeight: 22 },
  hero: { backgroundColor: '#102c3c', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1e4f62', gap: 8 }, number: { color: '#67e8f9', fontSize: 56, fontWeight: '700' }, heroLabel: { color: '#cbd5e1', fontSize: 16 }, heroLink: { paddingTop: 14 },
  link: { color: '#22d3ee', fontSize: 14, fontWeight: '600' }, primary: { padding: 17, backgroundColor: '#22d3ee', borderRadius: 14, alignItems: 'center' }, primaryText: { color: '#082f49', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: '#162033', borderWidth: 1, borderColor: '#263449', borderRadius: 20, padding: 20, gap: 16 }, cardTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '600' }, row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, badge: { color: '#67e8f9', fontSize: 9, letterSpacing: 1 },
  soonCard: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#263449', gap: 12 },
  nav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#263449', backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 10, gap: 10 }, navItem: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8, borderRadius: 14 }, navSelected: { backgroundColor: '#102d3e' }, navLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' }, navLabelSelected: { color: '#22d3ee' },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#102d3e', borderRadius: 16 }, option: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#263449' }, optionText: { color: '#cbd5e1', fontSize: 15 }, logout: { borderWidth: 1, borderColor: '#7f1d1d', borderRadius: 14, padding: 17, alignItems: 'center' }, logoutText: { color: '#fda4af', fontWeight: '600' },
  iconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }, monitor: { width: 22, height: 15, borderWidth: 2, borderRadius: 3, position: 'absolute', top: 2 }, stand: { position: 'absolute', bottom: 2, width: 12, height: 2 }, personHead: { width: 8, height: 8, borderWidth: 2, borderRadius: 4, position: 'absolute', top: 1 }, personBody: { width: 19, height: 11, borderWidth: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10, position: 'absolute', bottom: 2 }, roof: { width: 15, height: 15, borderLeftWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }], position: 'absolute', top: 2 }, house: { width: 17, height: 13, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, position: 'absolute', bottom: 0 },
});
