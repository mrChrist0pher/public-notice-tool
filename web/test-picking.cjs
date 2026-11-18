// Test the actual toggle/cleanup functions without querying live GIS data.
const fs=require('fs'),path=require('path'),assert=require('assert')
const ts=require(require.resolve('typescript',{paths:[process.env.EXB_CLIENT||process.cwd()]}))
const source=fs.readFileSync(path.join(__dirname,'src/runtime/widget.tsx'),'utf8')
const cancel=source.match(/  const cancelPick=.*\n/)[0]
const pick=source.slice(source.indexOf('  function pick(){'),source.indexOf('  async function exportMap(){'))
const code=ts.transpileModule(cancel+pick,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText
let state=false,subscriptions=0,removed=0,message=''
const selected={current:new Map([[1,'existing parcel']])},handle={current:null},mounted={current:true}
const view={container:{style:{cursor:''}},on:(name,fn)=>{assert.equal(name,'click');subscriptions++;return {remove(){removed++}}}}
const api=new Function('handle','jmv','mounted','setPicking','caseNo','setMessage','selected','action','busy','work','within','geometryEngine','operation','owners','showSelection',code+';return {pick,cancelPick};')(
  handle,{view},mounted,v=>state=v,'TEST-001',v=>message=v,selected,'add',false,()=>{},()=>{}, {},{current:0},()=>{},()=>{})
api.pick();assert(state);assert.equal(view.container.style.cursor,'crosshair');assert.equal(subscriptions,1)
api.pick();assert(!state);assert.equal(view.container.style.cursor,'');assert.equal(handle.current,null);assert.equal(removed,1)
assert.equal(selected.current.size,1);assert(message.includes('Map picking stopped'))
api.pick();assert(state);assert.equal(subscriptions,2)
api.cancelPick();assert(!state);assert.equal(handle.current,null);assert.equal(removed,2)
api.cancelPick();assert.equal(removed,2,'Repeated cleanup must not remove another handler')
mounted.current=false;state=true;api.cancelPick();assert(state,'Unmount cleanup must not set React state')
assert(!source.includes('Finish adjusting'))
assert(source.includes("button(picking?'Stop picking':'Pick parcels on map',pick,!caseNo,picking)"))
assert(source.includes('aria-pressed={pressed}'))
console.log('PASS: picking toggle, cursor reset, one handler, selection preserved, repeated cleanup, unmount guard and pressed state.')
