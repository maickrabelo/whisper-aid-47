PDF display data must use the shared proper-case formatter for sectors and addresses; this prevents all-caps output while preserving common acronyms.
DialogContent must ignore outside clicks and Escape by default; this prevents accidental loss of form data and leaves explicit close controls authoritative.
- PCMSO module decisions live in docs/pcmso/ (architecture, data model, permissions, acceptance, status); read them before changing PCMSO code — the module is built phase by phase against those acceptance criteria.
