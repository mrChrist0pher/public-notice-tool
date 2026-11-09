// Offline synthetic export: no GIS service, real case, or recipient data needed.
const fs = require('fs'), assert = require('assert')
const path = require('path')
const client = process.env.EXB_CLIENT || process.cwd()
const dep = name => require(require.resolve(name, { paths: [client] }))
const ts = dep('typescript')
const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'src/runtime/pdf-layout.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true }
}).outputText
const context = { exports: {} }
// Use this realm: pdf-lib validates Array instances across module boundaries.
new Function('require', 'exports', output)(dep, context.exports)
;(async () => {
  const { propertyInfoUrl, makeNoticePdf } = context.exports
  const { PDFDocument, PDFName, PDFDict, PDFString } = dep('pdf-lib')
  assert(propertyInfoUrl('TEST A&B').endsWith('TEST%20A%26B'))
  const logo = fs.readFileSync(path.join(__dirname, 'src/runtime/assets/city-logo.png'))
  // Reuse the logo as a synthetic map image; this is not a cartographic test.
  const bytes = await makeNoticePdf('data:image/png;base64,' + logo.toString('base64'), logo, 'TEST-00001', 5, 'Synthetic source attribution')
  const pdf = await PDFDocument.load(bytes)
  assert.equal(pdf.getPageCount(), 1)
  assert.equal(pdf.getPage(0).getWidth(), 612)
  assert.equal(pdf.getPage(0).getHeight(), 792)
  const annotations = pdf.getPage(0).node.Annots()
  assert.equal(annotations.size(), 1)
  const annotation = annotations.lookup(0, PDFDict)
  const action = annotation.lookup(PDFName.of('A'), PDFDict)
  assert.equal(action.lookup(PDFName.of('URI'), PDFString).decodeText(), propertyInfoUrl('TEST-00001'))
  console.log('PASS: synthetic Letter PDF, generated QR asset, encoded case URL and clickable case annotation. No live-map or QR decode assertion.')
})().catch(error => { console.error(error); process.exitCode = 1 })
