import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AccountPlan, ControlData, Device, MobileAction, Pc } from './mobileApi';

export const stateLabels = { ready: 'Control disponible', connected: 'PC conectado · inicia sesión en Windows', offline: 'Sin conexión', unlinked: 'Agente sin vincular' };
const statusLabels: Record<string, string> = { pending: 'Pendiente', claimed: 'Recibida por el agente', scheduled: 'Apagado en cuenta atrás', executed: 'Solicitud procesada', failed: 'Falló', cancelled: 'Cancelada', expired: 'Caducada', uncertain: 'Resultado sin confirmar' };
type Props = { plan?: AccountPlan; onPlan: () => void; devices: Device[]; data: ControlData | null; selected: number | null; onSelect: (id: number) => void; busy: boolean; refreshing: boolean; error: string | null; onRefresh: () => void; onRequest: (action: MobileAction) => void; onPair: (device: Device) => void };

function Button({ label, onPress, disabled = false, danger = false }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, danger && s.danger, disabled && s.disabled]}><Text style={s.buttonText}>{label}</Text></Pressable>;
}

export function ControlScreen({ plan, onPlan, devices, data, selected, onSelect, busy, refreshing, error, onRefresh, onRequest, onPair }: Props) {
  const [saving, setSaving] = useState<{ kind: 'launch' | 'shutdown'; appKey?: string } | null>(null);
  const [name, setName] = useState('');
  const device = devices.find(d => d.id === selected) || devices[0];
  const pc: Pc | undefined = data?.pcs.find(p => p.device_id === device?.id);
  const unavailable = busy || !!error || !data;
  const run = (kind: 'launch' | 'shutdown', appKey?: string, label?: string) => {
    if (!device) return;
    Alert.alert(kind === 'shutdown' ? `Apagar ${device.name}` : `Ejecutar ${label || 'acción'}`, kind === 'shutdown'
      ? 'Windows mostrará una cuenta atrás cancelable de 30 segundos.'
      : 'Se ejecutará lo autorizado en el agente Windows. Si es un comando personalizado, puede actuar inmediatamente y no permite cancelación una vez iniciado.', [
      { text: 'Volver', style: 'cancel' }, { text: 'Enviar orden', style: kind === 'shutdown' ? 'destructive' : 'default', onPress: () => {
        onRequest({ kind: 'run', deviceId: device.id, commandKind: kind, appKey, requestId: Crypto.randomUUID() });
      } },
    ]);
  };
  const save = (kind: 'launch' | 'shutdown', appKey?: string) => { setName(''); setSaving({ kind, appKey }); };
  return <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}>
    <Text style={s.eyebrow}>DESDE CUALQUIER LUGAR</Text><Text style={s.heading}>Control de PC</Text>
    <Text style={s.secondary}>Envía órdenes por Internet mediante Azure. Puedes usar datos móviles; el teléfono no necesita estar en la red de casa.</Text>
    <View style={s.choices}>{devices.map(d => <Pressable accessibilityRole="button" accessibilityState={{ selected: d.id === device?.id }} key={d.id} onPress={() => { setSaving(null); onSelect(d.id); }} style={[s.chip, d.id === device?.id && s.selected]}><Text style={s.text}>{d.name}</Text></Pressable>)}</View>
    {error && <View style={s.card}><Text style={s.warning}>{error}</Text><Button label="Reintentar" disabled={busy} onPress={onRefresh} /></View>}
    {!device ? <Text style={s.secondary}>Añade tu primer equipo en Dispositivos.</Text> : <>
      <View style={s.card}><Text style={s.title}>{device.name}</Text><Text style={pc?.online ? s.good : s.warning}>{data ? stateLabels[pc?.state || 'unlinked'] : 'Estado sin confirmar'}</Text>
        {pc?.last_seen ? <Text style={s.secondary}>Última comunicación: {new Date(pc.last_seen * 1000).toLocaleString()}</Text> : null}
        {!pc?.active ? <><Text style={s.secondary}>Instala el agente en Windows y pulsa Vincular cuenta. Introduce aquí el código que muestra el PC.</Text><Button label="Vincular agente Windows" disabled={unavailable} onPress={() => onPair(device)} /></>
          : <><Text style={s.secondary}>{pc.online ? 'El agente puede recibir órdenes en tu sesión de Windows.' : 'El control necesita Internet, una sesión de Windows abierta y el agente en ejecución. La presencia del PC no confirma que puedas abrir aplicaciones.'}</Text>
            <Button label="Desvincular agente" disabled={unavailable} danger onPress={() => Alert.alert('Desvincular PC', 'Se revocará el acceso del agente y del servicio de presencia.', [{ text: 'Volver', style: 'cancel' }, { text: 'Desvincular', style: 'destructive', onPress: () => onRequest({ kind: 'revoke', deviceId: device.id }) }])} /></>}
      </View>
      {pc?.active && <>
        <Text style={s.title}>Aplicaciones y comandos autorizados</Text>
        {!plan?.can_launch && <View style={s.card}><Text style={s.secondary}>Premium permite abrir aplicaciones y ejecutar comandos autorizados. Conservamos tu configuración.</Text><Button label="Ver Mi plan" onPress={onPlan} /></View>}
        {!pc.apps.length && <Text style={s.secondary}>Autoriza aplicaciones o comandos en Windows para que aparezcan aquí. Para reiniciar puedes autorizar un comando personalizado en el agente.</Text>}
        {pc.apps.map(app => <View key={app.app_key} style={s.card}><Text style={s.title}>{app.name}</Text><Button label="Ejecutar en PC" disabled={unavailable || !pc.online || !plan?.can_launch || !plan.active_devices.includes(device.id)} onPress={() => run('launch', app.app_key, app.name)} /><Button label="Guardar como acción" disabled={unavailable || !plan?.can_launch} onPress={() => save('launch', app.app_key)} /></View>)}
        <View style={s.card}><Text style={s.title}>Apagado protegido</Text><Text style={s.secondary}>{pc.allow_shutdown ? 'Cuenta atrás de 30 segundos, cancelable desde aquí o desde Windows.' : 'Activa Permitir apagado remoto en el agente Windows.'}</Text><Button label="Apagar PC" disabled={unavailable || !pc.online || !pc.allow_shutdown || !plan?.active_devices.includes(device.id)} danger onPress={() => run('shutdown')} />{pc.allow_shutdown && <Button label="Guardar acción de apagado" disabled={unavailable} onPress={() => save('shutdown')} />}</View>
        {saving && <View style={s.card}><Text style={s.title}>Nueva acción</Text><Text style={s.secondary}>El mismo nombre estará disponible en el panel y en la configuración de Alexa.</Text><TextInput accessibilityLabel="Nombre de la acción" placeholder="Por ejemplo, abrir Spotify" placeholderTextColor="#64748b" value={name} onChangeText={setName} maxLength={100} style={s.input} /><Button label="Guardar acción" disabled={unavailable || !name.trim()} onPress={() => { onRequest({ kind: 'saveAction', deviceId: device.id, name: name.trim(), commandKind: saving.kind, appKey: saving.appKey }); setSaving(null); }} /><Button label="Volver" onPress={() => setSaving(null)} /></View>}
        {!!pc.actions.length && <Text style={s.title}>Mis acciones</Text>}
        {pc.actions.map(action => <View key={action.id} style={s.card}><Text style={s.title}>{action.name}</Text><Button label="Enviar orden" disabled={unavailable || !pc.online || !plan?.active_devices.includes(device.id) || (action.kind === 'launch' && !plan.can_launch) || (action.kind === 'shutdown' ? !pc.allow_shutdown : !pc.apps.some(a => a.app_key === action.app_key))} onPress={() => run(action.kind, action.app_key || undefined, action.name)} /><Button label="Eliminar acción" disabled={unavailable} danger onPress={() => Alert.alert('Eliminar acción', `¿Eliminar «${action.name}» del panel y Alexa?`, [{ text: 'Volver', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => onRequest({ kind: 'deleteAction', actionId: action.id }) }])} /></View>)}
      </>}
      <Text style={s.title}>Actividad reciente</Text>
      {!pc?.commands.length && <Text style={s.secondary}>Todavía no hay órdenes para este equipo.</Text>}
      {pc?.commands.map(command => <View key={command.id} style={s.card}><Text style={s.text}>{command.kind === 'shutdown' ? 'Apagar PC' : pc.apps.find(a => a.app_key === command.app_key)?.name || 'Aplicación o comando'}</Text><Text style={s.good}>{statusLabels[command.status] || command.status}{command.cancel_requested && command.status !== 'cancelled' ? ' · Cancelación solicitada' : ''}</Text><Text style={s.secondary}>{new Date(command.created * 1000).toLocaleString()}</Text>{command.can_cancel && <Button label="Cancelar orden" disabled={busy} onPress={() => onRequest({ kind: 'cancel', commandId: command.id })} />}</View>)}
      <Text style={s.secondary}>Solicitud procesada confirma que el agente inició la acción; no confirma el resultado de un script. Un PC apagado requiere el método WoL configurado.</Text>
    </>}
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: 22, gap: 16, paddingBottom: 40 }, eyebrow: { color: '#22d3ee', fontSize: 11, letterSpacing: 2 }, heading: { color: '#f8fafc', fontSize: 30, fontWeight: '700' }, title: { color: '#f8fafc', fontSize: 18, fontWeight: '600' }, text: { color: '#e2e8f0', fontSize: 15 }, secondary: { color: '#94a3b8', fontSize: 14, lineHeight: 22 }, good: { color: '#67e8f9' }, warning: { color: '#fcd34d', lineHeight: 22 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { padding: 12, borderWidth: 1, borderColor: '#263449', borderRadius: 12 }, selected: { backgroundColor: '#164e63', borderColor: '#22d3ee' }, card: { backgroundColor: '#162033', borderWidth: 1, borderColor: '#263449', borderRadius: 18, padding: 18, gap: 12 }, button: { backgroundColor: '#164e63', padding: 14, borderRadius: 12, alignItems: 'center' }, buttonText: { color: '#e0f2fe', fontWeight: '600' }, danger: { backgroundColor: '#652334' }, disabled: { opacity: 0.4 }, input: { borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#f8fafc' },
});
