// Exercise the actual widget download handler with synthetic records and browser
// stand-ins. Assert the file contains only cleaned mailing fields, with no ZIP/raw.
const fs=require('fs'),path=require('path'),assert=require('assert')
const ts=require(require.resolve('typescript',{paths:[process.env.EXB_CLIENT||process.cwd()]}))
const mod={exports:{}}
const cleanupSource=fs.readFileSync(path.join(__dirname,'src/runtime/cleanup.ts'),'utf8')
new Function('exports',ts.transpileModule(cleanupSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports)
const source=fs.readFileSync(path.join(__dirname,'src/runtime/widget.tsx'),'utf8')
const start=source.indexOf('  async function generate(){'),end=source.indexOf('  const button=',start)
assert(start>=0&&end>start)
const handler=source.slice(start,end)
const base={SOURCE_OID:1,OwnerName:'TEST OWNER',MailAddr1:'10 MAIN ST',MailAddr2:'',MailCity:'BOULDER',MailState:'CO',MailZip:'80301',MailCountry:''}
async function run(records){
  let downloads=[],blobs=[],messages=[],result
  const document={createElement:()=>{const a={click:()=>downloads.push(a.download)};return a}}
  const URL={createObjectURL:blob=>{blobs.push(blob);return 'blob:test'},revokeObjectURL:()=>{}}
  const selected={current:new Map(records.map((r,i)=>[i,{attributes:{...r,OID:i}}]))}
  const fn=new Function('cleanup','csv','fields','cancelPick','selected','appliedMode','mode','owners','work','operation','Blob','URL','document','caseRef','setTimeout','setResult','setMessage',handler+';return generate();')
  await fn(mod.exports.cleanup,mod.exports.csv,mod.exports.fields,()=>{},selected,'300','300',()=>({objectIdField:'OID'}),async task=>task(1),{current:1},Blob,URL,document,{current:'TEST-001'},()=>{},r=>result=r,m=>messages.push(m))
  assert.deepEqual(downloads,['TEST-001_ML.csv'])
  assert.equal(blobs.length,1)
  assert.equal(blobs[0].type,'text/csv;charset=utf-8')
  const text=await blobs[0].text()
  assert.equal(text.split('\r\n')[0],'"NAME","NAME2","ADDRESS","ADDRESS2","CITY","STATE","ZIP","COUNTRY"')
  assert(!text.includes('SOURCE_OID'))
  return {text,result,messages}
}
;(async()=>{
  const blank={...base,OwnerName:'NO ADDRESS OWNER',MailAddr1:null,MailAddr2:' \t '}
  const mixed=await run([base,blank])
  assert.equal(mixed.result.rows.length,1)
  assert(!mixed.text.includes('NO ADDRESS OWNER'))
  const empty=await run([blank])
  assert.equal(empty.text.split('\r\n').length,1)
  assert.equal(empty.result.rows.length,0)
  console.log('PASS: actual handler downloads one cleaned CSV, excludes blank addresses, has eight fields and no raw IDs/ZIP archive, supports header-only output.')
})().catch(e=>{console.error(e);process.exitCode=1})
