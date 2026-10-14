const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const path=require('node:path'); const vm=require('node:vm'); const ts=require('typescript'); const crypto=require('node:crypto');
const compile=file=>ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const stepExports={}; vm.runInNewContext(compile('tourSteps.ts'),{exports:stepExports});
const settle=async()=>{for(let i=0;i<6;i++)await new Promise(setImmediate);};
function harness(store=new Map(), fail=false) {
  let cursor=0, identity='https://example.invalid|a@example.invalid', eligible=false; const slots=[], effects=[], queued=[];
  const react={useState(value){const n=cursor++;if(!(n in slots))slots[n]=value;return [slots[n],v=>{slots[n]=v;}];},useRef(value){const n=cursor++;if(!(n in slots))slots[n]={current:value};return slots[n];},useEffect(fn,deps){const n=cursor++;const old=effects[n];if(!old||deps.some((d,i)=>d!==old.deps[i])){queued.push(()=>{old?.cleanup?.();effects[n]={deps,cleanup:fn()};});}}};
  const secure={async getItemAsync(key){if(fail)throw Error('storage');return store.get(key)??null;},async setItemAsync(key,value){if(fail)throw Error('storage');store.set(key,value);}};
  const hash={CryptoDigestAlgorithm:{SHA256:'sha256'},async digestStringAsync(_,value){return crypto.createHash('sha256').update(value).digest('hex');}};
  const exports={};vm.runInNewContext(compile('useAppTour.ts'),{exports,require:name=>({'react':react,'expo-secure-store':secure,'expo-crypto':hash,'./tourSteps':stepExports})[name]});
  function render(){cursor=0;const value=exports.useAppTour(identity,eligible);while(queued.length)queued.shift()();return value;}
  return {store,render,async refresh(){for(let i=0;i<4;i++){render();await settle();}return render();},setEligible(value){eligible=value;},setIdentity(value){identity=value;}};
}
test('tour waits for an eligible unlocked screen and resumes after closing',async()=>{
  const h=harness();assert.equal((await h.refresh()).visible,false);h.setEligible(true);
  const tour=await h.refresh();assert.equal(tour.visible,true);tour.move(4);await h.refresh();h.render().close();await h.refresh();
  const restarted=harness(h.store);restarted.setEligible(true);assert.equal((await restarted.refresh()).visible,false);
  restarted.render().start();assert.equal((await restarted.refresh()).index,4);
});
test('locking hides the guide and switching accounts clears progress',async()=>{
  const h=harness();h.setEligible(true);await h.refresh();h.render().move(6);await h.refresh();h.setEligible(false);
  assert.equal((await h.refresh()).visible,false);h.setIdentity('https://example.invalid|b@example.invalid');h.setEligible(true);
  const other=await h.refresh();assert.equal(other.index,0);assert.equal(other.visible,true);
  for(const key of h.store.keys())assert.equal(key.includes('@'),false);
});
test('completed guide reopens from the beginning and unavailable storage permits manual help',async()=>{
  const h=harness();h.setEligible(true);await h.refresh();h.render().finish();await h.refresh();h.render().start();assert.equal((await h.refresh()).index,0);
  const broken=harness(new Map(),true);broken.setEligible(true);assert.equal((await broken.refresh()).visible,false);
  broken.render().start();assert.equal((await broken.refresh()).visible,true);
});
