
-- ============ AEP AVALIACOES ============
CREATE TABLE public.aep_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pgr_document_id uuid REFERENCES public.pgr_documents(id) ON DELETE SET NULL,
  ghe_id uuid REFERENCES public.pgr_ghe(id) ON DELETE SET NULL,
  setor_nome text,
  funcao_nome text,
  situacao_trabalho text NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  next_review_date date,
  responsible_name text,
  responsible_role text,
  responsible_registration text,
  methodologies text[] NOT NULL DEFAULT '{}',
  methodology_details text,
  instrument_name text,
  anonymity_ensured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','in_review','revised')),
  version integer NOT NULL DEFAULT 1,
  parent_version_id uuid REFERENCES public.aep_avaliacoes(id) ON DELETE SET NULL,
  signed_at timestamptz,
  signature_hash text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aep_avaliacoes_company ON public.aep_avaliacoes(company_id);
CREATE INDEX idx_aep_avaliacoes_pgr ON public.aep_avaliacoes(pgr_document_id);
CREATE INDEX idx_aep_avaliacoes_status ON public.aep_avaliacoes(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aep_avaliacoes TO authenticated;
GRANT ALL ON public.aep_avaliacoes TO service_role;
ALTER TABLE public.aep_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all aep_avaliacoes" ON public.aep_avaliacoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "SST manage aep for assigned companies" ON public.aep_avaliacoes
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
      SELECT 1 FROM public.company_sst_assignments csa
      WHERE csa.company_id = aep_avaliacoes.company_id
        AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
      SELECT 1 FROM public.company_sst_assignments csa
      WHERE csa.company_id = aep_avaliacoes.company_id
        AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
    )
  );

CREATE POLICY "Companies manage own aep" ON public.aep_avaliacoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), company_id));

CREATE TRIGGER trg_aep_avaliacoes_updated
  BEFORE UPDATE ON public.aep_avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============ AEP FATORES AVALIADOS ============
CREATE TABLE public.aep_fatores_avaliados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aep_id uuid NOT NULL REFERENCES public.aep_avaliacoes(id) ON DELETE CASCADE,
  categoria text NOT NULL CHECK (categoria IN ('ergonomico_fisico','ergonomico_organizacional','ergonomico_cognitivo','psicossocial')),
  fator_codigo text,
  fator_nome text NOT NULL,
  fonte_causa text,
  grupos_expostos text,
  evidencia_texto text,
  severity smallint NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  probability smallint NOT NULL DEFAULT 1 CHECK (probability BETWEEN 1 AND 5),
  matrix_size smallint NOT NULL DEFAULT 5 CHECK (matrix_size IN (3,4,5)),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aep_fatores_aep ON public.aep_fatores_avaliados(aep_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aep_fatores_avaliados TO authenticated;
GRANT ALL ON public.aep_fatores_avaliados TO service_role;
ALTER TABLE public.aep_fatores_avaliados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all aep_fatores" ON public.aep_fatores_avaliados
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Inherit aep access for fatores" ON public.aep_fatores_avaliados
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.aep_avaliacoes a
    WHERE a.id = aep_fatores_avaliados.aep_id
      AND (
        (has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
        ))
        OR (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), a.company_id))
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.aep_avaliacoes a
    WHERE a.id = aep_fatores_avaliados.aep_id
      AND (
        (has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
        ))
        OR (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), a.company_id))
      )
  ));

CREATE TRIGGER trg_aep_fatores_updated
  BEFORE UPDATE ON public.aep_fatores_avaliados
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Clamp severity/probability
CREATE OR REPLACE FUNCTION public.aep_fatores_clamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.severity > NEW.matrix_size THEN NEW.severity := NEW.matrix_size; END IF;
  IF NEW.probability > NEW.matrix_size THEN NEW.probability := NEW.matrix_size; END IF;
  IF NEW.severity < 1 THEN NEW.severity := 1; END IF;
  IF NEW.probability < 1 THEN NEW.probability := 1; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aep_fatores_clamp
  BEFORE INSERT OR UPDATE ON public.aep_fatores_avaliados
  FOR EACH ROW EXECUTE FUNCTION public.aep_fatores_clamp();

-- ============ AEP <-> PGR RISCO VINCULO ============
CREATE TABLE public.aep_pgr_vinculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aep_fator_id uuid NOT NULL REFERENCES public.aep_fatores_avaliados(id) ON DELETE CASCADE,
  pgr_risk_id uuid NOT NULL REFERENCES public.pgr_risks(id) ON DELETE CASCADE,
  linked_by uuid,
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aep_fator_id, pgr_risk_id)
);
CREATE INDEX idx_aep_vinculo_fator ON public.aep_pgr_vinculo(aep_fator_id);
CREATE INDEX idx_aep_vinculo_risk ON public.aep_pgr_vinculo(pgr_risk_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aep_pgr_vinculo TO authenticated;
GRANT ALL ON public.aep_pgr_vinculo TO service_role;
ALTER TABLE public.aep_pgr_vinculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all aep_vinculo" ON public.aep_pgr_vinculo
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Inherit aep access for vinculo" ON public.aep_pgr_vinculo
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.aep_fatores_avaliados f
    JOIN public.aep_avaliacoes a ON a.id = f.aep_id
    WHERE f.id = aep_pgr_vinculo.aep_fator_id
      AND (
        (has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
        ))
        OR (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), a.company_id))
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.aep_fatores_avaliados f
    JOIN public.aep_avaliacoes a ON a.id = f.aep_id
    WHERE f.id = aep_pgr_vinculo.aep_fator_id
      AND (
        (has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
        ))
        OR (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), a.company_id))
      )
  ));

-- ============ AEP EVIDENCIAS ============
CREATE TABLE public.aep_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aep_id uuid NOT NULL REFERENCES public.aep_avaliacoes(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  descricao text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aep_evidencias_aep ON public.aep_evidencias(aep_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aep_evidencias TO authenticated;
GRANT ALL ON public.aep_evidencias TO service_role;
ALTER TABLE public.aep_evidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all aep_evidencias" ON public.aep_evidencias
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Inherit aep access for evidencias" ON public.aep_evidencias
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.aep_avaliacoes a
    WHERE a.id = aep_evidencias.aep_id
      AND (
        (has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
        ))
        OR (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), a.company_id))
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.aep_avaliacoes a
    WHERE a.id = aep_evidencias.aep_id
      AND (
        (has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
        ))
        OR (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), a.company_id))
      )
  ));

-- ============ AEP PARTICIPANTES ============
CREATE TABLE public.aep_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aep_id uuid NOT NULL REFERENCES public.aep_avaliacoes(id) ON DELETE CASCADE,
  nome text,
  funcao text,
  tipo_participacao text CHECK (tipo_participacao IN ('entrevista','grupo_focal','questionario','observacao','outro')),
  data_participacao date,
  anonimizado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aep_participantes_aep ON public.aep_participantes(aep_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aep_participantes TO authenticated;
GRANT ALL ON public.aep_participantes TO service_role;
ALTER TABLE public.aep_participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all aep_participantes" ON public.aep_participantes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Inherit aep access for participantes" ON public.aep_participantes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.aep_avaliacoes a
    WHERE a.id = aep_participantes.aep_id
      AND (
        (has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
        ))
        OR (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), a.company_id))
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.aep_avaliacoes a
    WHERE a.id = aep_participantes.aep_id
      AND (
        (has_role(auth.uid(), 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(auth.uid(), csa.sst_manager_id)
        ))
        OR (has_role(auth.uid(), 'company'::app_role) AND user_in_company(auth.uid(), a.company_id))
      )
  ));

-- ============ AEP FATORES CATALOGO ============
CREATE TABLE public.aep_fatores_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('ergonomico_fisico','ergonomico_organizacional','ergonomico_cognitivo','psicossocial')),
  nome text NOT NULL,
  descricao text,
  severidade_tipica smallint DEFAULT 3,
  probabilidade_tipica smallint DEFAULT 3,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.aep_fatores_catalogo TO authenticated;
GRANT ALL ON public.aep_fatores_catalogo TO service_role;
ALTER TABLE public.aep_fatores_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads catalog" ON public.aep_fatores_catalogo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage catalog" ON public.aep_fatores_catalogo
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed do catálogo (~40 fatores)
INSERT INTO public.aep_fatores_catalogo (codigo, categoria, nome, descricao, severidade_tipica, probabilidade_tipica) VALUES
-- Ergonômico físico
('ef_posto_inadequado','ergonomico_fisico','Posto de trabalho inadequado','Layout, altura ou dimensões do posto não adequados à antropometria do trabalhador',3,4),
('ef_mobiliario_sem_regulagem','ergonomico_fisico','Mobiliário sem regulagem','Cadeiras, mesas ou apoios sem ajustes individuais',3,4),
('ef_iluminacao_inadequada','ergonomico_fisico','Iluminação inadequada','Iluminância insuficiente ou excessiva, ofuscamento, contraste',3,3),
('ef_ruido_cronico','ergonomico_fisico','Ruído crônico','Exposição prolongada a ruído ambiente que dificulta comunicação ou concentração',3,3),
('ef_temperatura_desconfortavel','ergonomico_fisico','Temperatura desconfortável','Calor ou frio fora da zona de conforto térmico',3,3),
('ef_levantamento_cargas','ergonomico_fisico','Levantamento manual de cargas','Manuseio de cargas com peso, frequência ou postura inadequados',4,4),
('ef_movimentos_repetitivos','ergonomico_fisico','Movimentos repetitivos','Ciclos de trabalho repetitivos de MMSS/MMII',4,4),
('ef_postura_estatica','ergonomico_fisico','Postura estática prolongada','Manutenção da mesma postura (em pé ou sentado) por longos períodos',3,4),
('ef_postura_forcada','ergonomico_fisico','Postura forçada','Trabalho com tronco, braços, pescoço ou pernas em posições não neutras',4,3),
-- Ergonômico organizacional
('eo_jornada_excessiva','ergonomico_organizacional','Jornada excessiva','Jornada acima do previsto, horas extras habituais',4,3),
('eo_ritmo_pressao','ergonomico_organizacional','Ritmo/pressão de tempo','Cadência ou prazos impostos pela produção/tecnologia',3,4),
('eo_pausas_insuficientes','ergonomico_organizacional','Pausas insuficientes','Ausência ou insuficiência de pausas psicofisiológicas',3,4),
('eo_metas_inatingiveis','ergonomico_organizacional','Metas inatingíveis','Metas desproporcionais aos recursos ou tempo disponível',4,3),
('eo_trabalho_noturno','ergonomico_organizacional','Trabalho noturno / turnos','Escalas em turnos, noturno ou rotativos',3,3),
('eo_sobrecarga_quantitativa','ergonomico_organizacional','Sobrecarga quantitativa','Volume de tarefas superior à capacidade de resposta',4,4),
-- Ergonômico cognitivo
('ec_sobrecarga_cognitiva','ergonomico_cognitivo','Sobrecarga cognitiva','Grande volume de informações a processar simultaneamente',3,3),
('ec_monotonia','ergonomico_cognitivo','Monotonia / subcarga','Trabalho pouco variado, baixa exigência mental',2,3),
('ec_atencao_sustentada','ergonomico_cognitivo','Atenção sustentada excessiva','Exigência prolongada de vigilância / concentração',3,3),
('ec_decisao_pressao','ergonomico_cognitivo','Tomada de decisão sob pressão','Decisões críticas em tempo restrito',3,3),
-- Psicossocial
('ps_baixa_autonomia','psicossocial','Baixa autonomia','Pouca margem de decisão sobre método, ritmo ou ordem das tarefas',3,4),
('ps_ambiguidade_papel','psicossocial','Ambiguidade de papel','Falta de clareza sobre responsabilidades e expectativas',3,3),
('ps_conflito_papel','psicossocial','Conflito de papel','Demandas contraditórias no exercício do cargo',3,3),
('ps_assedio_moral','psicossocial','Assédio moral','Condutas abusivas, humilhações ou isolamento no ambiente de trabalho',5,3),
('ps_assedio_sexual','psicossocial','Assédio sexual','Condutas de natureza sexual não consentidas',5,2),
('ps_discriminacao','psicossocial','Discriminação','Tratamento diferenciado baseado em características pessoais',5,2),
('ps_violencia_terceiros','psicossocial','Violência de terceiros','Agressões verbais ou físicas por clientes/usuários',4,3),
('ps_relacoes_degradadas','psicossocial','Relações socioprofissionais degradadas','Conflitos, hostilidade ou isolamento entre pares',3,3),
('ps_falta_suporte_chefia','psicossocial','Falta de suporte da chefia','Ausência de apoio técnico ou emocional da liderança',3,4),
('ps_falta_reconhecimento','psicossocial','Falta de reconhecimento','Desequilíbrio esforço-recompensa, ausência de feedback',3,4),
('ps_inseguranca_emprego','psicossocial','Insegurança no emprego','Medo constante de demissão ou instabilidade contratual',4,3),
('ps_conflito_trabalho_familia','psicossocial','Conflito trabalho-família','Interferência do trabalho na vida familiar e pessoal',3,3),
('ps_exigencia_emocional','psicossocial','Exigência emocional','Necessidade de controlar/expressar emoções específicas no trabalho',3,3),
('ps_exposicao_sofrimento','psicossocial','Exposição a sofrimento humano','Contato com dor, doença, morte ou vulnerabilidade de terceiros',4,3),
('ps_isolamento_social','psicossocial','Isolamento social no trabalho','Ausência de contato ou colaboração com colegas',3,3);
