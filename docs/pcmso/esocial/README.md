# S-2220 / S-2240 references and validation boundary

Official source: https://www.gov.br/esocial/pt-br/documentacao-tecnica

Pinned schema: S-1.3 / NT06/2026 / production 2026-07-01 (alphanumeric CNPJ).
Archive: https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/2026-07-01_esquemas_xsd_v_s_01_03_00.zip
Table 27: https://www.gov.br/esocial/pt-br/documentacao-tecnica/leiautes-esocial-versao-s-1-3-nt-06-2026/tabelas.html#27

Later packages start production 2026-10-26 and are not selected on 2026-10-23.
The three XSD files are byte-exact official reference files; procedure names are transcribed from official Table 27.

The pilot intentionally exports **unsigned preparation** with environment 2. Manual signing of a paper ASO does not sign XML. The official `eSocial` root requires `ds:Signature`; a complete unsigned event therefore fails the official full-document schema. No signature is fabricated and no transmission endpoint exists. Tests validate the `evtMonit` subtree against the unchanged official type by selecting that element in a temporary wrapper, and confirm that the full document is rejected specifically for the missing signature. This is structural evidence, not eSocial acceptance, employer/vínculo validation or legal compliance.

## External transmitter handoff (2026-10-23)

- S-2240 uses the same official July package (`evtExpRisco.xsd`); the October 26 event schema is byte-identical. Archive SHA-256: `32535dba33d0470cf44afce410840af450028fd32d3ddf9123f601c45cf9af8e`.
- Table 24 contains 92 official agent codes. Units are official enumeration values, not free text. Quantitative assessment is code 1; qualitative is 2. Technical council codes are CRM 1, CREA 4, other 9.
- The PGR export collects missing declarations explicitly, validates identifiers/dates/contracts and prepares one XML per worker. Multiple events download as a ZIP, never concatenated XML roots. Preparation is recorded in `pgr_esocial_exports`, not represented as transmission or acceptance.
- Export-only inputs do not rewrite the PGR inventory. Missing or conflicting data block download. Unsupported cases include contracts without matrícula, avulsos, CAEPF/CNO, rectifications and judicial agents. Technical review is required; production must be explicitly selected using real data.
- S-2220 remains medically authorized pilot simulation, environment 2 only. Its download dialog explains the unsigned and simulated boundary.
- S-2220 supports explicit single/batch ASO selection and review, with per-ASO audited preparation, event summary, standalone XML or ZIP. Entire selection validates before any files are released. Failed batches may leave earlier preparation audit records; retry reuses event IDs. Original export excludes corrected/superseded ASOs; rectification is not implemented. Authenticated two-ASO ZIP/single XML and revoked-physician checks passed on 2026-10-23; official body-schema checks passed and full unsigned documents correctly failed.
- A compatible external transmitter must import, validate, digitally sign and transmit. The eSocial web portal does not provide XML upload. Vendor compatibility and official acceptance remain unverified until a transmitter and authorized real data are supplied.

Validation: 28 unit tests passed. Official schema tests validated fictional quantitative, qualitative and absence S-2240 event bodies and rejected unsigned full documents for missing Signature. Authenticated pilot UI blocked incomplete data, prepared/downloaded a two-event ZIP, and read back preparation history. The export dialog was checked at 390px without content overflow. Temporary fictional workers, risks, GHE and company CNPJ changes were removed/restored. Existing dashboard page overflow outside this dialog was not changed.