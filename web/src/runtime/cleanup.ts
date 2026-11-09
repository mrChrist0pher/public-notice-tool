// These rules mirror notice_cleanup.py. Source attributes are never overwritten.
export const fields = ['NAME','NAME2','ADDRESS','ADDRESS2','CITY','STATE','ZIP','COUNTRY']
const source = ['OwnerName','CareOf','MailAddr1','MailAddr2','MailCity','MailState','MailZip','MailCountry']
const states = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI AA AE AP FM MH PW'.split(' '))
const cu = new Set(['UNIVERSITY OF COLORADO','REGENTS OF THE UNIVERSITY OF COLO','REGENTS OF THE UNIVERSITY OF COLORADO','REGENTS OF THE UNIVERSITY OF COLORADO TH','REGENTS OF UNIVERSITY OF COLORADO','THE REGENTS OF THE UNIVERSITY OF COLORADO','UNIVERSITY OF COLORADO REGENTS'])
const text = (v: any) => v == null ? '' : String(v).replace(/\s+/g,' ').trim()
export function cleanup(records: any[]) {
  const groups = new Map<string,any>(); const audit: any[] = []
  records.forEach(raw => {
    const row: any = {}; const changes: string[] = []; const flags: string[] = []
    // RULE 1: Trim whitespace, preserve punctuation, legal names, units and ZIP zeros.
    fields.forEach((f,i) => { row[f]=text(raw[source[i]]); if(raw[source[i]] == null || String(raw[source[i]])!==row[f]) changes.push('Whitespace/null formatting: '+f) })
    if(states.has(row.STATE.toUpperCase()) && row.STATE!==row.STATE.toUpperCase()) {row.STATE=row.STATE.toUpperCase();changes.push('Uppercase recognized state code')}
    // RULE 2: Exclude only the exact approved City owner identity.
    const owner=row.NAME.toUpperCase(); const exclusion=owner==='CITY OF BOULDER'?'Exact approved City of Boulder owner identity':''
    // RULE 3: Apply confirmed CU aliases only; retain Foundation/Health for review.
    if(cu.has(owner) || (owner==='REGENTS OF THE UNIVERSITY' && row.ADDRESS.toUpperCase()==='OF COLORADO')) {
      Object.assign(row,{NAME:'UNIVERSITY OF COLORADO',NAME2:'ATTN PLANNING',ADDRESS:'453 UCB',ADDRESS2:'',CITY:'BOULDER',STATE:'CO',ZIP:'80309',COUNTRY:''});changes.push('Approved CU Planning destination override (2026-09-22)')
    } else if(owner.includes('UNIVERSITY OF COLORADO') || owner==='BOULDER CITY OF') flags.push('Possible institutional alias: no automatic exclusion/override')
    // RULE 4: Preserve care-of and both delivery lines. Flag ambiguity rather than guess.
    if(row.ADDRESS2) flags.push('Two-line address: review owner/attention/delivery placement')
    if(row.ADDRESS && !/^(\d|P\.?\s*O\.?\s*(BOX|B)|POST OFFICE|RR\b|HC\b)/i.test(row.ADDRESS)) flags.push('First delivery line needs review')
    ;['NAME','ADDRESS','CITY','STATE','ZIP'].forEach(f=>{if(!row[f])flags.push('Missing '+f)})
    if(row.STATE && !states.has(row.STATE)) flags.push('Unrecognized US state/region: check international layout')
    if(['00000','00000-0000'].includes(row.ZIP)) flags.push('Placeholder postal code')
    else if(row.ZIP && !/^\d{5}(-\d{4})?$/.test(row.ZIP))flags.push('Non-US-format postal code: preserve and review')
    if(row.COUNTRY && !['US','USA','UNITED STATES','UNITED STATES OF AMERICA'].includes(row.COUNTRY.toUpperCase()))flags.push('International mailing: verify country/layout')
    // RULE 5: Combine identical destinations, allowing ZIP5/+4 variants only.
    // Distinct trusts, LLCs, care-of names and unit numbers always stay separate.
    const domestic=states.has(row.STATE)&&['','US','USA','UNITED STATES','UNITED STATES OF AMERICA'].includes(row.COUNTRY.toUpperCase())
    const key=JSON.stringify(fields.map(f=>f==='ZIP'&&domestic&&/^\d{5}(-\d{4})?$/.test(row.ZIP)?row.ZIP.slice(0,5):row[f]))
    let g:any
    if(!exclusion){g=groups.get(key);if(!g){g={MAIL_ID:'M'+String(groups.size+1).padStart(5,'0'),row:{...row},ids:[],zips:new Set(),flags:new Set()};groups.set(key,g)}g.ids.push(raw.SOURCE_OID);g.zips.add(row.ZIP);flags.forEach(f=>g.flags.add(f))}
    audit.push({SOURCE_OID:raw.SOURCE_OID,AccountNo:raw.AccountNo,ParcelNo:raw.ParcelNo,MAIL_ID:g?.MAIL_ID||'',EXCLUSION:exclusion,CHANGES:changes.join('; '),REVIEW_FLAGS:flags.join('; '),RAW_JSON:JSON.stringify(raw),...row})
  })
  const rows:any[]=[];const review:any[]=[]
  groups.forEach(g=>{const full=Array.from(g.zips).filter((z:string)=>/^\d{5}-\d{4}$/.test(z)).sort() as string[]
    if(full.length===1)g.row.ZIP=full[0]
    if(full.length>1){g.row.ZIP=full[0].slice(0,5);g.flags.add('Conflicting ZIP+4 extensions merged to ZIP5: verify destination')}
    const row={MAIL_ID:g.MAIL_ID,...g.row};rows.push(row)
    if(g.flags.size)review.push({...row,SOURCE_OIDS:g.ids.join(';'),ORIGINAL_ZIPS:Array.from(g.zips).sort().join('; '),REVIEW_FLAGS:Array.from(g.flags).sort().join('; ')})
    audit.filter(a=>a.MAIL_ID===g.MAIL_ID).forEach(a=>{a.OUTPUT_ZIP=g.row.ZIP;if(g.zips.size>1){a.CHANGES+='; ZIP5/ZIP+4 variants merged; original retained in audit';a.REVIEW_FLAGS=Array.from(g.flags).sort().join('; ')}})
  })
  return {rows,review,audit}
}
// CSV cells beginning with formula characters are escaped for spreadsheet safety.
// The untouched source string is also preserved in the audit's RAW_JSON object.
export function csv(rows:any[], columns:string[]) {
  const cell=(v:any)=>{let s=v==null?'':String(v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  return '\ufeff'+[columns,...rows.map(r=>columns.map(f=>r[f]))].map(r=>r.map(cell).join(',')).join('\r\n')
}
