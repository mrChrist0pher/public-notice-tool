const fs=require('fs'),vm=require('vm'),assert=require('assert')
const ts=require(require.resolve('typescript',{paths:[process.env.EXB_CLIENT || process.cwd()]}))
const src=fs.readFileSync(__dirname+'/src/runtime/cleanup.ts','utf8')
const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText
const ctx={exports:{}};vm.runInNewContext(out,ctx);const {cleanup,csv}=ctx.exports
const base={SOURCE_OID:1,AccountNo:'001',ParcelNo:'002',OwnerName:'ABC LLC',CareOf:'',MailAddr1:'10 MAIN ST',MailAddr2:'',MailCity:'BOULDER',MailState:'CO',MailZip:'80301',MailCountry:''}
const rows=[base,{...base,SOURCE_OID:2,MailZip:'80301-1234'},{...base,SOURCE_OID:3,OwnerName:'ABC II LLC'},{...base,SOURCE_OID:4,OwnerName:'CITY OF BOULDER'},{...base,SOURCE_OID:5,OwnerName:'BOULDER HOUSING AUTHORITY'},{...base,SOURCE_OID:6,OwnerName:'UNIVERSITY OF COLORADO'},{...base,SOURCE_OID:7,OwnerName:'UNIVERSITY OF COLORADO FOUNDATION'},{...base,SOURCE_OID:8,OwnerName:'TEST TRUST'},{...base,SOURCE_OID:9,OwnerName:'TEST II TRUST'}]
const result=cleanup(rows)
assert.equal(result.rows.length,7);assert.equal(result.audit.length,9)
assert.equal(result.rows.find(r=>r.NAME==='ABC LLC').ZIP,'80301-1234')
assert(result.rows.find(r=>r.NAME==='ABC II LLC'));assert(result.rows.find(r=>r.NAME==='BOULDER HOUSING AUTHORITY'))
assert.equal(result.rows.find(r=>r.NAME==='UNIVERSITY OF COLORADO').ADDRESS,'453 UCB')
assert(result.review.find(r=>r.NAME==='UNIVERSITY OF COLORADO FOUNDATION'))
const conflicts=cleanup([base,{...base,SOURCE_OID:2,MailZip:'80301-1234'},{...base,SOURCE_OID:3,MailZip:'80301-5678'}])
assert.equal(conflicts.rows[0].ZIP,'80301');assert(conflicts.review[0].REVIEW_FLAGS.includes('Conflicting'))
assert(csv([{NAME:'=1+1',ZIP:'01234'}],['NAME','ZIP']).includes("'"+'=1+1'))
assert(csv([{NAME:'A "quoted", owner',ZIP:'01234'}],['NAME','ZIP']).includes('"A ""quoted"", owner"'))
// Blank delivery lines are excluded; valid second lines/PO boxes/CU stay.
const addressInputs=[
  {...base,SOURCE_OID:20,MailAddr1:null,MailAddr2:null},
  {...base,SOURCE_OID:21,MailAddr1:'  \t ',MailAddr2:'\r\n'},
  {...base,SOURCE_OID:22,MailAddr1:'',MailAddr2:'PO BOX 123'},
  {...base,SOURCE_OID:23,MailAddr1:'PO BOX 456',MailAddr2:''},
  {...base,SOURCE_OID:24,OwnerName:'UNIVERSITY OF COLORADO',MailAddr1:'',MailAddr2:''},
  {...base,SOURCE_OID:25,MailCity:'',MailZip:''}
]
const before=JSON.stringify(addressInputs), addressResult=cleanup(addressInputs)
assert.equal(addressResult.rows.length,4)
assert.equal(addressResult.audit.length,6)
for(const id of [20,21]){
  const audit=addressResult.audit.find(r=>r.SOURCE_OID===id)
  assert.equal(audit.EXCLUSION,'No mailing address: both delivery lines are blank')
  assert.equal(audit.MAIL_ID,'')
}
assert(addressResult.rows.some(r=>r.ADDRESS2==='PO BOX 123'))
assert(addressResult.rows.some(r=>r.ADDRESS==='PO BOX 456'))
assert(addressResult.rows.some(r=>r.NAME==='UNIVERSITY OF COLORADO'&&r.ADDRESS==='453 UCB'))
assert.equal(JSON.stringify(addressInputs),before)
const allExcluded=cleanup(addressInputs.slice(0,2))
assert.equal(allExcluded.rows.length,0)
assert.equal(allExcluded.audit.length,2)
assert.equal(csv(allExcluded.rows,ctx.exports.fields).split('\r\n').length,1)
console.log('PASS: blank-address exclusion, second lines/PO boxes/CU, unchanged raw inputs, header-only CSV, ZIP variants, legal entities and safe CSV.')
