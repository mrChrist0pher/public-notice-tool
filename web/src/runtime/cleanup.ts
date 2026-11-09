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
    // RULE 2: Uppercase recognized state codes; do not guess unknown states.
    if(states.has(row.STATE.toUpperCase()) && row.STATE!==row.STATE.toUpperCase()) {row.STATE=row.STATE.toUpperCase();changes.push('Uppercase recognized state code')}
    // RULE 3: Exclude only the exact approved City owner identity, not similar names.
    const owner=row.NAME.toUpperCase(); let exclusion=owner==='CITY OF BOULDER'?'Exact approved City of Boulder owner identity':''
    // RULE 4: Route confirmed CU aliases to the approved Planning destination.
    // Keep Foundation/Health and unconfirmed aliases at their source addresses.
    if(cu.has(owner) || (owner==='REGENTS OF THE UNIVERSITY' && row.ADDRESS.toUpperCase()==='OF COLORADO')) {
      Object.assign(row,{NAME:'UNIVERSITY OF COLORADO',NAME2:'ATTN PLANNING',ADDRESS:'453 UCB',ADDRESS2:'',CITY:'BOULDER',STATE:'CO',ZIP:'80309',COUNTRY:''});changes.push('Approved CU Planning destination override (2026-09-22)')
    } else if(owner.includes('UNIVERSITY OF COLORADO') || owner==='BOULDER CITY OF') flags.push('Possible institutional alias: no automatic exclusion/override')
    // RULE 5: Exclude a record from the CLEANED list if both delivery lines are blank.
    // Check after whitespace cleanup and the approved CU destination override.
    // A PO box or populated second line counts as an address; never invent one.
    // Original attributes remain unchanged in memory; the web download is cleaned CSV only.
    if(!exclusion && !row.ADDRESS && !row.ADDRESS2) exclusion='No mailing address: both delivery lines are blank'
    // RULE 6: Preserve care-of and both delivery lines; do not move or guess text.
    // The following diagnostics stay internal; no web review file is downloaded.
    if(row.ADDRESS2) flags.push('Two-line address: review owner/attention/delivery placement')
    // RULE 7: Keep unusual nonblank addresses; identify them internally instead of guessing.
    if(row.ADDRESS && !/^(\d|P\.?\s*O\.?\s*(BOX|B)|POST OFFICE|RR\b|HC\b)/i.test(row.ADDRESS)) flags.push('First delivery line needs review')
    // RULE 8: Other missing fields produce internal diagnostics, not exclusions.
    // Missing city or ZIP alone does not trigger the blank-address exclusion.
    ;['NAME','ADDRESS','CITY','STATE','ZIP'].forEach(f=>{if(!row[f])flags.push('Missing '+f)})
    // RULE 9: Preserve unknown state/region text rather than correcting it blindly.
    if(row.STATE && !states.has(row.STATE)) flags.push('Unrecognized US state/region: check international layout')
    // RULE 10: Preserve postal text and leading zeros; record unusual formats internally.
    if(['00000','00000-0000'].includes(row.ZIP)) flags.push('Placeholder postal code')
    else if(row.ZIP && !/^\d{5}(-\d{4})?$/.test(row.ZIP))flags.push('Non-US-format postal code: preserve and review')
    // RULE 11: Preserve the supplied country; do not fill a blank country with US.
    if(row.COUNTRY && !['US','USA','UNITED STATES','UNITED STATES OF AMERICA'].includes(row.COUNTRY.toUpperCase()))flags.push('International mailing: verify country/layout')
    // RULE 12: Combine matching destinations; only domestic ZIP5/+4 differences may vary.
    // Distinct trusts, LLCs, care-of names and unit numbers always stay separate.
    const domestic=states.has(row.STATE)&&['','US','USA','UNITED STATES','UNITED STATES OF AMERICA'].includes(row.COUNTRY.toUpperCase())
    const key=JSON.stringify(fields.map(f=>f==='ZIP'&&domestic&&/^\d{5}(-\d{4})?$/.test(row.ZIP)?row.ZIP.slice(0,5):row[f]))
    let g:any
    if(!exclusion){g=groups.get(key);if(!g){g={MAIL_ID:'M'+String(groups.size+1).padStart(5,'0'),row:{...row},ids:[],zips:new Set(),flags:new Set()};groups.set(key,g)}g.ids.push(raw.SOURCE_OID);g.zips.add(row.ZIP);flags.forEach(f=>g.flags.add(f))}
    // RULE 13: Audit every source record, including exclusions and their reasons.
    audit.push({SOURCE_OID:raw.SOURCE_OID,AccountNo:raw.AccountNo,ParcelNo:raw.ParcelNo,MAIL_ID:g?.MAIL_ID||'',EXCLUSION:exclusion,CHANGES:changes.join('; '),REVIEW_FLAGS:flags.join('; '),RAW_JSON:JSON.stringify(raw),...row})
  })
  const rows:any[]=[];const review:any[]=[]
  groups.forEach(g=>{const full=Array.from(g.zips).filter((z:string)=>/^\d{5}-\d{4}$/.test(z)).sort() as string[]
    // RULE 14: Use the sole supplied ZIP+4 for a merged destination.
    if(full.length===1)g.row.ZIP=full[0]
    // RULE 15: Conflicting extensions fall back to their common ZIP5; keep originals in audit.
    if(full.length>1){g.row.ZIP=full[0].slice(0,5);g.flags.add('Conflicting ZIP+4 extensions merged to ZIP5: verify destination')}
    const row={MAIL_ID:g.MAIL_ID,...g.row};rows.push(row)
    if(g.flags.size)review.push({...row,SOURCE_OIDS:g.ids.join(';'),ORIGINAL_ZIPS:Array.from(g.zips).sort().join('; '),REVIEW_FLAGS:Array.from(g.flags).sort().join('; ')})
    audit.filter(a=>a.MAIL_ID===g.MAIL_ID).forEach(a=>{a.OUTPUT_ZIP=g.row.ZIP;if(g.zips.size>1){a.CHANGES+='; ZIP5/ZIP+4 variants merged; original retained in audit';a.REVIEW_FLAGS=Array.from(g.flags).sort().join('; ')}})
  })
  return {rows,review,audit}
}
// RULE 16: Escape formula-like CSV values so spreadsheet software treats them as text.
// Original values are retained in the internal audit object, not a web download.
export function csv(rows:any[], columns:string[]) {
  const cell=(v:any)=>{let s=v==null?'':String(v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  return '\ufeff'+[columns,...rows.map(r=>columns.map(f=>r[f]))].map(r=>r.map(cell).join(',')).join('\r\n')
}
