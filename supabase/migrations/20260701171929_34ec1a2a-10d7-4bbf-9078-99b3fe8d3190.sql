
-- 1. Novos campos em pgr_documents
ALTER TABLE public.pgr_documents
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'pgr',
  ADD COLUMN IF NOT EXISTS rural_activity text,
  ADD COLUMN IF NOT EXISTS rural_area_hectares numeric,
  ADD COLUMN IF NOT EXISTS work_regime text,
  ADD COLUMN IF NOT EXISTS has_lodging boolean,
  ADD COLUMN IF NOT EXISTS lodging_description text,
  ADD COLUMN IF NOT EXISTS worker_transport text;

ALTER TABLE public.pgr_documents
  DROP CONSTRAINT IF EXISTS pgr_documents_document_type_check;
ALTER TABLE public.pgr_documents
  ADD CONSTRAINT pgr_documents_document_type_check CHECK (document_type IN ('pgr','pgtr'));

-- 2. Novos campos em pgr_risks (agrotóxicos NR-31)
ALTER TABLE public.pgr_risks
  ADD COLUMN IF NOT EXISTS pesticide_product text,
  ADD COLUMN IF NOT EXISTS pesticide_active_ingredient text,
  ADD COLUMN IF NOT EXISTS pesticide_toxicity_class text,
  ADD COLUMN IF NOT EXISTS pesticide_required_epi text,
  ADD COLUMN IF NOT EXISTS pesticide_reentry_period text;

-- 3. Catálogo de agentes rurais NR-31
CREATE TABLE IF NOT EXISTS public.pgtr_agents_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  agent_name text NOT NULL,
  typical_severity integer,
  typical_probability integer,
  typical_epi text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pgtr_agents_catalog TO authenticated;
GRANT ALL ON public.pgtr_agents_catalog TO service_role;

ALTER TABLE public.pgtr_agents_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read pgtr catalog" ON public.pgtr_agents_catalog;
CREATE POLICY "Anyone authenticated can read pgtr catalog"
  ON public.pgtr_agents_catalog FOR SELECT TO authenticated USING (true);

-- Seed inicial (idempotente)
INSERT INTO public.pgtr_agents_catalog (category, agent_name, typical_severity, typical_probability, typical_epi, description)
SELECT * FROM (VALUES
  ('quimico','Agrotóxico — Classe I (Extremamente tóxico)',5,3,'Macacão impermeável, luvas nitrílica, respirador com filtro combinado, óculos ampla visão, botas','Aplicação/manuseio de defensivos agrícolas de alta toxicidade. Exige tríplice lavagem e destinação de embalagens.'),
  ('quimico','Agrotóxico — Classe II (Altamente tóxico)',4,3,'Macacão impermeável, luvas nitrílica, respirador semifacial, óculos, botas','Aplicação/manuseio de defensivos agrícolas altamente tóxicos.'),
  ('quimico','Agrotóxico — Classe III (Medianamente tóxico)',3,3,'Macacão, luvas nitrílica, respirador semifacial, óculos, botas','Aplicação/manuseio de defensivos agrícolas medianamente tóxicos.'),
  ('quimico','Agrotóxico — Classe IV (Pouco tóxico)',2,3,'Macacão, luvas nitrílica, óculos, botas','Aplicação/manuseio de defensivos agrícolas pouco tóxicos.'),
  ('quimico','Fertilizantes e adubos químicos',2,3,'Luvas, óculos, máscara PFF2, botas','Manipulação de adubos NPK, calcário e fertilizantes granulados.'),
  ('quimico','Combustíveis (óleo diesel, gasolina)',3,3,'Luvas nitrílica, óculos, botas','Abastecimento e manuseio de máquinas agrícolas.'),
  ('fisico','Ruído de trator/colheitadeira',3,4,'Protetor auricular tipo concha ou plug','Exposição contínua acima de 85 dB(A) na operação de máquinas agrícolas.'),
  ('fisico','Vibração de corpo inteiro (máquinas agrícolas)',3,4,'Assento com suspensão, cinturão antivibração','Operação prolongada de tratores, colheitadeiras e implementos.'),
  ('fisico','Vibração mão-braço (roçadeira, motosserra)',3,4,'Luvas antivibração','Uso de ferramentas manuais motorizadas.'),
  ('fisico','Calor / exposição solar',4,5,'Protetor solar FPS 50+, chapéu de aba larga, camisa manga longa, óculos UV','Trabalho a céu aberto em atividades de campo, plantio, colheita.'),
  ('fisico','Umidade / trabalho sob chuva',2,3,'Capa impermeável, botas de borracha','Atividades em áreas alagadas ou período chuvoso.'),
  ('fisico','Radiação ultravioleta solar',3,5,'Protetor solar, roupa UV, chapéu, óculos','Exposição prolongada à radiação solar em atividades rurais.'),
  ('biologico','Zoonoses (leptospirose, hantavirose, brucelose)',4,3,'Luvas, botas, higienização','Contato com roedores, animais silvestres e ambientes contaminados.'),
  ('biologico','Animais peçonhentos (cobras, aranhas, escorpiões)',5,3,'Perneira, botas cano alto, luvas','Trabalho em áreas de mato, pastagens e depósitos.'),
  ('biologico','Insetos vetores (dengue, febre amarela, leishmaniose)',3,4,'Repelente, roupa manga longa, mosquiteiro em alojamento','Áreas de mata, água parada, silvestres.'),
  ('biologico','Bactérias e fungos do solo (tétano, micoses)',3,3,'Luvas, botas, imunização (antitetânica)','Contato direto com solo em manejo, plantio e colheita.'),
  ('biologico','Contato com animais de criação (aftosa, raiva, tuberculose)',3,3,'Luvas, botas, EPI para manejo, vacinação','Manejo de bovinos, suínos, aves e outros.'),
  ('ergonomico','Postura forçada em colheita manual',3,5,'Pausas programadas, ferramentas ergonômicas, rodízio','Colheita agachada ou curvada por longos períodos.'),
  ('ergonomico','Levantamento e transporte manual de cargas',3,4,'Treinamento, cargas ≤ 25kg, uso de mecanização','Movimentação de sacos, caixas, feixes.'),
  ('ergonomico','Movimentos repetitivos (poda, capina)',3,4,'Ferramentas ergonômicas, pausas','Uso repetido de facão, foice, tesoura.'),
  ('ergonomico','Jornada prolongada em período de safra',3,4,'Limitação de jornada, pausas, hidratação','Safras exigem esforço físico contínuo por longas horas.'),
  ('acidentes','Máquinas agrícolas (trator, colheitadeira)',5,3,'Proteções da máquina, treinamento NR-31.12, cinto de segurança','Risco de tombamento, esmagamento, prensa e projeção.'),
  ('acidentes','Implementos agrícolas (arado, grade, pulverizador)',4,3,'Proteções, treinamento, EPI de acordo com atividade','Engate/desengate e operação.'),
  ('acidentes','Ferramentas cortantes (facão, foice, motosserra)',4,3,'Luvas anticorte, botina, treinamento','Cortes profundos em membros superiores/inferiores.'),
  ('acidentes','Trabalho em altura (silos, torres, colheita em árvore)',5,3,'Cinturão paraquedista, talabarte, linha de vida, NR-35','Queda de nível superior a 2 metros.'),
  ('acidentes','Choque elétrico (cercas eletrificadas, redes rurais)',5,2,'EPI dielétrico, sinalização, aterramento','Contato com energia elétrica em instalações rurais.'),
  ('acidentes','Incêndio em campo / queimadas',4,3,'Equipamento de combate, treinamento, roupa retardante','Manejo de fogo em áreas rurais, colheita de cana.'),
  ('acidentes','Afogamento (represas, açudes, canais)',5,2,'Colete salva-vidas em atividades próximas','Trabalho próximo a corpos d''água.'),
  ('acidentes','Transporte de trabalhadores em veículos',4,3,'Veículo regularizado, cinto, motorista habilitado','Deslocamento até frentes de trabalho.')
) AS v(category, agent_name, typical_severity, typical_probability, typical_epi, description)
WHERE NOT EXISTS (SELECT 1 FROM public.pgtr_agents_catalog WHERE agent_name = v.agent_name);
