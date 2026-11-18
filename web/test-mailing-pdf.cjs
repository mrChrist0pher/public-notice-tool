// Synthetic output fixture only. Never commit real owner names or addresses.
const fs=require('fs'),path=require('path'),assert=require('assert')
const client=process.env.EXB_CLIENT||process.cwd(),extra=process.env.NOTICE_PDF_DEPS
const dep=name=>require(require.resolve(name,{paths:[extra,client].filter(Boolean)}))
const ts=dep('typescript'),modules={}
function load(name){
  if(modules[name])return modules[name]
  const context={exports:{}};modules[name]=context.exports
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'src/runtime',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019,esModuleInterop:true}}).outputText
  new Function('require','exports',code)(n=>n.startsWith('./')?load(n.slice(2)):dep(n),context.exports)
  return context.exports
}
const {makeMailingListPdf}=load('mailing-list-pdf'),{fields}=load('cleanup')
const assets=path.join(__dirname,'src/runtime/assets')
const opts={caseNo:'TEST-001',selection:'450 feet (custom), with manual adjustments',generatedAt:new Date('2026-11-17T19:00:00Z'),regularFont:new Uint8Array(fs.readFileSync(path.join(assets,'NotoSans-Regular.ttf'))),boldFont:new Uint8Array(fs.readFileSync(path.join(assets,'NotoSans-Bold.ttf')))}
const rows=Array.from({length:45},(_,i)=>({NAME:'TEST OWNER '+String(i+1).padStart(3,'0'),NAME2:i===0?'Jörg García':'',ADDRESS:i===1?'LONG STREET NAME '.repeat(12):'123 TEST STREET',ADDRESS2:i%2?'UNIT 04':'',CITY:'TEST CITY',STATE:'CO',ZIP:'00123-4567',COUNTRY:i===0?'CANADA':''}))
// A very long row exercises continuation across pages without truncation.
rows.push({...rows[0],NAME:'LONG ROW',ADDRESS:'LONG TEST VALUE '.repeat(900)})
;(async()=>{
  const {PDFDocument,PDFName,PDFDict,PDFArray,PDFString,PDFHexString}=dep('pdf-lib')
  for(const [name,data] of [['multi',rows],['empty',[]]]){
    const bytes=await makeMailingListPdf(data,opts),pdf=await PDFDocument.load(bytes)
    assert.equal(pdf.getTitle(),'TEST-001 Mailing List')
    assert.equal(pdf.catalog.lookup(PDFName.of('Lang'),PDFString).decodeText(),'en-US')
    const tree=pdf.catalog.lookup(PDFName.of('StructTreeRoot'),PDFDict)
    let tags={},values=[]
    function visit(obj){
      if(obj instanceof PDFDict){
        const tag=obj.get(PDFName.of('S'))?.toString();if(tag)tags[tag]=(tags[tag]||0)+1
        if(tag==='/TH')assert.equal(obj.lookup(PDFName.of('A'),PDFDict).get(PDFName.of('Scope')).toString(),'/Column')
        if(tag==='/TD')values.push(obj.lookup(PDFName.of('ActualText')).decodeText())
        const k=obj.get(PDFName.of('K'));if(k)visit(pdf.context.lookup(k))
      }else if(obj instanceof PDFArray){for(let i=0;i<obj.size();i++)visit(obj.lookup(i))}
    }
    visit(tree)
    assert.equal(tags['/H1'],1)
    if(data.length){assert.equal(tags['/TH'],8);assert.equal(tags['/TD'],data.length*8);assert.deepEqual(values,data.flatMap(row=>fields.map(f=>String(row[f]??''))))}
    else assert(!tags['/Table'])
    if(data.length){assert(pdf.getPageCount()>1);assert(pdf.getPageCount()<60,'Unexpected page overflow')}
    for(const p of pdf.getPages()){assert.equal(p.getWidth(),792);assert.equal(p.getHeight(),612)}
    if(process.env.NOTICE_PDF_OUTPUT){fs.mkdirSync(process.env.NOTICE_PDF_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.NOTICE_PDF_OUTPUT,'mailing-'+name+'.pdf'),bytes)}
  }
  await assert.rejects(makeMailingListPdf([{...rows[0],NAME:'漢字'}],opts),/does not support character/)
  console.log('PASS: embedded-font tagged PDF, header scopes, all eight field values/order, multipage/long-row continuation, empty output and unsupported glyph error. Not a PAC certification.')
})().catch(e=>{console.error(e);process.exitCode=1})
