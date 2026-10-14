import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tourSteps, type TourDestination } from './tourSteps';
type Props = { visible: boolean; index: number; onClose: () => void; onMove: (index: number) => void; onFinish: () => void; onDestination: (destination: TourDestination) => void };
export function AppTour({ visible, index, onClose, onMove, onFinish, onDestination }: Props) {
  const step = tourSteps[index];
  return <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}><SafeAreaView style={s.screen}>
    <View style={s.header}><Text style={s.eyebrow}>WOL PRO · PASO A PASO</Text><Pressable accessibilityRole="button" onPress={onClose} style={s.button}><Text style={s.link}>Cerrar</Text></Pressable></View>
    <ScrollView key={index} contentContainerStyle={s.content}>
      <Text accessibilityLiveRegion="polite" style={s.secondary}>Paso {index + 1} de {tourSteps.length}</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:tourSteps.length,now:index+1}} style={s.track}><View style={[s.progress,{width:`${(index+1)/tourSteps.length*100}%`}]} /></View>
      <Text accessibilityRole="header" style={s.title}>{step.title}</Text><Text style={s.body}>{step.text}</Text>
      <View style={s.example}><Text style={s.exampleText}>{step.example}</Text></View>
      <Text style={s.secondary}>Son ejemplos. El tour no registra equipos, ejecuta órdenes ni inicia compras.</Text>
      <Pressable accessibilityRole="button" onPress={() => {onClose();onDestination(step.destination);}} style={s.button}><Text style={s.link}>Ir a esta sección</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => onMove(0)} style={s.button}><Text style={s.link}>Volver al principio</Text></Pressable>
    </ScrollView>
    <View style={s.footer}><Pressable accessibilityRole="button" accessibilityState={{disabled:index===0}} disabled={index===0} onPress={() => onMove(index-1)} style={[s.button,index===0 && s.disabled]}><Text style={s.link}>Anterior</Text></Pressable><Pressable accessibilityRole="button" onPress={() => index===tourSteps.length-1 ? onFinish() : onMove(index+1)} style={[s.button,s.primary]}><Text style={s.primaryText}>{index===tourSteps.length-1 ? 'Terminar' : 'Siguiente'}</Text></Pressable></View>
  </SafeAreaView></Modal>;
}
const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#0b1220'}, header:{padding:20,flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12}, eyebrow:{color:'#22d3ee',fontSize:11,letterSpacing:1.5}, content:{padding:24,gap:22,flexGrow:1}, title:{color:'#f8fafc',fontSize:30,fontWeight:'700',lineHeight:38}, body:{color:'#cbd5e1',fontSize:17,lineHeight:28}, secondary:{color:'#94a3b8',fontSize:14,lineHeight:22}, example:{backgroundColor:'#162033',padding:20,borderRadius:16}, exampleText:{color:'#a5f3fc',fontSize:16,lineHeight:26}, track:{backgroundColor:'#263449',height:5,borderRadius:3}, progress:{backgroundColor:'#22d3ee',height:5,borderRadius:3}, footer:{padding:20,flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:12,borderTopColor:'#263449',borderTopWidth:1}, button:{padding:16,borderRadius:12}, primary:{backgroundColor:'#22d3ee'}, primaryText:{color:'#082f49',fontWeight:'700',fontSize:16}, link:{color:'#38bdf8',fontWeight:'600',fontSize:16}, disabled:{opacity:0.4},
});
