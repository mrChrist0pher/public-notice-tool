// MAILTO ONLY: Request a draft in the user's configured email application.
// This never sends mail, authenticates to Microsoft, or attaches local files.
export function vendorEmailUrl(caseNo:string, count:number, selection:string, recipient='') {
  if(!caseNo.trim()||!Number.isSafeInteger(count)||count<=0)throw Error('Generate a non-empty mailing list before preparing email.')
  const to=recipient.trim()
  // A locally configured single vendor address is optional. Reject header
  // injection and malformed addresses rather than opening a misleading draft.
  if(to&&!/^[^\s@<>?,;:#]+@[^\s@<>?,;:#]+\.[^\s@<>?,;:#]+$/.test(to))throw Error('Check the configured mailing vendor email address.')
  const singleLine=(value:string)=>value.replace(/[\r\n]+/g,' ').trim()
  const subject='Public notice mailing - '+singleLine(caseNo)
  const body=[
    'Hello,','',
    'Please print and mail the public notice for case '+singleLine(caseNo)+'.','',
    'Cleaned mailing destinations: '+count,
    'Selection: '+singleLine(selection),
    '',
    '[Add the requested mailing date and billing/project information.]','',
    'Thank you.'
  ].join('\r\n')
  return 'mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)
}
