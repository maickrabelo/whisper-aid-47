# PCMSO — Modelo de dados (Fase 0)

Status: proposto. Nomes a confirmar contra o schema real antes de cada migração. Todas as migrações são **aditivas** (nenhum DROP/RENAME na 1ª release). Não criar tabelas antes da fase que as usa.

Implementação simulada 7–9: `pcmso_clinical_entries` (revisões por pedido, notas exclusivas do médico), `pcmso_asos` (snapshot sem notas, ASO anterior), `pcmso_manual_signature_attestations` (declaração externa não verificada), `pcmso_annual_reports` (resumo anual incompleto, revisão e hash), `pcmso_esocial_preparations` (ambiente 2, estado fixo não transmitido). Todos append-only com simulation=true obrigatório. Sem bucket de prontuário nem arquivos assinados; relatórios sem doenças/CAT calculadas. RPCs revalidam autorização por empresa, flag e médico. Migrações 0014–0015; esquemas oficiais S-2220 em `esocial/`.

Implementação da Fase 3: `pcmso_source_snapshots` (único programa+PGR, conteúdo JSONB integral e hash); `pcmso_change_requests` (pendência por programa+PGR); `pcmso_inventory_reviews` (observações por cópia). Referências à origem não têm cascata: conteúdo aprovado sobrevive à exclusão da fonte. Versões documentais adicionais permanecem para a fase de documentos.

Implementação da Fase 4: `pcmso_exam_catalog` por empresa; `pcmso_protocols` com exame, tipo ocupacional, periodicidade, GHE/risco da cópia e justificativa manual; `pcmso_protocol_history` append-only. `pcmso_program_versions` captura empresa, inventário, revisões e protocolos na aprovação, com médico/CRM, hash e data. Aprovação não equivale a assinatura digital. `pcmso_programs.previous_program_id` e `revision_number` encadeiam revisões; `pcmso_create_revision` é idempotente, importa a fonte atual e copia protocolos ainda compatíveis, sem herdar aprovação nem revisão do inventário. Fontes removidas ou GHEs/riscos incompatíveis precisam de nova preparação manual.

## Convenções
Fase 6 em simulação: `pcmso_exam_orders` e `pcmso_exam_order_history`. RPCs `pcmso_request_exam` e `pcmso_update_exam_order` validam empresa, trabalhador/protocolo, situação e chave idempotente. Snapshot preserva identificação ocupacional sem CPF, vínculo e protocolo. Somente datas/andamento/local/motivo administrativo; nenhum resultado, diagnóstico ou aptidão. Histórico append-only; sem escrita direta pela API. `simulation=true` obrigatório; outbox/notificações externas não implementados.

Implementação documental da Fase 5: `pcmso_document_settings`, `pcmso_actions`, `pcmso_action_history`; configurações e ações capturadas no conteúdo de `pcmso_program_versions`. RPC `pcmso_document_payload` autorizada retorna somente evidência congelada quando aprovada. PDF gerado localmente sem armazenamento de arquivo nesta etapa; `pcmso_documents`, recibos e bucket privado aguardam fluxo de assinatura/homologação.

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
