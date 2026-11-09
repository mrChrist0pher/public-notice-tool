import { React, DataSourceComponent, DataSourceManager, type AllWidgetProps } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import FeatureLayer from 'esri/layers/FeatureLayer'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Graphic from 'esri/Graphic'
import Extent from 'esri/geometry/Extent'
import Polyline from 'esri/geometry/Polyline'

import MapView from 'esri/views/MapView'
import ArcGISMap from 'esri/Map'
import * as geometryEngine from 'esri/geometry/geometryEngine'
import * as reactiveUtils from 'esri/core/reactiveUtils'



import JSZip from 'jszip'
import esriRequest from 'esri/request'
import { makeNoticePdf } from './pdf-layout'
import { cleanup, csv, fields } from './cleanup'

const {useState,useRef,useEffect}=React
export default function Widget(props:AllWidgetProps<any>) {
  const [jmv,setJmv]=useState<JimuMapView>(null),[caseNo,setCaseNo]=useState(''),[mode,setMode]=useState('300'),[action,setAction]=useState('add')
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('Find a case above to begin.'),[count,setCount]=useState(0),[result,setResult]=useState<any>(null),[pdf,setPdf]=useState(''),[appliedMode,setAppliedMode]=useState('')
  const selected=useRef<Map<number,any>>(new Map()),caseRef=useRef(''),operation=useRef(0),handle=useRef<any>(null),highlight=useRef<any>(null),areaLayer=useRef<GraphicsLayer>(null),mounted=useRef(true),searchEditing=useRef(false),pdfBlob=useRef('')
  const cfg=props.config
  const caseDs=()=>DataSourceManager.getInstance().getDataSource(props.useDataSources?.[0]?.dataSourceId) as any
  const ownerDs=()=>DataSourceManager.getInstance().getDataSource(props.useDataSources?.[1]?.dataSourceId) as any
  const layer=(id:string)=>jmv?.view.map.allLayers.find((l:any)=>l.id===id) as FeatureLayer
  const owners=()=>layer(cfg.ownerLayerId)
  const cases=()=>layer(cfg.caseLayerId)
  const cancelPick=()=>{handle.current?.remove();handle.current=null;if(jmv)(jmv.view as any).container.style.cursor=''}
  function clearNotice(){
    // Reset immediately when a new search starts, including pending async work.
    // A late response from the old case must never redraw its buffer or list.
    operation.current++;cancelPick();selected.current.clear();highlight.current?.remove();areaLayer.current?.removeAll();ownerDs()?.clearSelection()
    setCount(0);setAppliedMode('');setResult(null);setPdf('');setBusy(false)
    if(pdfBlob.current){URL.revokeObjectURL(pdfBlob.current);pdfBlob.current=''}
  }
  useEffect(()=>{if(!jmv)return
    const start=(event:Event)=>{const el=event.target as HTMLElement
      // Search is a separate stock widget. Listen only inside its own boundary;
      // clicking the map, recipient table, or workflow inputs must not reset it.
      if(!el.closest('[data-widgetid="widget_18"]'))return
      const enter=event.type==='keydown'&&el.matches('input')&&(event as KeyboardEvent).key==='Enter'
      const button=el.closest('button')
      const submit=event.type==='click'&&button?.getAttribute('aria-label')==='Search'
      const clear=event.type==='click'&&button?.getAttribute('aria-label')==='Clear'
      if(!enter&&!submit&&!clear)return
      // Reset only on submission (or explicit Clear), never on typing/focus.
      // Capture runs before Search handles the same event, so late old-case
      // work is invalidated while the stock widget still performs its query.
      if(searchEditing.current)return
      searchEditing.current=true;clearNotice();caseRef.current='';setCaseNo('');const l=cases();if(l)l.definitionExpression='1=0';caseDs()?.clearSelection();setMessage('Previous notice cleared. Search for a case to begin.')
    }
    document.addEventListener('keydown',start,true);document.addEventListener('click',start,true)
    return()=>{document.removeEventListener('keydown',start,true);document.removeEventListener('click',start,true)}
  },[jmv])
  // Repository packaging change: an optional local service URL replaces the
  // prototype's hard-coded short-host repair. No internal host is committed.
  useEffect(()=>{if(!jmv)return;const old=cases();if(old&&cfg.caseServiceUrl&&old.url!==cfg.caseServiceUrl){
    const fixed=new FeatureLayer({url:cfg.caseServiceUrl,id:old.id,title:'Subject Area',definitionExpression:'1=0',renderer:old.renderer,popupTemplate:old.popupTemplate})
    const index=jmv.view.map.layers.indexOf(old);jmv.view.map.remove(old);jmv.view.map.add(fixed,index)
  }},[jmv])
  useEffect(()=>()=>{mounted.current=false;operation.current++;cancelPick();highlight.current?.remove();if(areaLayer.current)jmv?.view.map.remove(areaLayer.current)},[])
  // Search keeps its existing configuration. Observe its selected record or exact
  // CASENUMBER filter, then query ALL polygons for that case (not just one result).
  useEffect(()=>{if(!jmv)return;const timer=setInterval(()=>{
    if(searchEditing.current)return
    const ds=caseDs(); const recs=ds?.getSelectedRecords?.()||[]
    const names=Array.from(new Set(recs.map((r:any)=>r.getData()?.[cfg.caseField]).filter(Boolean))) as string[]
    const where=ds?.getCurrentQueryParams?.()?.where || cases()?.definitionExpression || ''
    const match=where.match(/(?:"?CASENUMBER"?)\s*=\s*'([^']+)'/i)
    const next=names.length===1?names[0]:(match?.[1]||'')
    if(next!==caseRef.current){clearNotice();caseRef.current=next;setCaseNo(next);const ticket=operation.current;const l=cases();if(l)l.definitionExpression=next?cfg.caseField+" = '"+next.replace(/'/g,"''")+"'":'1=0';setMessage(next?'Case '+next+' ready. Confirm its location before export.':'Find a case above to begin.');if(next)void subject().then(g=>{if(ticket===operation.current)return jmv.view.goTo(g.extent.clone().expand(6))}).catch(e=>{if(ticket===operation.current)setMessage('Case geometry could not load: '+e.message)})}
  },500);return()=>clearInterval(timer)},[jmv])
  async function subject(){
    if(!caseRef.current)throw Error('Select one case using Search first.')
    const l=cases();if(!l)throw Error('Case layer is unavailable. Check the connected map.')
    // A fresh service layer avoids inheriting a search result's object-ID filter.
    const queryLayer=new FeatureLayer({url:l.url,layerId:l.layerId});await queryLayer.load()
    const q=queryLayer.createQuery();q.where=cfg.caseField+" = '"+caseRef.current.replace(/'/g,"''")+"'";q.outFields=[cfg.caseField];q.returnGeometry=true;q.outSpatialReference=jmv.view.spatialReference
    const fs=await queryLayer.queryFeatures(q)
    if(fs.exceededTransferLimit)throw Error('Case geometry is incomplete; service transfer limit reached.')
    if(!fs.features.length||fs.features.some(f=>!f.geometry||f.geometry.type!=='polygon'))throw Error('Case has missing or non-polygon geometry. Confirm the case layer.')
    const geom=geometryEngine.union(fs.features.map(f=>f.geometry)) as __esri.Polygon
    if(!geom?.extent)throw Error('Case geometry is empty.')
    return geom
  }
  async function work(fn:(ticket:number)=>Promise<void>){const ticket=++operation.current;setBusy(true);setMessage('Working…');try{await fn(ticket)}catch(e){if(ticket===operation.current)setMessage('Could not finish: '+e.message)}finally{if(mounted.current)setBusy(false)}}
  // Query IDs first, then page by IDs: no silent 1,000/2,000-record truncation.
  async function within(geom:__esri.Geometry){const l=owners();if(!l)throw Error('Owner parcels are unavailable.');await l.load();const q=l.createQuery();q.where='1=1';q.geometry=geom;q.spatialRelationship='intersects';const ids=await l.queryObjectIds(q)||[];const all=[]
    for(let start=0;start<ids.length;start+=400){const b=l.createQuery();b.where='1=1';b.objectIds=ids.slice(start,start+400);b.outFields=['*'];b.returnGeometry=true;b.outSpatialReference=jmv.view.spatialReference;const fs=await l.queryFeatures(b);if(fs.exceededTransferLimit)throw Error('Incomplete recipient batch; nothing exported.');all.push(...fs.features)}
    if(new Set(all.map(f=>f.attributes[l.objectIdField])).size!==ids.length)throw Error('Recipient count changed during query. Run again.')
    return all
  }
  async function showSelection(){const l=owners();const fs=Array.from(selected.current.values());setCount(fs.length);setResult(null);ownerDs()?.selectRecordsByIds(fs.map(f=>String(f.attributes[l.objectIdField])),fs.map(f=>ownerDs().buildRecord(f)));highlight.current?.remove();if(fs.length){const lv=await jmv.view.whenLayerView(l);highlight.current=(lv as any).highlight(fs.map(f=>f.attributes[l.objectIdField]))}}
  function tableSelection(ids:readonly string[]){
    // The table's Clear Selection / row selection must not leave a hidden old
    // mailing snapshot available for export. Synchronize removals immediately.
    const wanted=new Set(ids.map(String));const current=Array.from(selected.current.keys())
    if(current.length===wanted.size&&current.every(id=>wanted.has(String(id))))return
    selected.current=new Map(Array.from(selected.current.entries()).filter(([id])=>wanted.has(String(id))))
    setCount(selected.current.size);setResult(null);highlight.current?.remove()
    if(wanted.size>selected.current.size){selected.current.clear();setCount(0);setMessage('Selection changed outside this panel. Run selection again before generating a list.')}
    else setMessage(selected.current.size+' records remain selected. Review before generating.')
  }
  async function run(){await work(async ticket=>{const geom=await subject();if(ticket!==operation.current)return
    if(mode==='custom'){setAppliedMode('custom');setMessage('Custom: use Add or Remove below, then click parcels on the map. Your current selection is retained.');return}
    // Geodesic buffer is measured on the ground, including Web Mercator maps.
    const area=geometryEngine.geodesicBuffer(geom,mode==='adjacent'?2:Number(mode),'feet') as __esri.Polygon
    let fs=await within(area);if(ticket!==operation.current)return
    if(mode==='adjacent')fs=fs.filter(f=>!geometryEngine.contains(geom,(f.geometry as __esri.Polygon).centroid))
    selected.current=new Map(fs.map(f=>[f.attributes[owners().objectIdField],f]));await showSelection();setAppliedMode(mode);if(ticket!==operation.current)return
    if(!areaLayer.current){areaLayer.current=new GraphicsLayer({title:'Notification area',listMode:'hide'});jmv.view.map.add(areaLayer.current)}areaLayer.current.removeAll();areaLayer.current.add(new Graphic({geometry:area,symbol:{type:'simple-fill',color:[0,0,0,0],outline:{color:'#187a89',width:2,style:'dash'}} as any}))
    await jmv.view.goTo(area.extent.clone().expand(1.5));setMessage(fs.length+' owner records selected.'+(mode==='adjacent'?' Adjacent is a 2-foot starting selection; add across-street parcels as needed.':' Subject owners are included. Review and adjust before generating.'))
  })}
  function pick(){cancelPick();if(!jmv||!caseNo)return;const view=jmv.view as __esri.MapView;view.container.style.cursor='crosshair';setMessage('Click parcels to '+action+'. Click Finish adjusting when done.')
    handle.current=view.on('click',event=>{event.stopPropagation();if(busy)return;const p=view.toMap({x:event.x,y:event.y});if(!p)return;void work(async ticket=>{const fs=await within(geometryEngine.buffer(p,view.resolution*3,'meters') as __esri.Polygon);if(ticket!==operation.current)return;fs.forEach(f=>{const id=f.attributes[owners().objectIdField];if(action==='remove')selected.current.delete(id);else selected.current.set(id,f)});await showSelection();setMessage(selected.current.size+' records selected. Continue clicking or finish adjusting.')})})
  }
  async function exportMap(){await work(async ticket=>{const geom=await subject();const ex=geom.extent;const width=ex.width*5;const height=width*cfg.frameHeight/cfg.frameWidth
    if(ex.height>height*.9)throw Error('This subject is too tall for 20% width in this frame. Choose a taller layout before exporting.')
    const center=ex.center
    // First fit the complete subject to 20% of the print-frame width.
    const extent=new Extent({xmin:center.x-width/2,xmax:center.x+width/2,ymin:center.y-height/2,ymax:center.y+height/2,spatialReference:ex.spatialReference})
    const div=document.createElement('div');Object.assign(div.style,{position:'fixed',left:'-10000px',top:'0',width:'900px',height:(900*cfg.frameHeight/cfg.frameWidth)+'px'});document.body.appendChild(div)
    const printLayers=jmv.view.map.layers.filter(l=>l.title!=='Notification area').map(l=>(l as any).clone())
    printLayers.forEach((l:any)=>{if(l.id===cfg.caseLayerId){if(cfg.caseServiceUrl)l.url=cfg.caseServiceUrl;l.definitionExpression=cfg.caseField+" = '"+caseRef.current.replace(/'/g,"''")+"'"}})
    const map=new ArcGISMap({basemap:jmv.view.map.basemap.clone(),layers:printLayers})
    // Suppress the city/place-name symbol layers in the PDF's private basemap.
    // Street labels remain; the interactive/shared web map is not changed.
    await Promise.all([...map.basemap.baseLayers.toArray(),...map.basemap.referenceLayers.toArray()].filter(l=>l.type==='vector-tile').map(async(l:any)=>{
      await l.load();const style=l.currentStyleInfo?.style
      for(const item of style?.layers||[]){if(item.type==='symbol'&&/city|settlement|populated/i.test(item.id))l.setStyleLayerVisibility(item.id,'none')}
    }))
    const printView=new MapView({container:div,map,extent,rotation:0,ui:{components:[]},constraints:{snapToZoom:false}})
    try{await printView.when();await printView.goTo(extent,{animate:false});if(ticket!==operation.current)return
      // Convert the SDK view scale from its CSS-pixel frame to the physical
      // template frame. PrintingTools expects this SDK/projection scale; a
      // separate geodesic scale here would enlarge a Web Mercator print.
      const exactScale=printView.scale*printView.width/(cfg.frameWidth*96)
      if(!Number.isFinite(exactScale)||exactScale<=0)throw Error('Unable to calculate the printed scale.')
      const scaleStep=cfg.scaleStep||1200;const roundedScale=Math.max(cfg.minPrintScale||2400,Math.ceil(exactScale/scaleStep)*scaleStep)
      // PrintingTools reuses the original vector-tile style URL. Capture the
      // styled, north-up print view at 300 dpi to preserve suppressed city names.
      await printView.goTo(extent.clone().expand(roundedScale/exactScale),{animate:false})
      await reactiveUtils.whenOnce(()=>!printView.updating)
      const mapScreenshot=await printView.takeScreenshot({width:Math.round(cfg.frameWidth*300),height:Math.round(cfg.frameHeight*300),format:'png'})
      if(ticket!==operation.current)return
      const logoData=await esriRequest(new URL('/widgets/pds-public-notice/dist/runtime/assets/city-logo.png',window.location.origin).href,{responseType:'array-buffer'})
      const groundLine=new Polyline({paths:[[[extent.xmin,center.y],[extent.xmax,center.y]]],spatialReference:ex.spatialReference})
      const groundFeet=geometryEngine.geodesicLength(groundLine,'meters')*3.280839895*(roundedScale/exactScale)
      const feetPerPoint=groundFeet/(cfg.frameWidth*72)
      const credits=Array.from(new Set(map.allLayers.toArray().map((l:any)=>l.copyright).filter(Boolean))).join('; ')
      const bytes=await makeNoticePdf(mapScreenshot.dataUrl,logoData.data,caseRef.current,feetPerPoint,credits)
      if(ticket!==operation.current)return
      if(pdfBlob.current)URL.revokeObjectURL(pdfBlob.current);pdfBlob.current=URL.createObjectURL(new Blob([bytes as any],{type:'application/pdf'}));setPdf(pdfBlob.current)
      const a=document.createElement('a');a.href=pdfBlob.current;a.download=caseRef.current+'_VM.pdf';a.click()
      setMessage('Location map downloaded with a QR code linking to '+caseRef.current+' in the Property Information map. Scan it to confirm the correct case opens.')
    }finally{printView.destroy();div.remove()}
  })}
  async function generate(){await work(async ticket=>{cancelPick();if(!selected.current.size)throw Error('Select recipients first. An empty selection never exports all parcels.')
    if(appliedMode!==mode)throw Error('Run the chosen selection method before exporting its list.')
    const captured=Array.from(selected.current.values()).map(f=>({...f.attributes,SOURCE_OID:f.attributes[owners().objectIdField]}));const cleaned=cleanup(captured);const zip=new JSZip();const prefix=caseRef.current
    // ML is the cleaned list; ML_<selection> preserves the raw selection,
    // following the production DBF naming stem in a modern CSV format.
    const selectionName=mode==='adjacent'?'ADJ':mode==='custom'?'CUSTOM':mode
    const rawColumns=Array.from(new Set(captured.flatMap(row=>Object.keys(row))))
    zip.file(prefix+'_ML.csv',csv(cleaned.rows,fields))
    zip.file(prefix+'_ML_'+selectionName+'.csv',csv(captured,rawColumns))
    const blob=await zip.generateAsync({type:'blob'});if(ticket!==operation.current)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=prefix+'_ML.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);setResult(cleaned);setMessage('Downloaded '+prefix+'_ML.csv - cleaned mailing list, and '+prefix+'_ML_'+selectionName+'.csv - original selection record.')
  })}
  const button=(label:string,fn:()=>void,disabled=false)=><button type="button" disabled={busy||disabled} onClick={fn} style={{padding:'10px 12px',border:'1px solid '+((busy||disabled)?'#46515d':'#399aaa'),borderRadius:4,background:(busy||disabled)?'#303943':'#176b78',color:(busy||disabled)?'#aebbc8':'#ffffff',width:'100%',margin:'5px 0',cursor:'pointer'}}>{label}</button>
  return <div className="jimu-widget pds-notice-dark" style={{colorScheme:'dark',height:'100%',overflowY:'auto',padding:16,fontSize:14,color:'#e8eef4',background:'#18212b'}}>
    <style>{`
      .pds-notice-dark { scrollbar-color: #647585 #18212b; }
      .pds-notice-dark hr { border: 0; border-top: 1px solid #465565; margin: 18px 0; }
      .pds-notice-dark a { color: #8ee0eb; text-decoration: underline; }
      .pds-notice-dark input[type=radio] { accent-color: #67d5df; }
      .pds-notice-dark select { background: #25313e; color: #eef4fa; border: 1px solid #647585; border-radius: 4px; padding: 5px; }
      .pds-notice-dark button:hover:not(:disabled) { filter: brightness(1.18); }
      .pds-notice-dark button:focus-visible, .pds-notice-dark select:focus-visible, .pds-notice-dark input:focus-visible { outline: 2px solid #8ee0eb; outline-offset: 2px; }
      [data-layoutid="layout_7"] { background: #18212b !important; }
      [data-widgetid="widget_18"] .search-con-Style1 { background: #25313e !important; border-color: #647585 !important; }
      [data-widgetid="widget_18"] .input-wrapper { background: #25313e !important; }
      [data-widgetid="widget_18"] { background: #18212b; color: #e8eef4; color-scheme: dark; }
      [data-widgetid="widget_18"] input { background: #25313e !important; color: #eef4fa !important; }
      [data-widgetid="widget_18"] input::placeholder { color: #bcc9d5 !important; opacity: 1; }
      [data-widgetid="widget_18"] button { background: #25313e; color: #eef4fa; }
    `}</style>
    {props.useMapWidgetIds?.[0]&&<JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds[0]} onActiveViewChange={setJmv}/>}
    {props.useDataSources?.map((u,i)=><DataSourceComponent key={u.dataSourceId} useDataSource={u} widgetId={props.id} onSelectionChange={i===1?(ids)=>tableSelection(ids.asMutable()):(ids)=>{if(ids.length)searchEditing.current=false}}/>)}
    <div style={{fontWeight:600,marginBottom:12}}>{caseNo||'Find your case above'}</div>
    <h3 style={{fontSize:17,color:'#ffffff'}}>2. Location map</h3><p>Confirm subject location. Click below to generate a location map.</p>
    {button('Generate location map PDF',()=>void exportMap(),!caseNo||!jmv)}
    {pdf&&<a href={pdf} target="_blank" rel="noreferrer">Open location map PDF</a>}
    <hr/><h3 style={{fontSize:17,color:'#ffffff'}}>3. Select mailing area</h3>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>{[['300','300 feet'],['600','600 feet'],['adjacent','Adjacent'],['custom','Custom']].map(([v,label])=><label key={v} style={{padding:8,border:'1px solid '+(mode===v?'#69d1db':'#536170'),borderRadius:4,background:mode===v?'#204b55':'#25313e'}}><input type="radio" name={props.id+'distance'} value={v} checked={mode===v} disabled={busy} onChange={()=>{cancelPick();setMode(v);setResult(null)}}/> {label}</label>)}</div>
    {button(mode==='custom'?'Start custom selection':'Run selection',()=>void run(),!caseNo||!jmv)}
    <div style={{display:'flex',gap:8,alignItems:'center'}}><label>Adjust: <select aria-label="Selection adjustment" value={action} disabled={busy} onChange={e=>{cancelPick();setAction(e.target.value)}}><option value="add">Add parcels</option><option value="remove">Remove parcels</option></select></label></div>
    {button('Pick parcels on map',pick,!caseNo)}{button('Finish adjusting',()=>{cancelPick();setMessage(count+' records ready for review.')},!caseNo)}
    <strong>{count} owner records selected</strong>
    <hr/><h3 style={{fontSize:17,color:'#ffffff'}}>4. Mailing list</h3><p>Generate the cleaned mailing list as a CSV. Matching destinations are combined and distinct owners stay separate. The download also includes a raw CSV of the selected owner records for your case files.</p>
    {button('Generate mailing list',()=>void generate(),!count||appliedMode!==mode)}
    {result&&<p>{result.rows.length} mailing destinations - CSV ready to use</p>}
    <div role="status" aria-live="polite" style={{marginTop:12,padding:10,background:'#253442',borderRadius:4}}>{message}</div>
  </div>
}







