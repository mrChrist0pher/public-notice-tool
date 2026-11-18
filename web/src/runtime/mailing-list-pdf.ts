import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import { fields } from './cleanup'

export interface MailingPdfOptions {
  caseNo:string
  selection:string
  generatedAt:Date
  regularFont:Uint8Array
  boldFont:Uint8Array
}

// Uses the SAME cleaned rows and eight fields as the CSV, never source records
// or a second query. No cleanup, sorting or deduplication occurs in this module.
// Tagged structure is built in; PDF/UA acceptance still requires PAC and manual
// screen-reader review. Do not assert conformance just because tags are present.
export function makeMailingListPdf(rows:any[], options:MailingPdfOptions):Promise<Uint8Array> {
  return new Promise((resolve,reject)=>{
    const chunks:Uint8Array[]=[]
    let doc:any
    try{
      doc=new PDFDocument({autoFirstPage:false,bufferPages:true,pdfVersion:'1.7',tagged:true,lang:'en-US',displayTitle:true,
        size:'LETTER',layout:'landscape',margins:{top:32,bottom:38,left:32,right:32},
        info:{Title:options.caseNo+' Mailing List',Author:'City of Boulder P&DS GIS',CreationDate:options.generatedAt}})
      doc.on('error',reject)
      doc.on('data',(chunk:Uint8Array)=>chunks.push(new Uint8Array(chunk)))
      doc.on('end',()=>{const out=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length}resolve(out)})
      doc.registerFont('NoticeRegular',options.regularFont)
      doc.registerFont('NoticeBold',options.boldFont)
      doc.font('NoticeRegular').fontSize(10)
      // Never silently replace an unsupported character with an empty square.
      // Preserve the CSV and surface an actionable PDF error instead.
      const textValues=[options.caseNo,options.selection,...rows.flatMap(row=>fields.map(f=>String(row[f]??'')))]
      for(const value of textValues)for(const char of value){
        const cp=char.codePointAt(0) as number
        if(!/\s/.test(char)&&!doc._font.font.hasGlyphForCodePoint(cp))throw Error('PDF font does not support character U+'+cp.toString(16).toUpperCase()+'. The CSV preserves the original value; contact P&DS GIS for PDF support.')
      }
      const root=doc.struct('Document');doc.addStructure(root)
      const date=options.generatedAt.toLocaleString('en-US',{timeZone:'America/Denver',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})
      const left=32,bottom=556,columns=[120,108,120,82,90,38,76,94],padding=5
      let y=0,table:any,pageNo=0
      const artifact=(draw:()=>void)=>{doc.markContent('Artifact',{type:'Layout'});draw();doc.endMarkedContent()}
      function tagged(parent:any,type:string,value:string,draw:()=>void){
        const node=doc.struct(type,{actual:value});parent.add(node)
        node.add(doc.markStructureContent(type));draw();doc.endMarkedContent();node.end()
      }
      function page(first:boolean){
        doc.addPage();pageNo++
        if(first){
          tagged(root,'H1',options.caseNo+' Mailing List',()=>doc.font('NoticeBold').fontSize(17).fillColor('#172c36').text(options.caseNo+' Mailing List ',left,28,{width:728}))
          const metadata='Generated '+date+' | '+rows.length+' cleaned mailing destinations | '+options.selection
          tagged(root,'P',metadata,()=>doc.font('NoticeRegular').fontSize(10).fillColor('#172c36').text(metadata+' ',left,55,{width:728}))
          y=Math.max(88,doc.y+14)
        }else{
          artifact(()=>doc.font('NoticeBold').fontSize(12).fillColor('#172c36').text(options.caseNo+' Mailing List continued',left,28,{width:728}))
          y=60
        }
      }
      function wrap(value:string,width:number,size:number){
        doc.font('NoticeRegular').fontSize(size)
        const lines:string[]=[]
        // Preserve source values in ActualText. Visual wrapping can break a long
        // token at any character; it never clips or truncates an address.
        for(const paragraph of value.replace(/\r\n?/g,'\n').split('\n')){
          let line=''
          for(const word of paragraph.split(/\s+/).filter(Boolean)){
            if(line&&doc.widthOfString(line+' '+word)>width){lines.push(line);line=''}
            let part=''
            for(const char of word){
              if(part&&doc.widthOfString(part+char)>width){lines.push(part);part=char}else part+=char
            }
            line+=(line?' ':'')+part
          }
          lines.push(line)
        }
        return lines
      }
      function headings(first:boolean){
        const tr=first?doc.struct('TR'):null
        if(tr)table.add(tr)
        const height=27;let x=left
        fields.forEach((field,i)=>{
          artifact(()=>doc.rect(x,y,columns[i],height).fillAndStroke('#e8eef2','#b9c5cd'))
          const draw=()=>doc.font('NoticeBold').fontSize(8.5).fillColor('#172c36').text(field+' ',x+padding,y+7,{width:columns[i]-padding*2,lineBreak:false})
          if(first){const th=doc.struct('TH');th.dictionary.data.A={O:'Table',Scope:'Column'};tr.add(th);th.add(doc.markStructureContent('TH'));draw();doc.endMarkedContent();th.end()}
          else artifact(draw)
          x+=columns[i]
        })
        if(tr)tr.end();y+=height
      }
      page(true)
      if(!rows.length){tagged(root,'P','No mailing destinations remain after cleanup.',()=>doc.font('NoticeRegular').fontSize(11).text('No mailing destinations remain after cleanup. ',left,y,{width:728}))}
      else{
        table=doc.struct('Table',{title:'Cleaned mailing destinations'});root.add(table);headings(true)
        rows.forEach((row,index)=>{
          doc.font('NoticeRegular').fontSize(10)
          const lineHeight=doc.currentLineHeight(true)+1
          const cells=fields.map((f,i)=>wrap(String(row[f]??''),columns[i]-padding*2,10))
          const lineCount=Math.max(...cells.map(c=>c.length))
          const tr=doc.struct('TR');table.add(tr)
          const tds=fields.map(f=>{const td=doc.struct('TD',{actual:String(row[f]??'')});tr.add(td);return td})
          let offset=0
          // Usually a row stays together. Extremely long rows continue across
          // pages while retaining one logical TR and the same eight TD elements.
          if(lineCount*lineHeight+padding*2>bottom-y&&lineCount*lineHeight+padding*2<=bottom-87){page(false);headings(false)}
          while(offset<lineCount){
            let fits=Math.floor((bottom-y-padding*2)/lineHeight)
            if(fits<1){page(false);headings(false);fits=Math.floor((bottom-y-padding*2)/lineHeight)}
            const take=Math.min(fits,lineCount-offset),height=take*lineHeight+padding*2
            let x=left
            fields.forEach((field,i)=>{
              artifact(()=>doc.rect(x,y,columns[i],height).fillAndStroke(index%2?'#f4f7f9':'#ffffff','#b9c5cd'))
              const text=cells[i].slice(offset,offset+take).join('\n')
              if(text){
                tds[i].add(doc.markStructureContent('TD'))
                doc.font('NoticeRegular').fontSize(10).fillColor('#111111')
                // Lines were measured above. Drawing each line without another
                // wrapping pass avoids split tokens and unintended extra pages.
                text.split('\n').forEach((line,j)=>doc.text(line+' ',x+padding,y+padding+j*lineHeight,{lineBreak:false}))
                doc.endMarkedContent()
              }
              x+=columns[i]
            })
            y+=height;offset+=take
          }
          tds.forEach(td=>td.end());tr.end()
        })
        table.end()
      }
      root.end()
      const pages=doc.bufferedPageRange()
      for(let i=pages.start;i<pages.start+pages.count;i++){
        doc.switchToPage(i)
        // Footer is intentionally inside the bottom margin. Do not let PDFKit
        // interpret it as body overflow and manufacture an extra page.
        doc.page.margins.bottom=0
        artifact(()=>{doc.font('NoticeRegular').fontSize(8).fillColor('#344953').text('P&DS GIS Public Notice Web App | '+rows.length+' cleaned destinations',left,575,{width:570,lineBreak:false});doc.text('Page '+(i+1)+' of '+pages.count,650,575,{width:110,lineBreak:false,align:'right'})})
      }
      doc.end()
    }catch(error){if(doc)doc.destroy();reject(error)}
  })
}
