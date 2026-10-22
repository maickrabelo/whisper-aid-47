# PCMSO — Modelo de dados (Fase 0)

Status: proposto. Nomes a confirmar contra o schema real antes de cada migração. Todas as migrações são **aditivas** (nenhum DROP/RENAME na 1ª release). Não criar tabelas antes da fase que as usa.

Implementação da Fase 3: `pcmso_source_snapshots` (único programa+PGR, conteúdo JSONB integral e hash); `pcmso_change_requests` (pendência por programa+PGR); `pcmso_inventory_reviews` (observações por cópia). Referências à origem não têm cascata: conteúdo aprovado sobrevive à exclusão da fonte. Versões documentais adicionais permanecem para a fase de documentos.

## Convenções
UUID; `timestamptz` para eventos; `date` para datas civis; `company_id` em toda entidade por empresa; `created_by`/`updated_by`. CPF nunca em URL, nome de arquivo ou log. Integridade entre empresas por FK composta `(company_id, id)` ou trigger de validação. Sem cascata sobre histórico ocupacional/médico.

## Ordem das migrações
| # | Fase | Tabelas |
|---|---|---|
| M1 | 1 | `pcmso_professionals`, `pcmso_professional_assignments`, `pcmso_audit_events`, flag `PCMSO_BETA`, funções `pcmso_can(_company_id, _permission)` |
| M2 | 2 | `company_establishments`, `company_sectors`, `company_job_roles`, `occupational_groups`, `occupational_group_sources` |
| M3 | 2 | `occupational_workers` (unique company_id+CPF), `occupational_employments`, `occupational_assignments`, `occupational_assignment_groups`, `occupational_migration_map` |
| M4 | 3 | `pcmso_programs`, `pcmso_program_versions` (unique program_id+número), `pcmso_source_snapshots`, `pcmso_change_requests` |
| M5 | 4 | `pcmso_exam_catalog`, `pcmso_protocols` |
| M6 | 5 | `pcmso_actions`, `pcmso_documents`, `pcmso_document_receipts`, bucket privado |
| M7 | 6 | `pcmso_exam_orders`, `pcmso_exam_order_items`, `pcmso_notifications`, `pcmso_outbox` |
| M8 | 7 | `pcmso_encounters`, `pcmso_clinical_records`, `pcmso_exam_results`, `pcmso_asos` |
| M9 | 8 | `pcmso_annual_reports`, `pcmso_health_events` |
| M10 | 9 | `pcmso_esocial_events` |

## Tabelas existentes lidas (somente leitura pelo PCMSO)
`companies`, `user_companies`, `company_sst_assignments`, `pgr_documents`, `pgr_ghe`, `pgr_ghe_workers`, `pgr_risks`, `pgr_action_items` (escrita só via confirmação, Fase 5), `aep_*`, `aep_pgr_vinculo`, `ltcat_*`, `feature_access`.

## Migração de `pgr_ghe_workers`
1. Diagnóstico agregado (contagens de CPF ausente/inválido/duplicado, matrículas) sem expor dados pessoais.
2. Simulação: novos, correspondências, conflitos, rejeitados.
3. Lote + `occupational_migration_map` (origem, ids, status, motivo); reexecução idempotente.
4. Ambíguos ficam para revisão; nunca unir por nome. Datas desconhecidas = pendência.
5. Leitura legada mantida; uma única fonte de escrita definida na ativação.
6. Validar contagens/amostras antes de ativar na empresa piloto. Não roda automaticamente em dados reais.
