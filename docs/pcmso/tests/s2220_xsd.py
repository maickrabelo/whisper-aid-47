"""Validate unsigned event body, and require full-document rejection for missing XMLDSig.
Run: python3 docs/pcmso/tests/s2220_xsd.py /tmp/pcmso/preparation.xml
No files with credentials are read. XML fixtures must be fictional.
"""
import copy
import sys
from pathlib import Path
from lxml import etree as E

directory = Path(__file__).resolve().parents[1] / 'esocial'
schema = E.parse(str(directory / 'evtMonit.xsd'))
ns = {'xs': 'http://www.w3.org/2001/XMLSchema'}
event_definition = schema.xpath('//xs:element[@name="evtMonit"]', namespaces=ns)[0]
wrapper = E.Element('{http://www.w3.org/2001/XMLSchema}schema', nsmap=schema.getroot().nsmap, attrib=dict(schema.getroot().attrib))
for node in schema.getroot():
    if node.tag in ['{http://www.w3.org/2001/XMLSchema}include', '{http://www.w3.org/2001/XMLSchema}import']:
        cloned = copy.deepcopy(node)
        cloned.set('schemaLocation', str(directory / cloned.get('schemaLocation')))
        wrapper.append(cloned)
wrapper.append(copy.deepcopy(event_definition))
body_schema = E.XMLSchema(wrapper)
xml = E.parse(sys.argv[1])
assert body_schema.validate(xml.getroot()[0]), body_schema.error_log
full_schema = E.XMLSchema(schema)
assert not full_schema.validate(xml), 'Unsigned document unexpectedly accepted'
assert 'Signature' in str(full_schema.error_log), full_schema.error_log
print('PASS: official event body; full document blocked by required XML signature')