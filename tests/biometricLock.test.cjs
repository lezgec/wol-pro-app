const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/useBiometricLock.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function harness(preference='enabled',readError=false) {
  const slots=[]; let position=0; const effects=[]; let listener; let result={success:false}; let prompt;
  const react={useState(initial){const index=position++;if(!(index in slots)) slots[index]=initial;return [slots[index],value=>{slots[index]=value}];},useRef(initial){const index=position++;if(!(index in slots)) slots[index]={current:initial};return slots[index];},useEffect(fn){position++;if(!effects.some(e=>e.position===position)) effects.push({position,fn});}};
  const secure={getItemAsync:async()=>{if(readError)throw Error('storage unavailable');return preference;},setItemAsync:async(key,value)=>{preference=value;}};
  const authentication={hasHardwareAsync:async()=>true,isEnrolledAsync:async()=>true,authenticateAsync:async()=>{if(prompt)await prompt();return result;}};
  const exports={};vm.runInNewContext(source,{exports,require:name=>({'react':react,'react-native':{Alert:{alert(){}},AppState:{addEventListener(_,fn){listener=fn;return {remove(){}}}}},'expo-local-authentication':authentication,'expo-secure-store':secure})[name]});
  function render(){position=0;return exports.useBiometricLock();}
  render();for(const effect of effects)effect.fn();await new Promise(resolve=>setImmediate(resolve));
  return {render,event:state=>listener(state),auth:value=>{result=value},onPrompt:fn=>{prompt=fn},preference:()=>preference};
}
test('saved lock blocks access on startup and cancellation does not unlock',async()=>{const h=await harness();assert.equal(h.render().ready,true);assert.equal(h.render().locked,true);await h.render().unlock();assert.equal(h.render().locked,true);});
test('storage failure fails closed',async()=>{const h=await harness('enabled',true);assert.equal(h.render().ready,false);assert.equal(h.render().locked,true);});
test('successful verification unlocks and background locks again',async()=>{const h=await harness();h.auth({success:true});await h.render().unlock();assert.equal(h.render().locked,false);h.event('background');assert.equal(h.render().locked,true);});
test('successful prompt cannot unlock after leaving the app',async()=>{const h=await harness();h.auth({success:true});h.onPrompt(()=>h.event('background'));await h.render().unlock();assert.equal(h.render().locked,true);});
test('enabling requires verification and persists only the preference',async()=>{const h=await harness('disabled');assert.equal(h.render().locked,false);await h.render().toggle();assert.equal(h.preference(),'disabled');h.auth({success:true});await h.render().toggle();assert.equal(h.preference(),'enabled');assert.equal(h.render().enabled,true);});
