import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthAction, AuthPhase } from './nativeAuth';

type Props={phase:AuthPhase;busy:boolean;ready:boolean;message:string|null;onPhase:(phase:AuthPhase)=>void;onSubmit:(action:AuthAction)=>void};
const headings={login:'Bienvenido de nuevo.',register:'Crea tu cuenta.',verify:'Revisa tu correo.',forgot:'Recupera tu acceso.',reset:'Elige una nueva contraseña.'};
export function AuthScreen({phase,busy,ready,message,onPhase,onSubmit}:Props){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[code,setCode]=useState(''),[remember,setRemember]=useState(false),[show,setShow]=useState(false),[validation,setValidation]=useState<string|null>(null);
  const passwordInput=useRef<TextInput>(null);
  const confirmInput=useRef<TextInput>(null);
  const hasEmail=['login','register','forgot'].includes(phase),hasPassword=['login','register','reset'].includes(phase),hasCode=['verify','reset'].includes(phase),newPassword=['register','reset'].includes(phase);
  function change(next:AuthPhase){setPassword('');setConfirm('');setCode('');setShow(false);setValidation(null);onPhase(next);}
  function submit(){
    if(busy||!ready)return;
    const address=email.trim().toLowerCase();
    if(hasEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setValidation('Introduce un correo válido.');return;}
    if(hasPassword&&!password){setValidation('Introduce tu contraseña.');return;}
    if(newPassword&&password!==confirm){setValidation('Las contraseñas no coinciden.');return;}
    if(hasCode&&!/^[0-9]{6}$/.test(code)){setValidation('Introduce el código de seis dígitos.');return;}
    setValidation(null);
    if(phase==='login')onSubmit({kind:'login',email:address,password,remember});
    else if(phase==='register')onSubmit({kind:'register',email:address,password});
    else if(phase==='forgot')onSubmit({kind:'forgot',email:address});
    else if(phase==='verify')onSubmit({kind:'verify',code});
    else onSubmit({kind:'reset',code,password});
    setPassword('');setConfirm('');setShow(false);
  }
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
    <Text style={s.eyebrow}>TU CUENTA WOL PRO</Text><Text accessibilityRole="header" style={s.heading}>{headings[phase]}</Text>
    <Text style={s.secondary}>{phase==='login'?'Entra para gestionar tus equipos, Alexa y el Control de PC.':phase==='verify'?'Introduce el código que enviamos a tu correo. Caduca en diez minutos.':phase==='forgot'?'Te enviaremos un código para recuperar tu cuenta.':newPassword?'Usa al menos ocho caracteres, una mayúscula, un número y un símbolo.':'Introduce el código del correo y tu nueva contraseña.'}</Text>
    <View style={s.card}>
      {hasEmail&&<View style={s.field}><Text style={s.label}>Correo electrónico</Text><TextInput value={email} onChangeText={setEmail} editable={!busy} maxLength={150} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="username" returnKeyType={hasPassword?'next':'done'} onSubmitEditing={()=>hasPassword?passwordInput.current?.focus():submit()} accessibilityLabel="Correo electrónico" placeholder="tu@correo.com" placeholderTextColor="#64748b" style={s.input}/></View>}
      {hasCode&&<View style={s.field}><Text style={s.label}>Código del correo</Text><TextInput value={code} onChangeText={text=>setCode(text.replace(/[^0-9]/g,''))} editable={!busy} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" accessibilityLabel="Código de seis dígitos" placeholder="000000" placeholderTextColor="#64748b" style={s.input}/></View>}
      {hasPassword&&<View style={s.field}><Text style={s.label}>{newPassword?'Nueva contraseña':'Contraseña'}</Text><TextInput ref={passwordInput} value={password} onChangeText={setPassword} editable={!busy} maxLength={1024} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete={newPassword?'new-password':'current-password'} textContentType={newPassword?'newPassword':'password'} returnKeyType={newPassword?'next':'done'} onSubmitEditing={()=>newPassword?confirmInput.current?.focus():submit()} accessibilityLabel={newPassword?'Nueva contraseña':'Contraseña'} placeholder="Tu contraseña" placeholderTextColor="#64748b" style={s.input}/><Pressable accessibilityRole="button" accessibilityLabel={show?'Ocultar contraseña':'Mostrar contraseña'} disabled={busy} onPress={()=>setShow(value=>!value)}><Text style={s.link}>{show?'Ocultar':'Mostrar'} contraseña</Text></Pressable></View>}
      {newPassword&&<View style={s.field}><Text style={s.label}>Repite la contraseña</Text><TextInput ref={confirmInput} value={confirm} onChangeText={setConfirm} editable={!busy} maxLength={1024} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={submit} accessibilityLabel="Repite la contraseña" style={s.input}/></View>}
      {phase==='login'&&<Pressable accessibilityRole="checkbox" accessibilityState={{checked:remember,disabled:busy}} disabled={busy} onPress={()=>setRemember(value=>!value)} style={s.row}><Text style={s.check}>{remember?'☑':'☐'}</Text><Text style={[s.secondary,{flex:1}]}>Conservar sesión durante 30 días</Text></Pressable>}
      {(validation||message)&&<Text accessibilityLiveRegion="polite" style={s.notice}>{validation||message}</Text>}
      <Pressable accessibilityRole="button" disabled={busy||!ready} onPress={submit} style={[s.primary,(busy||!ready)&&s.disabled]}>{busy?<ActivityIndicator color="#082f49"/>:<Text style={s.primaryText}>{!ready?'Conectando…':phase==='login'?'Iniciar sesión':phase==='register'?'Crear cuenta':phase==='verify'?'Verificar correo':phase==='forgot'?'Enviar código':'Actualizar contraseña'}</Text>}</Pressable>
      {phase==='verify'&&<Pressable accessibilityRole="button" disabled={busy||!ready} onPress={()=>onSubmit({kind:'resend'})} style={s.secondaryButton}><Text style={s.link}>Enviar otro código</Text></Pressable>}
    </View>
    {phase==='login'?<><Pressable accessibilityRole="button" disabled={busy} onPress={()=>change('forgot')} style={s.secondaryButton}><Text style={s.link}>¿Olvidaste tu contraseña?</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={()=>change('register')} style={s.secondaryButton}><Text style={s.link}>Crear una cuenta</Text></Pressable></>:<Pressable accessibilityRole="button" disabled={busy} onPress={()=>change('login')} style={s.secondaryButton}><Text style={s.link}>Volver a iniciar sesión</Text></Pressable>}
    {phase==='reset'&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>change('forgot')} style={s.secondaryButton}><Text style={s.link}>Solicitar otro código</Text></Pressable>}
  </ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#0b1220'},content:{padding:24,gap:14,flexGrow:1,justifyContent:'center',maxWidth:560,width:'100%',alignSelf:'center'},eyebrow:{color:'#22d3ee',fontSize:11,letterSpacing:2},heading:{color:'#f8fafc',fontWeight:'700',fontSize:32,lineHeight:40},secondary:{color:'#94a3b8',fontSize:14,lineHeight:22},card:{padding:22,backgroundColor:'#162033',borderRadius:20,gap:20,borderColor:'#263449',borderWidth:1,marginTop:10},field:{gap:10},label:{color:'#e2e8f0',fontSize:14,fontWeight:'600'},input:{backgroundColor:'#0b1220',borderColor:'#334155',borderWidth:1,borderRadius:12,color:'#f8fafc',padding:16,fontSize:16},row:{flexDirection:'row',alignItems:'center',gap:12},check:{color:'#22d3ee',fontSize:24},link:{color:'#38bdf8',fontSize:14,fontWeight:'600'},primary:{backgroundColor:'#22d3ee',padding:17,borderRadius:12,alignItems:'center'},primaryText:{color:'#082f49',fontWeight:'700',fontSize:16},disabled:{opacity:0.5},secondaryButton:{padding:12,alignItems:'center'},notice:{color:'#f0c775',fontSize:14,lineHeight:22}});
