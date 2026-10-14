const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const exportsAuth={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/nativeAuth.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsAuth,URL});
async function run(action,options={}){
  const calls=[],messages=[];const page={origin:'https://example.invalid',pathname:options.pathname||'/mobile/bridge'};
  const window={ReactNativeWebView:{postMessage:text=>messages.push(JSON.parse(text))}};window.top=options.iframe?{}:window;
  const fetch=async(url,init)=>{calls.push({url,init});const response=calls.length===1?(options.bootstrap||{phase:'login',csrf_token:'private-csrf'}):(options.result||{phase:'authenticated',data:{version:1,email:'a@example.invalid',devices:[],csrf_token:'rotated-csrf'}});
    return {ok:calls.length===1?true:(options.status||200)<400,status:calls.length===1?200:options.status||200,headers:{get:()=>options.html?'text/html':'application/json'},json:async()=>response};};
  vm.runInNewContext(exportsAuth.authScript('https://example.invalid',1,action),{location:page,window,fetch,AbortController,setTimeout,clearTimeout,JSON});
  for(let i=0;i<6;i++)await new Promise(setImmediate);
  return {calls,messages};
}
test('native login posts credentials in the body and retains CSRF only inside the bridge',async()=>{
  const action={kind:'login',email:'a@example.invalid',password:'fake"password1!',remember:true};const h=await run(action);
  assert.deepEqual(h.calls.map(c=>c.url),['/api/mobile/v1/auth/session','/api/mobile/v1/auth/login']);
  const request=h.calls[1];assert.equal(request.init.headers['X-CSRF-Token'],'private-csrf');
  assert.deepEqual(JSON.parse(request.init.body),{email:action.email,password:action.password,remember:true});
  assert.equal(request.init.redirect,'error');assert.equal(request.init.credentials,'same-origin');
  assert.equal(h.messages[0].body.data.csrf_token,undefined);
  assert.equal(JSON.stringify(h.messages).includes(action.password),false);
});
test('auth operations cannot run on a login webpage or inside an iframe',async()=>{
  assert.equal((await run({kind:'login',email:'a',password:'fake',remember:false},{pathname:'/login'})).calls.length,0);
  assert.equal((await run({kind:'session'},{iframe:true})).calls.length,0);
  assert.throws(()=>exportsAuth.authScript('https://example.invalid',1,{kind:'../devices'}));
});
test('session restore and form errors have structured replies without CSRF',async()=>{
  const restored=await run({kind:'session'},{bootstrap:{phase:'authenticated',data:{csrf_token:'secret',devices:[]}}});
  assert.equal(restored.calls.length,1);assert.equal(restored.messages[0].body.data.csrf_token,undefined);
  const bad=await run({kind:'login',email:'a',password:'fake',remember:false},{status:401,result:{phase:'login',message:'Incorrecto'}});
  assert.equal(bad.messages[0].status,401);
  const html=await run({kind:'session'},{html:true});assert.equal(html.messages[0].status,503);
});
test('messages from other origins and ordinary pages cannot authenticate the native UI',()=>{
  const message=JSON.stringify({channel:'wol-native-auth-v1',id:1,status:200,body:{phase:'authenticated'}});
  assert.equal(exportsAuth.parseAuthReply('https://other.invalid/mobile/bridge',message,'https://example.invalid'),null);
  assert.equal(exportsAuth.parseAuthReply('https://example.invalid/login',message,'https://example.invalid'),null);
  assert.equal(exportsAuth.parseAuthReply('https://example.invalid/mobile/bridge',message,'https://example.invalid').id,1);
});

test('Android sourceOrigin replies authenticate only with the guarded bridge page marker',async()=>{
  const h=await run({kind:'session'});
  const text=JSON.stringify(h.messages[0]);
  assert.equal(h.messages[0].page,'/mobile/bridge');
  assert.equal(exportsAuth.parseAuthReply('https://example.invalid',text,'https://example.invalid').id,1);
  assert.equal(exportsAuth.parseAuthReply('https://example.invalid/',text,'https://example.invalid').id,1);
  const bare=JSON.stringify({...h.messages[0],page:undefined});
  assert.equal(exportsAuth.parseAuthReply('https://example.invalid',bare,'https://example.invalid'),null);
  for(const url of ['https://other.invalid/','https://example.invalid/login','https://example.invalid/?x=1','https://user@example.invalid/','https://example.invalid/#bridge']){
    assert.equal(exportsAuth.parseAuthReply(url,text,'https://example.invalid'),null);
  }
});
