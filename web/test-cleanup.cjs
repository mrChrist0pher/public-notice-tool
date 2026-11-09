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
console.log('PASS: ZIP variants/conflicts, legal entities, City exclusion, Housing retention, CU override/review, audit and safe CSV.')
