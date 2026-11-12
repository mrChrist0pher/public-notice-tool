// Exercise the actual export handler across cases. SDK stand-ins deliberately
// destroy every layer owned by the print map, exposing shared-instance reuse.
const fs=require('fs'),path=require('path'),assert=require('assert')
const ts=require(require.resolve('typescript',{paths:[process.env.EXB_CLIENT||process.cwd()]}))
const source=fs.readFileSync(path.join(__dirname,'src/runtime/widget.tsx'),'utf8')
const handler=source.slice(source.indexOf('  async function exportMap(){'),source.indexOf('  // MAILING DOWNLOAD:'))
assert(handler.includes('Basemap.fromJSON'));assert(!handler.includes('basemap.clone()'))
const code=ts.transpileModule(handler,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText
class Extent{constructor(v){Object.assign(this,v);this.width=this.xmax-this.xmin;this.height=this.ymax-this.ymin;this.center={x:50,y:50}}clone(){return new Extent(this)}expand(){return this}}
const extent=new Extent({xmin:0,xmax:100,ymin:0,ymax:100,spatialReference:{wkid:3857}})
const collection=a=>({toArray:()=>a})
let basemaps=[],maps=[],views=[],downloads=[],messages=[],removed=0
const liveTile={destroyed:false,toJSON(){assert(!this.destroyed);return {type:'vector-tile'}}}
const liveBasemap={toJSON(){assert(!liveTile.destroyed);return {baseMapLayers:[liveTile.toJSON()]}}}
const Basemap={fromJSON:()=>{const tile={type:'vector-tile',load:async()=>{},currentStyleInfo:{style:{layers:[]}},destroyed:false};const b={baseLayers:collection([tile]),referenceLayers:collection([])};basemaps.push(b);return b}}
const liveLayer={title:'Subject Area',clone:()=>({id:'case',type:'feature'})}
const Layer={fromJSON:j=>({...j})}
class ArcGISMap{constructor(v){Object.assign(this,v);this.allLayers=collection(v.layers);maps.push(this)}destroy(){this.basemap.baseLayers.toArray().forEach(l=>l.destroyed=true)}}
class MapView{constructor(v){Object.assign(this,v);this.scale=2400;this.width=900;this.updating=false;views.push(this)}async when(){}async goTo(){}async takeScreenshot(){assert(!this.map.basemap.baseLayers.toArray()[0].destroyed);return {dataUrl:'map'}}destroy(){this.map.destroy()}}
const document={baseURI:'https://example.test/app/',body:{appendChild(){}},createElement:()=>({style:{},remove(){removed++},click(){downloads.push(this.download)}})}
const caseRef={current:'TEST-A'},operation={current:0},pdfBlob={current:''}
const names=['work','subject','operation','caseRef','cfg','Extent','document','jmv','Layer','Basemap','ArcGISMap','MapView','reactiveUtils','esriRequest','Polyline','geometryEngine','makeNoticePdf','pdfBlob','URL','Blob','setPdf','setMessage','caseUrl']
const values=[async fn=>fn(++operation.current),async()=>({extent}),operation,caseRef,{frameWidth:7.5,frameHeight:8,caseLayerId:'case'},Extent,document,{view:{map:{layers:[liveLayer],basemap:liveBasemap}}},Layer,Basemap,ArcGISMap,MapView,{whenOnce:async fn=>assert(fn())},async()=>({data:new ArrayBuffer(0)}),class {},{geodesicLength:()=>100},async()=>new Uint8Array([1]),pdfBlob,class extends URL {static createObjectURL(){return 'blob:test'}static revokeObjectURL(){}},Blob,()=>{},m=>messages.push(m),()=> 'https://example.test/cases/2']
;(async()=>{const run=new Function(...names,code+';return exportMap;')(...values)
  await run();caseRef.current='TEST-B';await run();await run()
  assert.deepEqual(downloads,['TEST-A_VM.pdf','TEST-B_VM.pdf','TEST-B_VM.pdf'])
  assert.equal(removed,3);assert.equal(views.length,3);assert.equal(new Set(basemaps).size,3)
  assert(!liveTile.destroyed);assert(basemaps.every(b=>b.baseLayers.toArray()[0].destroyed))
  console.log('PASS: actual PDF handler exports A, B, B; destroys private basemaps/containers; preserves live tile layer.')
})().catch(e=>{console.error(e);process.exitCode=1})


