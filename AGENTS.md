PDF display data must use the shared proper-case formatter for sectors and addresses; this prevents all-caps output while preserving common acronyms.
DialogContent must ignore outside clicks and Escape by default; this prevents accidental loss of form data and leaves explicit close controls authoritative.
- PCMSO module decisions live in docs/pcmso/ (architecture, data model, permissions, acceptance, status); read them before changing PCMSO code — the module is built phase by phase against those acceptance criteria.
- PCMSO inventory uses company-validated immutable source snapshots rather than live joins; PGR/AEP edits create change requests without modifying approved content.
- PCMSO exam protocols are manual, company-scoped draft records; physician approval freezes program, inventory and protocols into an immutable version so later revisions cannot rewrite approved evidence.
