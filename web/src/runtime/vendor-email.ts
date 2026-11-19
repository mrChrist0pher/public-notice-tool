// MAILTO ONLY: Request a draft in the user's configured email application.
// This never sends mail, authenticates to Microsoft, or attaches local files.
export function vendorEmailUrl(caseNo:string, count:number, greeting='Hello', recipient='', cc='') {
  if(!caseNo.trim()||!Number.isSafeInteger(count)||count<=0)throw Error('Generate a non-empty mailing list before preparing email.')
  const to=recipient.trim()
  // A locally configured single vendor address is optional. Reject header
  // injection and malformed addresses rather than opening a misleading draft.
  if(to&&!/^[^\s@<>?,;:#]+@[^\s@<>?,;:#]+\.[^\s@<>?,;:#]+$/.test(to))throw Error('Check the configured mailing vendor email address.')
  const copy=cc.trim()
  if(copy&&!/^[^\s@<>?,;:#]+@[^\s@<>?,;:#]+\.[^\s@<>?,;:#]+$/.test(copy))throw Error('Check the configured CC email address.')
  const singleLine=(value:string)=>value.replace(/[\r\n]+/g,' ').trim()
  const subject='Public notice mailing - '+singleLine(caseNo)
  const body=[
    singleLine(greeting)+',','',
    'Please print and mail the attached public notice for case '+singleLine(caseNo)+' to the recipients listed in the attached mailing list.','',
    'Mailing destinations: '+count,
    '',
    'Requested mailing date: [enter date]',
    '',
    'Please let me know if you need any additional information.','',
    'Thank you,'
  ].join('\r\n')
  return 'mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subject)+(copy?'&cc='+encodeURIComponent(copy):'')+'&body='+encodeURIComponent(body)
}
