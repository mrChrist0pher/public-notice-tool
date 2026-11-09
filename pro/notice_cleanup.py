"""List cleanup shared by the four-step toolbox. Original inputs stay in audit."""
import re


MAILING_FIELDS = ('NAME', 'NAME2', 'ADDRESS', 'ADDRESS2', 'CITY', 'STATE', 'ZIP', 'COUNTRY')

OWNER_FIELDS = ('OwnerName', 'CareOf', 'MailAddr1', 'MailAddr2',
                'MailCity', 'MailState', 'MailZip', 'MailCountry')

US_STATES = set(('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI '
                 'MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT '
                 'VA WA WV WI WY AS GU MP PR VI AA AE AP FM MH PW').split())

CITY_OWNER_ALIASES = {'CITY OF BOULDER'}

CU_OWNER_ALIASES = {
    'UNIVERSITY OF COLORADO',
    'REGENTS OF THE UNIVERSITY OF COLO',
    'REGENTS OF THE UNIVERSITY OF COLORADO',
    'REGENTS OF THE UNIVERSITY OF COLORADO TH',
    'REGENTS OF UNIVERSITY OF COLORADO',
    'THE REGENTS OF THE UNIVERSITY OF COLORADO',
    'UNIVERSITY OF COLORADO REGENTS',
}

def _clean_text(value):
    # RULE C01: Trim/collapse whitespace only. Preserve spelling, punctuation,
    # owner identity, units, leading postal zeros and full ZIP+4 as text.
    return '' if value is None else ' '.join(str(value).split())

def _clean_recipient(raw):
    """Return candidate, change reasons, review flags and exclusion reason."""
    clean = dict(zip(MAILING_FIELDS, (_clean_text(raw[f]) for f in OWNER_FIELDS)))
    changes = [f'Whitespace/null formatting: {dst}'
               for src, dst in zip(OWNER_FIELDS, MAILING_FIELDS)
               if raw[src] is None or str(raw[src]) != clean[dst]]
    flags = []
    # RULE C02: Uppercase recognized US state abbreviations; do not guess C0=CO
    # or infer a country. Full source postal text stays intact.
    if clean['STATE'].upper() in US_STATES and clean['STATE'] != clean['STATE'].upper():
        clean['STATE'] = clean['STATE'].upper()
        changes.append('Uppercase recognized state code')

    owner_key = clean['NAME'].upper()
    # RULE: Exclude only the exact approved City identity, not similar owner names.
    if owner_key in CITY_OWNER_ALIASES:
        return clean, changes, flags, 'Exact approved City of Boulder owner identity'
    # RULE: Route confirmed CU aliases to the approved Planning destination.
    # Keep Foundation/Health and unconfirmed aliases at their source addresses.
    if (owner_key in CU_OWNER_ALIASES
            or (owner_key == 'REGENTS OF THE UNIVERSITY'
                and clean['ADDRESS'].upper() == 'OF COLORADO')):
        # Approved institutional destination, recorded September 22. Preserve
        # the original owner/address in the audit, then deduplicate this result.
        clean.update(NAME='UNIVERSITY OF COLORADO', NAME2='ATTN PLANNING',
                     ADDRESS='453 UCB', ADDRESS2='', CITY='BOULDER', STATE='CO',
                     ZIP='80309', COUNTRY='')
        changes.append('Approved CU Planning destination override (2026-09-22)')
    elif 'UNIVERSITY OF COLORADO' in owner_key or owner_key == 'BOULDER CITY OF':
        flags.append('Possible institutional alias: no automatic exclusion/override')

    # RULE: Exclude from the CLEANED list if both mailing delivery lines are blank.
    # Check after whitespace cleanup and the approved CU destination override.
    # A PO box or populated second line counts as an address; never invent one.
    # Preserve the original in raw selection files and the original-value audit.
    if not clean['ADDRESS'] and not clean['ADDRESS2']:
        return clean, changes, flags, 'No mailing address: both delivery lines are blank'

    # RULE C03: Do not guess legal-name continuations or move attention, PMB,
    # suite or second delivery lines. Preserve both address lines and CareOf;
    # flag ambiguous two-line entries for the operator to resolve.
    if clean['ADDRESS2']:
        flags.append('Two-line address: review owner/attention/delivery placement')
    # RULE: Retain unusual nonblank addresses; do not guess a repair.
    if clean['ADDRESS'] and not re.match(r'^(\d|P\.?\s*O\.?\s*(BOX|B)|POST OFFICE|RR\b|HC\b)', clean['ADDRESS'], re.I):
        # 453 UCB passes because it begins with a number. This is screening,
        # not a USPS deliverability determination or a reason to discard mail.
        flags.append('First delivery line needs review')
    # RULE C07/C08: Flag missing/placeholder/foreign-format data; never invent
    # an address or substitute a site address. Blank country remains unknown.
    for field in ('NAME', 'ADDRESS', 'CITY', 'STATE', 'ZIP'):
        if not clean[field]:
            flags.append('Missing ' + field)
    # RULE: Preserve unknown state/region text and record an internal diagnostic.
    if clean['STATE'] and clean['STATE'] not in US_STATES:
        flags.append('Unrecognized US state/region: check international layout')
    # RULE: Preserve postal text/leading zeros; do not invent a missing ZIP.
    if clean['ZIP'] in ('00000', '00000-0000'):
        flags.append('Placeholder postal code')
    elif clean['ZIP'] and not re.fullmatch(r'\d{5}(?:-\d{4})?', clean['ZIP']):
        flags.append('Non-US-format postal code: preserve and review')
    # RULE: Preserve the supplied country; leave a blank country unknown.
    if clean['COUNTRY'] and clean['COUNTRY'].upper() not in ('US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'):
        flags.append('International mailing: verify country/layout')
    return clean, changes, flags, ''

# RULE: Compare ZIP5 when all other mailing fields are exactly equal. This is
# the one permitted postal-only merge; it never merges different legal names,
# care-of recipients, units, delivery lines, countries or city/state values.
def _merge_key(clean):
    postal = clean['ZIP']
    domestic = clean['STATE'] in US_STATES and clean['COUNTRY'].upper() in ('', 'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA')
    if domestic and re.fullmatch(r'\d{5}(?:-\d{4})?', postal):
        postal = postal[:5]
    return tuple(postal if f == 'ZIP' else clean[f] for f in MAILING_FIELDS)


def clean_records(records):
    """Return candidate rows, grouped review rows and an original-value audit.

    Keep the sole supplied ZIP+4 when ZIP5 and ZIP+4 coexist. If distinct ZIP+4
    extensions conflict, output the common ZIP5 and flag the merged entry. Do
    not arbitrarily select an extension. Original values remain in RAW_JSON.
    """
    import json
    groups, audit = {}, []
    for raw in records:
        clean, changes, flags, excluded = _clean_recipient(raw)
        group = None
        if not excluded:
            key = _merge_key(clean)
            group = groups.setdefault(key, dict(MAIL_ID=f'M{len(groups)+1:05d}', clean=clean.copy(), ids=[], zips=set(), flags=set()))
            group['ids'].append(str(raw['SOURCE_OID']))
            group['zips'].add(clean['ZIP'])
            group['flags'].update(flags)
        # RULE: Keep every source record in the audit, including exclusions/reasons.
        audit.append(dict(SOURCE_OID=raw['SOURCE_OID'], AccountNo=raw['AccountNo'], ParcelNo=raw['ParcelNo'],
                          MAIL_ID=group['MAIL_ID'] if group else '', EXCLUSION=excluded,
                          CHANGES='; '.join(changes), REVIEW_FLAGS='; '.join(flags),
                          RAW_JSON=json.dumps(raw, ensure_ascii=False), **clean))
    rows, review, by_id = [], [], {}
    for group in groups.values():
        clean, zips = group['clean'], group['zips']
        full = sorted(z for z in zips if re.fullmatch(r'\d{5}-\d{4}', z))
        # RULE: Use the sole supplied ZIP+4 for a merged destination.
        if len(full) == 1:
            clean['ZIP'] = full[0]
        # RULE: Conflicting extensions use common ZIP5; keep originals in audit.
        elif len(full) > 1:
            clean['ZIP'] = full[0][:5]
            group['flags'].add('Conflicting ZIP+4 extensions merged to ZIP5: verify destination')
        row = dict(MAIL_ID=group['MAIL_ID'], **clean)
        rows.append(row)
        by_id[row['MAIL_ID']] = group
        if group['flags']:
            review.append(dict(row, SOURCE_OIDS=';'.join(group['ids']), ORIGINAL_ZIPS='; '.join(sorted(zips)),
                               REVIEW_FLAGS='; '.join(sorted(group['flags']))))
    for row in audit:
        group = by_id.get(row['MAIL_ID'])
        row['OUTPUT_ZIP'] = group['clean']['ZIP'] if group else ''
        if group and len(group['zips']) > 1:
            row['CHANGES'] = '; '.join(filter(None, (row['CHANGES'], 'ZIP5/ZIP+4 variants merged; original retained in audit')))
            row['REVIEW_FLAGS'] = '; '.join(sorted(group['flags']))
    return rows, review, audit
