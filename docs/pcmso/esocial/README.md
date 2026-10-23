# S-2220 references and validation boundary

Official source: https://www.gov.br/esocial/pt-br/documentacao-tecnica

Pinned schema: S-1.3 / NT06/2026 / production 2026-07-01 (alphanumeric CNPJ).
Archive: https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/2026-07-01_esquemas_xsd_v_s_01_03_00.zip
Table 27: https://www.gov.br/esocial/pt-br/documentacao-tecnica/leiautes-esocial-versao-s-1-3-nt-06-2026/tabelas.html#27

Later packages start production 2026-10-26 and are not selected on 2026-10-23.
The three XSD files are byte-exact official reference files; procedure names are transcribed from official Table 27.

The pilot intentionally exports **unsigned preparation** with environment 2. Manual signing of a paper ASO does not sign XML. The official `eSocial` root requires `ds:Signature`; a complete unsigned event therefore fails the official full-document schema. No signature is fabricated and no transmission endpoint exists. Tests validate the `evtMonit` subtree against the unchanged official type by selecting that element in a temporary wrapper, and confirm that the full document is rejected specifically for the missing signature. This is structural evidence, not eSocial acceptance, employer/vínculo validation or legal compliance.