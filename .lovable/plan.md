# Avaliação de Magnitude no PGR (NR-1 · 1.5.5.2.1.1)

## Como está hoje

- `pgr_risks` classifica risco por **Severidade × Probabilidade** apenas (matriz 3/4/5).
- `pgr_ghe.worker_count` já guarda o nº de trabalhadores do GHE, mas esse número **não influencia** o nível/priorização do risco.
- Não há campo específico de "nº de trabalhadores expostos" no risco (pode ser menor que o GHE inteiro, ex.: só quem opera a máquina).

## Proposta

Introduzir **Magnitude** como um 3º fator da avaliação, usado para **elevar a probabilidade** (e a prioridade no plano de ação) quando o risco atinge muitos trabalhadores — em conformidade com NR-1 1.5.5.2.1.1.

### 1. Escala de Magnitude (5 níveis)

Baseada na proporção de trabalhadores expostos vs. total do GHE (com pisos absolutos para empresas pequenas):

| Nível | Rótulo         | Critério                                          |
|-------|----------------|---------------------------------------------------|
| 1     | Individual     | 1 trabalhador                                     |
| 2     | Pontual        | 2–5 trabalhadores OU ≤ 20% do GHE                 |
| 3     | Parcial        | 6–20 trabalhadores OU 21–50% do GHE               |
| 4     | Ampla          | 21–50 trabalhadores OU 51–80% do GHE              |
| 5     | Setor inteiro  | > 50 trabalhadores OU > 80% do GHE                |

O sistema **sugere** o nível a partir de `exposed_workers` informado e do `worker_count` do GHE, mas o técnico pode ajustar manualmente.

### 2. Como a Magnitude entra no cálculo

Duas opções — pedir escolha do usuário antes de implementar:

**Opção A — Elevação da Probabilidade (recomendada, aderente à norma)**
A norma diz que a magnitude "eleva a probabilidade". Aplicar bump automático:
- Magnitude 4 → probabilidade efetiva = min(probabilidade + 1, matrix_size)
- Magnitude 5 → probabilidade efetiva = min(probabilidade + 2, matrix_size)
- Magnitudes 1–3 → sem alteração

O nível de risco (`risk_level`) passa a ser calculado sobre a **probabilidade ajustada**. A tabela mostra a probabilidade original + o ajuste ("3 → 4 por magnitude").

**Opção B — Terceira dimensão (Severidade × Probabilidade × Magnitude / 5)**
Cálculo mais rico, porém foge do modelo clássico de matriz 5×5 do PGR/eSocial. Só recomendado se o usuário quiser um índice numérico de prioridade separado do risk_level.

### 3. Priorização no Plano de Ação

Independentemente da opção acima, o **Kanban PGR** ordena por:
1. `risk_level` (intolerable → trivial)
2. `magnitude` DESC (desempate — muitos trabalhadores vem primeiro)
3. `severity` DESC

Assim, dois riscos "Substanciais" com magnitude diferente aparecem na ordem correta.

### 4. UI

**Formulário de risco (`RiskInventory.tsx`)**
- Novo campo `exposed_workers` (nº absoluto, opcional; default = worker_count do GHE)
- Novo campo `magnitude` (Select 1–5, com rótulos; auto-preenchido pela regra da tabela, editável)
- Aviso ao lado: *"NR-1 1.5.5.2.1.1 — o nº de trabalhadores atingidos eleva a probabilidade."*
- Quando magnitude 4 ou 5, badge amarelo/vermelho: *"Probabilidade elevada de X para Y por magnitude"*

**Tabela de riscos**
- Nova coluna "Magnitude" (badge com nível + nº expostos)
- Coluna "Nível" já reflete probabilidade ajustada

**PDF do PGR**
- Inventário: incluir colunas "Expostos" e "Magnitude"
- Seção metodológica: parágrafo explicando o critério (com citação da NR-1 1.5.5.2.1.1)

### 5. Detalhes técnicos

Migration:

```sql
ALTER TABLE public.pgr_risks
  ADD COLUMN exposed_workers integer,
  ADD COLUMN magnitude smallint NOT NULL DEFAULT 1
    CHECK (magnitude BETWEEN 1 AND 5);
```

Trigger `pgr_risks_compute_level` atualizada para calcular:
```
prob_adjusted = LEAST(probability + CASE magnitude WHEN 5 THEN 2 WHEN 4 THEN 1 ELSE 0 END, matrix_size)
risk_level    = classify(matrix_size, severity, prob_adjusted)
```
Mantém `probability` original preservada; o ajuste é derivado.

Frontend:
- `classifyRisk()` recebe `magnitude` como parâmetro opcional.
- Helper `suggestMagnitude(exposed, gheTotal)` implementa a tabela.
- `KanbanActionCard`/`usePGRDashboardData` ordenam por `magnitude` desc como tiebreaker.

## Pergunta para você

Antes de implementar, confirme:
1. **Escala e limiares** da tabela acima estão ok, ou você prefere outros cortes (ex.: usar só % do GHE, ou só valores absolutos)?
2. **Opção A (eleva probabilidade)** ou **Opção B (fator separado)**?
3. Aplicar retroativamente aos riscos já existentes com magnitude = 1 (individual, sem elevação), ou deixar em branco para o técnico revisar?
