const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const auth={};vm.runInNewContext(compile('nativeAuth.ts'),{exports:auth,URL});
function harness(){
  const slots=[],timers=new Map(),scripts=[],accepted=[];let index=0,allowed=true,valid=true,throwInjection=false;
  const react={useState(initial){const i=index++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=value;}];},useRef(initial){const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useEffect(){index++;}};
  const exports={};vm.runInNewContext(compile('useNativeAuth.ts'),{exports,require:name=>name==='react'?react:auth,setTimeout:fn=>{const token={};timers.set(token,fn);return token;},clearTimeout:token=>timers.delete(token)});
  const bridge={current:{injectJavaScript(script){if(throwInjection)throw Error('gone');scripts.push(script);}}};
  return{render(){index=0;return exports.useNativeAuth('https://example.invalid',bridge,()=>allowed,data=>{accepted.push(data);return valid;});},scripts,accepted,timers,lock(){allowed=false;},invalid(){valid=false;},throw(){throwInjection=true;},reply(id,body,status=200){return this.render().receive('https://example.invalid/mobile/bridge',JSON.stringify({channel:'wol-native-auth-v1',id,status,body}));}};
}
test('pending auth is exclusive and late replies after reset cannot sign in',()=>{
  const h=harness();h.render().loaded();h.render().submit({kind:'session'});assert.equal(h.scripts.length,1);
  h.render().reset();h.render().submit({kind:'session'});
  h.reply(1,{phase:'authenticated',data:{old:true}});assert.equal(h.accepted.length,0);assert.equal(h.render().busy,true);
  h.reply(2,{phase:'authenticated',data:{current:true}});assert.equal(h.accepted.length,1);assert.equal(h.render().busy,false);assert.equal(h.timers.size,0);
});
test('biometric lock rejects an in-flight login and prevents new requests',()=>{
  const h=harness();h.render().loaded();h.lock();h.reply(1,{phase:'authenticated',data:{}});assert.equal(h.accepted.length,0);
  h.render().submit({kind:'session'});assert.equal(h.scripts.length,1);
});

test('Android origin-only message completes the request instead of showing an access timeout',()=>{
  const h=harness();h.render().loaded();
  const message=JSON.stringify({channel:'wol-native-auth-v1',page:'/mobile/bridge',id:1,status:200,body:{phase:'authenticated',data:{current:true}}});
  assert.equal(h.render().receive('https://example.invalid',message),true);
  assert.equal(h.accepted.length,1);assert.equal(h.render().busy,false);assert.equal(h.timers.size,0);
});
test('timeout, transport failure and incompatible data leave native access recoverable',()=>{
  const h=harness();h.render().loaded();[...h.timers.values()][0]();assert.equal(h.render().busy,false);assert.match(h.render().message,/conexión/);
  h.invalid();h.render().submit({kind:'session'});h.reply(2,{phase:'authenticated',data:{}});assert.match(h.render().message,/actualizarse/);
  h.throw();h.render().submit({kind:'session'});assert.equal(h.render().busy,false);assert.equal(h.timers.size,0);
});
