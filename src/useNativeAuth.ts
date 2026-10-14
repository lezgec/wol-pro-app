import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import { authScript, parseAuthReply, type AuthAction, type AuthPhase } from './nativeAuth';

export function useNativeAuth(origin:string, bridge:RefObject<WebView|null>, allowed:()=>boolean, authenticated:(data:unknown)=>boolean){
  const [phase,setPhase]=useState<AuthPhase>('login'),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[message,setMessage]=useState<string|null>(null);
  const pending=useRef<{id:number;timer:ReturnType<typeof setTimeout>}|null>(null),sequence=useRef(0);
  useEffect(()=>()=>{if(pending.current)clearTimeout(pending.current.timer);pending.current=null;},[]);
  function cancel(){if(pending.current)clearTimeout(pending.current.timer);pending.current=null;setBusy(false);}
  function submit(action:AuthAction){
    if(!allowed()||!bridge.current||pending.current)return;
    const id=++sequence.current;setBusy(true);setMessage(null);
    const timer=setTimeout(()=>{if(pending.current?.id===id){cancel();setMessage('No pudimos confirmar el acceso. Comprueba tu conexión e inténtalo de nuevo.');}},15000);
    pending.current={id,timer};
    try { bridge.current.injectJavaScript(authScript(origin,id,action)); }
    catch { cancel();setMessage('No pudimos conectar. Reintenta la conexión para continuar.'); }
  }
  function receive(url:string,text:string){
    const reply=parseAuthReply(url,text,origin);
    if(!reply)return false;
    if(reply.id!==pending.current?.id)return true;
    cancel();
    if(!allowed())return true;
    if(reply.body.phase==='authenticated'&&reply.status===200){
      if(!authenticated(reply.body.data))setMessage('El servidor debe actualizarse para permitir el acceso desde esta versión de la app.');
      return true;
    }
    const next=reply.body.phase;
    if(next&&['login','register','verify','forgot','reset'].includes(next))setPhase(next as AuthPhase);
    setMessage(typeof reply.body.message==='string'?reply.body.message:reply.status===401?'Inicia sesión para continuar.':reply.status>=400?'No pudimos completar el acceso. Inténtalo de nuevo.':null);
    return true;
  }
  return {phase,busy,ready,message,submit,receive,cancel,
    loaded(){setReady(true);submit({kind:'session'});},
    loading(){cancel();setReady(false);},
    reset(){cancel();setPhase('login');setMessage(null);},
    changePhase(next:AuthPhase){if(!busy){setPhase(next);setMessage(null);}},
  };
}
