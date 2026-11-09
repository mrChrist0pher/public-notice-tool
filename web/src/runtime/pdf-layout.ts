import { PDFDocument, PDFString, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

export const propertyInfoUrl=(caseNo:string)=>'https://maps.bouldercolorado.gov/property-information/?caseno='+encodeURIComponent(caseNo)

// Letter portrait, matching the Pro export's large rectangular frame and footer.
// All map/scale distances are supplied by the map widget; this module only lays
// them out. No printed representative fraction is added.
export async function makeNoticePdf(mapImage:string,logoBytes:ArrayBuffer,caseNo:string,feetPerPoint:number,attribution:string){
  const doc=await PDFDocument.create();doc.setAuthor('City of Boulder');doc.setTitle(caseNo+' Vicinity Map')
  const page=doc.addPage([612,792]);const regular=await doc.embedFont(StandardFonts.Helvetica);const bold=await doc.embedFont(StandardFonts.HelveticaBold)
  const black=rgb(0,0,0),gray=rgb(.7,.7,.7)
  const title='City of Boulder Vicinity Map'
  page.drawText(title,{x:(612-regular.widthOfTextAtSize(title,21))/2,y:762,size:21,font:regular,color:black})
  page.drawImage(await doc.embedPng(mapImage),{x:18,y:135,width:576,height:612})
  page.drawRectangle({x:18,y:135,width:576,height:612,borderWidth:.7,borderColor:black})
  page.drawText(caseNo,{x:18,y:119,size:12,font:regular,color:black})
  page.drawText(new Date().toLocaleDateString('en-US',{timeZone:'America/Denver',year:'numeric',month:'long',day:'numeric'}),{x:18,y:103,size:8,font:regular,color:black})
  page.drawRectangle({x:165,y:113,width:21,height:11,color:gray,borderColor:black,borderWidth:1.2})
  page.drawText('Subject Area',{x:192,y:114,size:11,font:regular,color:black})
  page.drawRectangle({x:165,y:95,width:21,height:11,borderColor:rgb(.6,.6,.6),borderWidth:.5})
  page.drawText('Parcels',{x:192,y:96,size:11,font:regular,color:black})
  // Larger Pro logo at bottom right. North arrow and scale bar share this row,
  // above source text, rather than leaving the arrow below the text.
  page.drawImage(await doc.embedPng(logoBytes),{x:532,y:77,width:56,height:56})
  const nx=508,ny=100
  page.drawLine({start:{x:nx,y:ny-3},end:{x:nx,y:ny+24},thickness:1,color:black})
  page.drawLine({start:{x:nx,y:ny+24},end:{x:nx-6,y:ny+4},thickness:1,color:black})
  page.drawLine({start:{x:nx,y:ny+24},end:{x:nx+6,y:ny+4},thickness:1,color:black})
  page.drawText('N',{x:nx-3,y:ny-14,size:9,font:regular,color:black})
  const target=95*feetPerPoint,mag=Math.pow(10,Math.floor(Math.log10(target)))
  const total=[1,2,5,10].map(n=>n*mag).filter(n=>n<=target).pop()||mag
  const width=total/feetPerPoint,bx=388,by=105
  page.drawLine({start:{x:bx,y:by},end:{x:bx+width,y:by},thickness:.8,color:black})
  for(let i=0;i<=2;i++){const x=bx+width*i/2;page.drawLine({start:{x,y:by-2},end:{x,y:by+2},thickness:.8,color:black});page.drawText(String(total*i/2)+(i===2?' ft':''),{x:x-2,y:by-12,size:6,font:regular,color:black})}
  // Keep source attribution, replacing the legacy personal contact reference.
  const credits=attribution.replace(/Information Resources\s*-\s*contact Brett Hill for more info/gi,'').replace(/Contact City of Boulder/gi,'').replace(/Brett Hill/gi,'City of Boulder').replace(/[^\x20-\x7e\xa0-\xff]/g,' ').replace(/\s+/g,' ').trim()
  let y=64,line=''
  for(const word of credits.split(' ')){if(regular.widthOfTextAtSize((line?line+' ':'')+word,4.5)>206){page.drawText(line,{x:388,y,size:4.5,font:regular,color:black});y-=5.5;line=word}else line+=(line?' ':'')+word}
  if(line)page.drawText(line,{x:388,y,size:4.5,font:regular,color:black})
  // Right-aligned credit sits below attribution in the source column.
  const credit='Generated with City of Boulder Public Notice Tool'
  page.drawText(credit,{x:594-regular.widthOfTextAtSize(credit,6),y:Math.min(23,y-12),size:6,font:regular,color:black})
  // Generate from the selected case every export, using the same URL for the
  // QR, printed link and clickable PDF annotation. Four modules of quiet zone
  // keep surrounding footer text out of the code's scanning area.
  const url=propertyInfoUrl(caseNo)
  const qrData=await QRCode.toDataURL(url,{errorCorrectionLevel:'M',margin:4,width:512,color:{dark:'#000000',light:'#ffffff'}})
  page.drawImage(await doc.embedPng(qrData),{x:18,y:35,width:64,height:64})
  page.drawText('Scan to',{x:32,y:26,size:7,font:regular,color:black})
  page.drawText('view case',{x:29,y:18,size:7,font:regular,color:black})
  page.drawText(url,{x:18,y:7,size:5,font:regular,color:rgb(.05,.3,.5)})
  page.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[18,35,82,99],Border:[0,0,0],A:{S:'URI',URI:PDFString.of(url)}})))
  return doc.save()
}
