"""Validate fictional S2240 bodies; full unsigned documents must fail for missing Signature."""
import copy
import sys
from pathlib import Path
from lxml import etree as E

directory = Path(__file__).resolve().parents[2] / 'pcmso' / 'esocial'
schema = E.parse(str(directory / 'evtExpRisco.xsd'))
ns = {'xs':'http://www.w3.org/2001/XMLSchema'}
wrapper = E.Element('{http://www.w3.org/2001/XMLSchema}schema', nsmap=schema.getroot().nsmap, attrib=dict(schema.getroot().attrib))
for node in schema.getroot():
    if node.tag in ['{http://www.w3.org/2001/XMLSchema}include','{http://www.w3.org/2001/XMLSchema}import']:
        cloned = copy.deepcopy(node)
        cloned.set('schemaLocation',str(directory / cloned.get('schemaLocation')))
        wrapper.append(cloned)
wrapper.append(copy.deepcopy(schema.xpath('//xs:element[@name="evtExpRisco"]',namespaces=ns)[0]))
body = E.XMLSchema(wrapper)
full = E.XMLSchema(schema)
for path in sys.argv[1:]:
    xml = E.parse(path)
    assert body.validate(xml.getroot()[0]), body.error_log
    assert not full.validate(xml), 'Unsigned XML unexpectedly accepted'
    assert 'Signature' in str(full.error_log), full.error_log
    print('PASS: official S2240 body; unsigned full document rejected for missing Signature')