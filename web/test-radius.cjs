// Exercise the real selection handler, including custom validation and buffering.
const fs=require('fs'),path=require('path'),assert=require('assert')
const ts=require(require.resolve('typescript',{paths:[process.env.EXB_CLIENT||process.cwd()]}))
const source=fs.readFileSync(path.join(__dirname,'src/runtime/widget.tsx'),'utf8')
const handler=source.slice(source.indexOf('  async function run(){'),source.indexOf('  function pick(){'))
const code=ts.transpileModule(handler,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText
async function run(mode,customRadius){
  let distance,queries=0,subjectQueries=0,applied='',message='',picked=false
  const selected={current:new Map([[99,'old selection']])},operation={current:1}
  const area={extent:{clone:()=>({expand:()=>({})})}}
  const args={cancelPick:()=>{picked=true},work:async fn=>fn(1),mode,customRadius,
    subject:async()=>{subjectQueries++;return {}},operation,
    geometryEngine:{geodesicBuffer:(g,n,u)=>{distance=n;assert.equal(u,'feet');return area},contains:()=>false},
    within:async()=>{queries++;return [{attributes:{OID:1},geometry:{centroid:{}}}]},selected,
    owners:()=>({objectIdField:'OID'}),showSelection:async()=>{},setAppliedMode:v=>applied=v,
    areaLayer:{current:{removeAll(){},add(){}}},Graphic:class{},GraphicsLayer:class{},
    jmv:{view:{goTo:async()=>{},map:{add(){}}}},setMessage:v=>message=v}
  await new Function(...Object.keys(args),code+';return run();')(...Object.values(args))
  return {distance,queries,subjectQueries,applied,message,selected,picked}
}
;(async()=>{
  for(const [mode,input,n] of [['300','',300],['600','',600],['adjacent','',2],['custom','450',450],['custom','125.5',125.5]]){
    const r=await run(mode,input);assert.equal(r.distance,n);assert.equal(r.queries,1);assert.equal(r.applied,mode)
    assert(r.picked);assert.deepEqual([...r.selected.current.keys()],[1])
  }
  for(const input of ['', ' ', '0','-10','NaN','Infinity']) await assert.rejects(run('custom',input),/greater than zero/)
  assert(source.includes("setCustomRadius(e.target.value);setAppliedMode('');setResult(null)"),'Changing custom distance must invalidate the previous run')
  assert(!source.includes('Start custom selection'))
  console.log('PASS: custom/standard geodesic radii, positive decimals, invalid distances, replaced selection and custom edit invalidation.')
})().catch(e=>{console.error(e);process.exitCode=1})
