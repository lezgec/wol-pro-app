export type AuthPhase = 'login' | 'register' | 'verify' | 'forgot' | 'reset';
export type AuthAction = {kind:'session'} | {kind:'login';email:string;password:string;remember:boolean} | {kind:'register';email:string;password:string} | {kind:'verify';code:string} | {kind:'resend'} | {kind:'forgot';email:string} | {kind:'reset';code:string;password:string};
export type AuthReply = {channel:'wol-native-auth-v1';page?:'/mobile/bridge';id:number;status:number;body:{phase?:AuthPhase|'authenticated';message?:string;email?:string;data?:unknown}};

// Cookies and CSRF stay in the isolated, invisible, same-origin bridge.
// Passwords are used for this request only; never put them in a URL or storage.
export function authScript(origin:string,id:number,action:AuthAction):string {
  const kind=action.kind;
  if (!['session','login','register','verify','resend','forgot','reset'].includes(kind)) throw new Error('Operación de acceso inválida.');
  return `(() => {
    if (location.origin !== ${JSON.stringify(origin)} || location.pathname !== '/mobile/bridge' || window.top !== window) return;
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
    const reply = (status, body) => {
      delete body.csrf_token; if (body.data) delete body.data.csrf_token;
      window.ReactNativeWebView.postMessage(JSON.stringify({channel:'wol-native-auth-v1',page:'/mobile/bridge',id:${id},status,body}));
    };
    (async () => {
      try {
        const options={credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}};
        const response=await fetch('/api/mobile/v1/auth/session',options);
        if (!(response.headers.get('content-type')||'').includes('application/json')) {reply(503,{message:'No pudimos conectar con tu cuenta. Inténtalo más tarde.'});return;}
        const bootstrap=await response.json();
        if (!response.ok || ${JSON.stringify(kind)}==='session') {reply(response.status,bootstrap);return;}
        const action=${JSON.stringify(action)}; const payload={...action};delete payload.kind;
        const result=await fetch('/api/mobile/v1/auth/'+${JSON.stringify(kind)},{...options,method:'POST',headers:{...options.headers,'Content-Type':'application/json','X-CSRF-Token':bootstrap.csrf_token||bootstrap.data?.csrf_token},body:JSON.stringify(payload)});
        const body=(result.headers.get('content-type')||'').includes('application/json') ? await result.json() : {message:'No se pudo completar el acceso. Inténtalo de nuevo.'};
        reply(result.status,body);
      } catch (_) {reply(0,{message:'No pudimos conectar. Comprueba tu conexión y vuelve a intentarlo.'});}
      finally {clearTimeout(timer);}
    })();
  })(); true;`;
}
export function parseAuthReply(url:string,text:string,origin:string):AuthReply|null {
  try {
    const page=new URL(url);
    if (page.origin!==origin || page.username || page.password || page.search || page.hash || text.length>1024*1024) return null;
    const value=JSON.parse(text);
    // Android's WebMessageListener supplies sourceOrigin rather than the page URL.
    // That form is accepted only with the page marker from our guarded script;
    // native navigation remains restricted to the empty /mobile/bridge document.
    if (page.pathname!=='/mobile/bridge' && !(page.pathname==='/' && value?.page==='/mobile/bridge')) return null;
    if (value.channel!=='wol-native-auth-v1'||!Number.isSafeInteger(value.id)||!Number.isInteger(value.status)||!value.body||typeof value.body!=='object'||Array.isArray(value.body))return null;
    return value;
  }catch{return null;}
}
