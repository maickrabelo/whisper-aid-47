# Avaliação do feedback técnico do PGR

Verifiquei cada ponto no sistema. Abaixo o que procede, o que já existe e o que sugiro fazer — em duas etapas.

## O que confirmei no sistema

- **Probabilidade sobe automaticamente**: procede. Existe uma regra que soma +1 ou +2 na probabilidade conforme a magnitude (nº de trabalhadores atingidos), tanto na tela quanto no cálculo salvo no banco.
- **Importação da AEP cruzando funções**: procede. No envio ao inventário, todos os fatores recebem o mesmo grupo (GHE) escolhido na tela, sem considerar o bloco/atividade de origem de cada fator. Além disso a origem está trocada: "fonte/causa" é gravada como descrição da exposição e "grupos expostos" como fonte.
- **CIPA**: procede parcialmente. O documento traz "CIPA — Comissão Interna de Prevenção de Acidentes" (nomenclatura antiga) e não há seção de prevenção ao assédio; assédio aparece apenas como exemplo de risco psicossocial.
- **Datas de vigência**: painel e PDF leem o mesmo registro, mas formatam de maneiras diferentes (o painel converte o texto da data para fuso local, o PDF não), o que pode exibir um dia de diferença. Não há duas fontes de dados.
- **Campos do plano de ação**: hoje só existem descrição, risco, hierarquia de controle, responsável, prazo, status, custo e link de evidência. Prioridade, indicador de eficácia, verificação e risco residual não existem.
- **Prazo não persistindo**: não reproduzi. Das 1.235 ações cadastradas, 791 têm prazo salvo, então o caminho principal funciona. Provavelmente é um caso específico (ação criada pela importação da AEP ou movida no Kanban) — a investigação entra como primeiro passo.
- **Histórico de versões**: o PGR já tem versão e revisão, mas sem registro de o que mudou, por quê e quem aprovou.
- **Triagem x dosimetria**: procede. Hoje há apenas valor, unidade e limite de exposição, sem distinguir leitura pontual de avaliação representativa, nem calibração/amostragem.

## Etapa 1 — correções (recomendo priorizar)

1. **Probabilidade**: mantida como está, por decisão sua. O acréscimo automático por número de trabalhadores atingidos continua funcionando.
2. **Prazo do plano de ação**: reproduzir o caso, corrigir a persistência e garantir que o prazo apareça no PDF; incluir aviso quando a ação for salva sem prazo.
3. **Importação da AEP**: cada fator passa a ser vinculado ao grupo/função/atividade de origem (não ao GHE único da tela), com fonte e grupos expostos nos campos corretos. Na tela de envio, o técnico vê e confirma o destino de cada fator, e pode marcar itens como duplicidade já coberta, pendente de AET ou achado psicossocial dependente de consulta.
4. **Vigência**: padronizar a formatação das datas para painel e PDF usarem a mesma leitura, eliminando a diferença de um dia.
5. **CIPA e assédio**: atualizar para "CIPA — Comissão Interna de Prevenção de Acidentes e de Assédio" e criar no documento uma seção de prevenção ao assédio sexual e demais violências, com regras de conduta, canal de denúncia, proteção da pessoa denunciante, apuração, vedação à retaliação e capacitação periódica — com texto padrão editável.
6. **Validação antes da emissão**: painel de conferência no PGR (semelhante ao do LTCAT) alertando sobre ação sem prazo, risco sem fonte, GHE sem atividades, CA pendente apresentado como eficaz, controle futuro listado como existente, responsável técnico ou legal incompleto e vigência inconsistente. Alerta, não bloqueio, com opção de emitir mesmo assim.

## Etapa 2 — melhorias do documento base

7. **Campos estruturados no plano de ação**: prioridade, forma de acompanhamento, evidência esperada, indicador/critério de eficácia, data de verificação, conclusão da verificação e risco residual — refletidos na tabela do PDF.
8. **Inventário com colunas separadas**: perigo/fonte, possíveis lesões, grupo exposto, caracterização da exposição, controles implementados x apenas recomendados, avaliação, classificação, critério de decisão e prioridade. Campos vazios, CA pendente e avaliação quantitativa não realizada passam a ser exibidos como pendência, nunca como controle eficaz.
9. **Metodologia de gradação no PDF**: escalas completas de severidade e probabilidade com critérios de enquadramento, matriz e faixas, critérios de aceitabilidade, tratamento de incertezas, regra de revisão e método do risco residual.
10. **Avaliações quantitativas**: marcar o tipo de medição (leitura pontual/triagem, dosimetria de jornada, temperatura pontual, IBUTG), o caráter do resultado (preliminar ou conclusivo), certificado de calibração e representatividade da amostragem. Triagem nunca conclui exposição diária no documento.
11. **PGR como processo contínuo e histórico**: texto do PDF passa a tratar revisão por mudança, acidente, ineficácia, novo risco ou alteração legal (não só validade anual), e cada nova versão registra data, alteração, justificativa, responsável e aprovação, mantidas pelo prazo legal.

## Pontos do feedback que não vou mudar

- Não há duas fontes de dados de vigência; o ajuste é só de formatação.
- Os textos de responsabilidades, guarda por 20 anos e divulgação já constam do documento; serão apenas complementados.

## Detalhes técnicos

- `pgr_risks_compute_level()`: mantido sem alteração (regra de `bump`/`prob_adj` preservada).
- `SendToInventoryDialog.tsx` e `BulkSendToPGRDialog.tsx`: resolver `ghe_id` por `escopo_ref`/`setor_nome`+`funcao_nome` de cada fator; corrigir mapeamento `fonte_causa` → `source` e `grupos_expostos` → `exposure_description`; novas colunas de classificação de origem em `pgr_risks` (`origin_status`).
- `ActionPlanEditor.tsx` + migração em `pgr_action_items`: `priority`, `monitoring_method`, `expected_evidence`, `effectiveness_indicator`, `verification_date`, `verification_result`, `residual_risk`.
- `pgr_risks`: `measurement_type`, `measurement_conclusive`, `calibration_certificate`, `sampling_strategy`, `implemented_controls`, `recommended_controls`, `possible_injuries`, `decision_criteria`.
- Novo `pgr_document_revisions` (data, alteração, justificativa, responsável, aprovação).
- `PGRReportPDF.ts`: nomenclatura da CIPA, seção de assédio, metodologia de gradação, colunas novas do inventário e do plano, texto de processo contínuo, `fmtDate` unificado com o painel.
- Novo `PGRValidationPanel.tsx` no padrão de `LtcatValidationPanel.tsx`.
