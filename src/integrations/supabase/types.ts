export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          created_at: string
          error_message: string | null
          error_stack: string | null
          event_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          error_stack?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          error_stack?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      account_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          account_type: string
          company_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          sst_manager_id: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          account_type: string
          company_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          sst_manager_id?: string | null
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          account_type?: string
          company_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          sst_manager_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_invitations_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_invitations_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      aep_avaliacoes: {
        Row: {
          anonymity_ensured: boolean
          assessment_date: string
          company_id: string
          created_at: string
          created_by: string | null
          funcao_nome: string | null
          ghe_id: string | null
          id: string
          instrument_name: string | null
          methodologies: string[]
          methodology_details: string | null
          next_review_date: string | null
          parent_version_id: string | null
          pgr_document_id: string | null
          responsible_name: string | null
          responsible_registration: string | null
          responsible_role: string | null
          setor_nome: string | null
          signature_hash: string | null
          signed_at: string | null
          situacao_trabalho: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          anonymity_ensured?: boolean
          assessment_date?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          funcao_nome?: string | null
          ghe_id?: string | null
          id?: string
          instrument_name?: string | null
          methodologies?: string[]
          methodology_details?: string | null
          next_review_date?: string | null
          parent_version_id?: string | null
          pgr_document_id?: string | null
          responsible_name?: string | null
          responsible_registration?: string | null
          responsible_role?: string | null
          setor_nome?: string | null
          signature_hash?: string | null
          signed_at?: string | null
          situacao_trabalho: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          anonymity_ensured?: boolean
          assessment_date?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          funcao_nome?: string | null
          ghe_id?: string | null
          id?: string
          instrument_name?: string | null
          methodologies?: string[]
          methodology_details?: string | null
          next_review_date?: string | null
          parent_version_id?: string | null
          pgr_document_id?: string | null
          responsible_name?: string | null
          responsible_registration?: string | null
          responsible_role?: string | null
          setor_nome?: string | null
          signature_hash?: string | null
          signed_at?: string | null
          situacao_trabalho?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "aep_avaliacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aep_avaliacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aep_avaliacoes_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "pgr_ghe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aep_avaliacoes_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "aep_avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aep_avaliacoes_pgr_document_id_fkey"
            columns: ["pgr_document_id"]
            isOneToOne: false
            referencedRelation: "pgr_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      aep_evidencias: {
        Row: {
          aep_id: string
          descricao: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          aep_id: string
          descricao?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          aep_id?: string
          descricao?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aep_evidencias_aep_id_fkey"
            columns: ["aep_id"]
            isOneToOne: false
            referencedRelation: "aep_avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      aep_fatores_avaliados: {
        Row: {
          aep_id: string
          categoria: string
          created_at: string
          evidencia_texto: string | null
          fator_codigo: string | null
          fator_nome: string
          fonte_causa: string | null
          grupos_expostos: string | null
          id: string
          matrix_size: number
          observacoes: string | null
          probability: number
          severity: number
          source_assessment_id: string | null
          source_assessment_type: string | null
          updated_at: string
        }
        Insert: {
          aep_id: string
          categoria: string
          created_at?: string
          evidencia_texto?: string | null
          fator_codigo?: string | null
          fator_nome: string
          fonte_causa?: string | null
          grupos_expostos?: string | null
          id?: string
          matrix_size?: number
          observacoes?: string | null
          probability?: number
          severity?: number
          source_assessment_id?: string | null
          source_assessment_type?: string | null
          updated_at?: string
        }
        Update: {
          aep_id?: string
          categoria?: string
          created_at?: string
          evidencia_texto?: string | null
          fator_codigo?: string | null
          fator_nome?: string
          fonte_causa?: string | null
          grupos_expostos?: string | null
          id?: string
          matrix_size?: number
          observacoes?: string | null
          probability?: number
          severity?: number
          source_assessment_id?: string | null
          source_assessment_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aep_fatores_avaliados_aep_id_fkey"
            columns: ["aep_id"]
            isOneToOne: false
            referencedRelation: "aep_avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      aep_fatores_catalogo: {
        Row: {
          ativo: boolean
          categoria: string
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          probabilidade_tipica: number | null
          severidade_tipica: number | null
        }
        Insert: {
          ativo?: boolean
          categoria: string
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          probabilidade_tipica?: number | null
          severidade_tipica?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          probabilidade_tipica?: number | null
          severidade_tipica?: number | null
        }
        Relationships: []
      }
      aep_participantes: {
        Row: {
          aep_id: string
          anonimizado: boolean
          created_at: string
          data_participacao: string | null
          funcao: string | null
          id: string
          nome: string | null
          tipo_participacao: string | null
        }
        Insert: {
          aep_id: string
          anonimizado?: boolean
          created_at?: string
          data_participacao?: string | null
          funcao?: string | null
          id?: string
          nome?: string | null
          tipo_participacao?: string | null
        }
        Update: {
          aep_id?: string
          anonimizado?: boolean
          created_at?: string
          data_participacao?: string | null
          funcao?: string | null
          id?: string
          nome?: string | null
          tipo_participacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aep_participantes_aep_id_fkey"
            columns: ["aep_id"]
            isOneToOne: false
            referencedRelation: "aep_avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      aep_pgr_vinculo: {
        Row: {
          aep_fator_id: string
          id: string
          linked_at: string
          linked_by: string | null
          pgr_risk_id: string
        }
        Insert: {
          aep_fator_id: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          pgr_risk_id: string
        }
        Update: {
          aep_fator_id?: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          pgr_risk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aep_pgr_vinculo_aep_fator_id_fkey"
            columns: ["aep_fator_id"]
            isOneToOne: false
            referencedRelation: "aep_fatores_avaliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aep_pgr_vinculo_pgr_risk_id_fkey"
            columns: ["pgr_risk_id"]
            isOneToOne: false
            referencedRelation: "pgr_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_leads: {
        Row: {
          affiliate_id: string
          company_name: string
          created_at: string
          id: string
          name: string
          phone: string
          referral_code: string
        }
        Insert: {
          affiliate_id: string
          company_name: string
          created_at?: string
          id?: string
          name: string
          phone: string
          referral_code: string
        }
        Update: {
          affiliate_id?: string
          company_name?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          referral_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_leads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cnpj: string | null
          contract_signed: boolean | null
          contract_signed_at: string | null
          contract_signed_ip: string | null
          contract_url: string | null
          cpf: string
          created_at: string
          email: string
          endereco_completo: string
          estado_civil: string
          first_access_completed: boolean | null
          id: string
          nome_completo: string
          nome_fantasia: string | null
          phone: string | null
          profissao: string
          razao_social: string | null
          redirect_url: string | null
          referral_code: string
          rejection_reason: string | null
          rg: string
          status: string
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          tipo_pessoa: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cnpj?: string | null
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_signed_ip?: string | null
          contract_url?: string | null
          cpf: string
          created_at?: string
          email: string
          endereco_completo: string
          estado_civil: string
          first_access_completed?: boolean | null
          id?: string
          nome_completo: string
          nome_fantasia?: string | null
          phone?: string | null
          profissao: string
          razao_social?: string | null
          redirect_url?: string | null
          referral_code?: string
          rejection_reason?: string | null
          rg: string
          status?: string
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          tipo_pessoa?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cnpj?: string | null
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_signed_ip?: string | null
          contract_url?: string | null
          cpf?: string
          created_at?: string
          email?: string
          endereco_completo?: string
          estado_civil?: string
          first_access_completed?: boolean | null
          id?: string
          nome_completo?: string
          nome_fantasia?: string | null
          phone?: string | null
          profissao?: string
          razao_social?: string | null
          redirect_url?: string | null
          referral_code?: string
          rejection_reason?: string | null
          rg?: string
          status?: string
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          tipo_pessoa?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      beta_ouvidoria_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          report_id: string
          size_bytes: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          report_id: string
          size_bytes?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          report_id?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_ouvidoria_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "beta_ouvidoria_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_ouvidoria_reports: {
        Row: {
          access_key_hash: string | null
          category: string
          category_other: string | null
          company_id: string
          created_at: string
          description: string
          id: string
          location_sector: string | null
          occurrence_date: string | null
          occurrence_type: string
          report_type: string
          status: string
          tracking_code: string
          updated_at: string
        }
        Insert: {
          access_key_hash?: string | null
          category: string
          category_other?: string | null
          company_id: string
          created_at?: string
          description: string
          id?: string
          location_sector?: string | null
          occurrence_date?: string | null
          occurrence_type: string
          report_type: string
          status?: string
          tracking_code: string
          updated_at?: string
        }
        Update: {
          access_key_hash?: string | null
          category?: string
          category_other?: string | null
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          location_sector?: string | null
          occurrence_date?: string | null
          occurrence_type?: string
          report_type?: string
          status?: string
          tracking_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      beta_ouvidoria_updates: {
        Row: {
          author_type: string
          created_at: string
          id: string
          message: string
          report_id: string
        }
        Insert: {
          author_type: string
          created_at?: string
          id?: string
          message: string
          report_id: string
        }
        Update: {
          author_type?: string
          created_at?: string
          id?: string
          message?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_ouvidoria_updates_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "beta_ouvidoria_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      burnout_answers: {
        Row: {
          answer_value: number
          created_at: string | null
          id: string
          question_number: number
          response_id: string
        }
        Insert: {
          answer_value: number
          created_at?: string | null
          id?: string
          question_number: number
          response_id: string
        }
        Update: {
          answer_value?: number
          created_at?: string | null
          id?: string
          question_number?: number
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "burnout_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "burnout_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      burnout_assessments: {
        Row: {
          collection_mode: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          collection_mode?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          collection_mode?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "burnout_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "burnout_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      burnout_departments: {
        Row: {
          assessment_id: string
          created_at: string | null
          employee_count: number | null
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          employee_count?: number | null
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          employee_count?: number | null
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "burnout_departments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "burnout_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      burnout_responses: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string | null
          demographics: Json | null
          department: string | null
          id: string
          respondent_token: string
          risk_level: string | null
          total_score: number | null
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string | null
          demographics?: Json | null
          department?: string | null
          id?: string
          respondent_token: string
          risk_level?: string | null
          total_score?: number | null
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string | null
          demographics?: Json | null
          department?: string | null
          id?: string
          respondent_token?: string
          risk_level?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "burnout_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "burnout_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rate_limits: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          request_count: number | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          request_count?: number | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          request_count?: number | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      climate_surveys: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climate_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          employee_count: number
          extra_employee_slots: number
          id: string
          legacy_plan: boolean
          logo_url: string | null
          max_employees: number | null
          name: string
          notification_email_1: string | null
          notification_email_2: string | null
          notification_email_3: string | null
          parent_subscription_id: string | null
          phone: string | null
          referred_by_affiliate_id: string | null
          referred_by_partner_id: string | null
          slug: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_plan_slug: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          employee_count?: number
          extra_employee_slots?: number
          id?: string
          legacy_plan?: boolean
          logo_url?: string | null
          max_employees?: number | null
          name: string
          notification_email_1?: string | null
          notification_email_2?: string | null
          notification_email_3?: string | null
          parent_subscription_id?: string | null
          phone?: string | null
          referred_by_affiliate_id?: string | null
          referred_by_partner_id?: string | null
          slug?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_plan_slug?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          employee_count?: number
          extra_employee_slots?: number
          id?: string
          legacy_plan?: boolean
          logo_url?: string | null
          max_employees?: number | null
          name?: string
          notification_email_1?: string | null
          notification_email_2?: string | null
          notification_email_3?: string | null
          parent_subscription_id?: string | null
          phone?: string | null
          referred_by_affiliate_id?: string | null
          referred_by_partner_id?: string | null
          slug?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_plan_slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_subscription_id_fkey"
            columns: ["parent_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_referred_by_affiliate_id_fkey"
            columns: ["referred_by_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "licensed_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      company_feature_access: {
        Row: {
          burnout_enabled: boolean
          clima_enabled: boolean
          company_id: string
          ouvidoria_enabled: boolean
          psicossocial_enabled: boolean
          treinamentos_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          burnout_enabled?: boolean
          clima_enabled?: boolean
          company_id: string
          ouvidoria_enabled?: boolean
          psicossocial_enabled?: boolean
          treinamentos_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          burnout_enabled?: boolean
          clima_enabled?: boolean
          company_id?: string
          ouvidoria_enabled?: boolean
          psicossocial_enabled?: boolean
          treinamentos_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_feature_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_feature_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_sst_assignments: {
        Row: {
          assigned_at: string | null
          company_id: string
          id: string
          sst_manager_id: string
        }
        Insert: {
          assigned_at?: string | null
          company_id: string
          id?: string
          sst_manager_id: string
        }
        Update: {
          assigned_at?: string | null
          company_id?: string
          id?: string
          sst_manager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_sst_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_sst_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_sst_assignments_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_sst_assignments_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      copsoq_answers: {
        Row: {
          answer_value: number
          created_at: string
          id: string
          question_number: number
          response_id: string
        }
        Insert: {
          answer_value: number
          created_at?: string
          id?: string
          question_number: number
          response_id: string
        }
        Update: {
          answer_value?: number
          created_at?: string
          id?: string
          question_number?: number
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copsoq_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "copsoq_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      copsoq_assessments: {
        Row: {
          collection_mode: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          multi_sector_enabled: boolean
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          collection_mode?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          multi_sector_enabled?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          collection_mode?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          multi_sector_enabled?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copsoq_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copsoq_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      copsoq_departments: {
        Row: {
          assessment_id: string
          created_at: string
          employee_count: number | null
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          employee_count?: number | null
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          employee_count?: number | null
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "copsoq_departments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "copsoq_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      copsoq_responses: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string
          demographics: Json | null
          department: string | null
          departments: string[] | null
          id: string
          respondent_token: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          demographics?: Json | null
          department?: string | null
          departments?: string[] | null
          id?: string
          respondent_token: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          demographics?: Json | null
          department?: string | null
          departments?: string[] | null
          id?: string
          respondent_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "copsoq_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "copsoq_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_leads: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          employee_count: string | null
          id: string
          message: string | null
          name: string
          phone: string
          source: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          employee_count?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          source?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          employee_count?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          source?: string
        }
        Relationships: []
      }
      email_send_attempts: {
        Row: {
          context: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          status: string
          subscription_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          status: string
          subscription_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_attempts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      esocial_agents_catalog: {
        Row: {
          category: string
          code: string
          description: string | null
          exposure_limit: number | null
          name: string
          unit: string | null
        }
        Insert: {
          category: string
          code: string
          description?: string | null
          exposure_limit?: number | null
          name: string
          unit?: string | null
        }
        Update: {
          category?: string
          code?: string
          description?: string | null
          exposure_limit?: number | null
          name?: string
          unit?: string | null
        }
        Relationships: []
      }
      hotmart_product_plans: {
        Row: {
          created_at: string
          hotmart_offer_code: string | null
          hotmart_product_id: string
          is_active: boolean
          notes: string | null
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hotmart_offer_code?: string | null
          hotmart_product_id: string
          is_active?: boolean
          notes?: string | null
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hotmart_offer_code?: string | null
          hotmart_product_id?: string
          is_active?: boolean
          notes?: string | null
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotmart_product_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      hseit_answers: {
        Row: {
          answer_value: number
          created_at: string
          id: string
          question_number: number
          response_id: string
        }
        Insert: {
          answer_value: number
          created_at?: string
          id?: string
          question_number: number
          response_id: string
        }
        Update: {
          answer_value?: number
          created_at?: string
          id?: string
          question_number?: number
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hseit_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "hseit_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      hseit_assessments: {
        Row: {
          collection_mode: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          multi_sector_enabled: boolean
          start_date: string | null
          title: string
          updated_at: string
          wording_variant: string
        }
        Insert: {
          collection_mode?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          multi_sector_enabled?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
          wording_variant?: string
        }
        Update: {
          collection_mode?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          multi_sector_enabled?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
          wording_variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "hseit_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hseit_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hseit_departments: {
        Row: {
          assessment_id: string
          created_at: string
          employee_count: number
          id: string
          name: string
          order_index: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          employee_count?: number
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          employee_count?: number
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "hseit_departments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "hseit_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      hseit_responses: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string
          demographics: Json | null
          department: string | null
          departments: string[] | null
          id: string
          respondent_token: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          demographics?: Json | null
          department?: string | null
          departments?: string[] | null
          id?: string
          respondent_token: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          demographics?: Json | null
          department?: string | null
          departments?: string[] | null
          id?: string
          respondent_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "hseit_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "hseit_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      licensed_partners: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cnpj: string
          contract_signed: boolean | null
          contract_signed_at: string | null
          contract_signed_ip: string | null
          contract_url: string | null
          created_at: string
          email: string
          endereco_completo: string
          first_access_completed: boolean | null
          id: string
          nome_fantasia: string
          phone: string | null
          razao_social: string
          referral_code: string
          rejection_reason: string | null
          status: string
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cnpj: string
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_signed_ip?: string | null
          contract_url?: string | null
          created_at?: string
          email: string
          endereco_completo: string
          first_access_completed?: boolean | null
          id?: string
          nome_fantasia: string
          phone?: string | null
          razao_social: string
          referral_code?: string
          rejection_reason?: string | null
          status?: string
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cnpj?: string
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_signed_ip?: string | null
          contract_url?: string | null
          created_at?: string
          email?: string
          endereco_completo?: string
          first_access_completed?: boolean | null
          id?: string
          nome_fantasia?: string
          phone?: string | null
          razao_social?: string
          referral_code?: string
          rejection_reason?: string | null
          status?: string
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partner_prospects: {
        Row: {
          company_name: string
          contact_name: string | null
          converted_company_id: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          partner_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          converted_company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          partner_id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          converted_company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          partner_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_prospects_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_prospects_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_prospects_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "licensed_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_representatives: {
        Row: {
          cpf: string
          created_at: string
          id: string
          is_primary: boolean | null
          nome: string
          partner_id: string
          rg: string
        }
        Insert: {
          cpf: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          nome: string
          partner_id: string
          rg: string
        }
        Update: {
          cpf?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          nome?: string
          partner_id?: string
          rg?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_representatives_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "licensed_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_action_checklist_items: {
        Row: {
          action_item_id: string
          created_at: string
          done: boolean
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          action_item_id: string
          created_at?: string
          done?: boolean
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          action_item_id?: string
          created_at?: string
          done?: boolean
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pgr_action_checklist_items_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "pgr_action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_action_items: {
        Row: {
          control_hierarchy: string | null
          cost: number | null
          created_at: string
          deadline: string | null
          description: string
          evidence_url: string | null
          id: string
          pgr_document_id: string
          responsible: string | null
          risk_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          control_hierarchy?: string | null
          cost?: number | null
          created_at?: string
          deadline?: string | null
          description: string
          evidence_url?: string | null
          id?: string
          pgr_document_id: string
          responsible?: string | null
          risk_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          control_hierarchy?: string | null
          cost?: number | null
          created_at?: string
          deadline?: string | null
          description?: string
          evidence_url?: string | null
          id?: string
          pgr_document_id?: string
          responsible?: string | null
          risk_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pgr_action_items_pgr_document_id_fkey"
            columns: ["pgr_document_id"]
            isOneToOne: false
            referencedRelation: "pgr_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pgr_action_items_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "pgr_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_documents: {
        Row: {
          address: string | null
          cnae: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document_type: string
          executive_summary: string | null
          has_lodging: boolean | null
          id: string
          last_review_at: string | null
          lodging_description: string | null
          responsible_cpf: string | null
          responsible_name: string | null
          responsible_registration: string | null
          risk_grade: string | null
          rural_activity: string | null
          rural_area_hectares: number | null
          sst_manager_id: string | null
          status: string
          title: string
          updated_at: string
          validity_end: string | null
          validity_start: string | null
          version: number
          work_regime: string | null
          worker_transport: string | null
        }
        Insert: {
          address?: string | null
          cnae?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          executive_summary?: string | null
          has_lodging?: boolean | null
          id?: string
          last_review_at?: string | null
          lodging_description?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          responsible_registration?: string | null
          risk_grade?: string | null
          rural_activity?: string | null
          rural_area_hectares?: number | null
          sst_manager_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
          version?: number
          work_regime?: string | null
          worker_transport?: string | null
        }
        Update: {
          address?: string | null
          cnae?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          executive_summary?: string | null
          has_lodging?: boolean | null
          id?: string
          last_review_at?: string | null
          lodging_description?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          responsible_registration?: string | null
          risk_grade?: string | null
          rural_activity?: string | null
          rural_area_hectares?: number | null
          sst_manager_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
          version?: number
          work_regime?: string | null
          worker_transport?: string | null
        }
        Relationships: []
      }
      pgr_esocial_exports: {
        Row: {
          event_type: string
          file_hash: string | null
          file_path: string
          generated_at: string
          generated_by: string | null
          id: string
          pgr_document_id: string
          reference_period: string | null
          worker_count: number | null
        }
        Insert: {
          event_type?: string
          file_hash?: string | null
          file_path: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          pgr_document_id: string
          reference_period?: string | null
          worker_count?: number | null
        }
        Update: {
          event_type?: string
          file_hash?: string | null
          file_path?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          pgr_document_id?: string
          reference_period?: string | null
          worker_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pgr_esocial_exports_pgr_document_id_fkey"
            columns: ["pgr_document_id"]
            isOneToOne: false
            referencedRelation: "pgr_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_ghe: {
        Row: {
          activities_description: string | null
          created_at: string
          id: string
          name: string
          pgr_document_id: string
          role: string | null
          sector: string | null
          updated_at: string
          work_schedule: string | null
          worker_count: number
        }
        Insert: {
          activities_description?: string | null
          created_at?: string
          id?: string
          name: string
          pgr_document_id: string
          role?: string | null
          sector?: string | null
          updated_at?: string
          work_schedule?: string | null
          worker_count?: number
        }
        Update: {
          activities_description?: string | null
          created_at?: string
          id?: string
          name?: string
          pgr_document_id?: string
          role?: string | null
          sector?: string | null
          updated_at?: string
          work_schedule?: string | null
          worker_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "pgr_ghe_pgr_document_id_fkey"
            columns: ["pgr_document_id"]
            isOneToOne: false
            referencedRelation: "pgr_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_ghe_workers: {
        Row: {
          admission_date: string | null
          cpf: string
          created_at: string
          full_name: string
          ghe_id: string
          id: string
          registration_number: string | null
        }
        Insert: {
          admission_date?: string | null
          cpf: string
          created_at?: string
          full_name: string
          ghe_id: string
          id?: string
          registration_number?: string | null
        }
        Update: {
          admission_date?: string | null
          cpf?: string
          created_at?: string
          full_name?: string
          ghe_id?: string
          id?: string
          registration_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pgr_ghe_workers_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "pgr_ghe"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_monitoring: {
        Row: {
          created_at: string
          id: string
          instrument: string | null
          measured_at: string
          observations: string | null
          report_url: string | null
          risk_id: string
          technique: string | null
          unit: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          instrument?: string | null
          measured_at: string
          observations?: string | null
          report_url?: string | null
          risk_id: string
          technique?: string | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          instrument?: string | null
          measured_at?: string
          observations?: string | null
          report_url?: string | null
          risk_id?: string
          technique?: string | null
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pgr_monitoring_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "pgr_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_risks: {
        Row: {
          agent_name: string
          category: string
          created_at: string
          epi_ca: string | null
          esocial_agent_code: string | null
          existing_epc: string | null
          existing_epi: string | null
          exposure_description: string | null
          exposure_limit: number | null
          ghe_id: string | null
          id: string
          matrix_size: number
          measurement_unit: string | null
          measurement_value: number | null
          observations: string | null
          pesticide_active_ingredient: string | null
          pesticide_product: string | null
          pesticide_reentry_period: string | null
          pesticide_required_epi: string | null
          pesticide_toxicity_class: string | null
          pgr_document_id: string
          probability: number
          risk_level: string
          severity: number
          source: string | null
          source_module: string | null
          source_module_id: string | null
          trajectory: string | null
          updated_at: string
        }
        Insert: {
          agent_name: string
          category: string
          created_at?: string
          epi_ca?: string | null
          esocial_agent_code?: string | null
          existing_epc?: string | null
          existing_epi?: string | null
          exposure_description?: string | null
          exposure_limit?: number | null
          ghe_id?: string | null
          id?: string
          matrix_size?: number
          measurement_unit?: string | null
          measurement_value?: number | null
          observations?: string | null
          pesticide_active_ingredient?: string | null
          pesticide_product?: string | null
          pesticide_reentry_period?: string | null
          pesticide_required_epi?: string | null
          pesticide_toxicity_class?: string | null
          pgr_document_id: string
          probability?: number
          risk_level?: string
          severity?: number
          source?: string | null
          source_module?: string | null
          source_module_id?: string | null
          trajectory?: string | null
          updated_at?: string
        }
        Update: {
          agent_name?: string
          category?: string
          created_at?: string
          epi_ca?: string | null
          esocial_agent_code?: string | null
          existing_epc?: string | null
          existing_epi?: string | null
          exposure_description?: string | null
          exposure_limit?: number | null
          ghe_id?: string | null
          id?: string
          matrix_size?: number
          measurement_unit?: string | null
          measurement_value?: number | null
          observations?: string | null
          pesticide_active_ingredient?: string | null
          pesticide_product?: string | null
          pesticide_reentry_period?: string | null
          pesticide_required_epi?: string | null
          pesticide_toxicity_class?: string | null
          pgr_document_id?: string
          probability?: number
          risk_level?: string
          severity?: number
          source?: string | null
          source_module?: string | null
          source_module_id?: string | null
          trajectory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pgr_risks_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "pgr_ghe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pgr_risks_pgr_document_id_fkey"
            columns: ["pgr_document_id"]
            isOneToOne: false
            referencedRelation: "pgr_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pgtr_agents_catalog: {
        Row: {
          agent_name: string
          category: string
          created_at: string
          description: string | null
          id: string
          typical_epi: string | null
          typical_probability: number | null
          typical_severity: number | null
        }
        Insert: {
          agent_name: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          typical_epi?: string | null
          typical_probability?: number | null
          typical_severity?: number | null
        }
        Update: {
          agent_name?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          typical_epi?: string | null
          typical_probability?: number | null
          typical_severity?: number | null
        }
        Relationships: []
      }
      plan_upgrade_pricing: {
        Row: {
          created_at: string
          id: string
          kind: string
          plan_id: string
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          plan_id: string
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          plan_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_upgrade_pricing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          must_change_password: boolean | null
          password_reset_reason: string | null
          sst_manager_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          must_change_password?: boolean | null
          password_reset_reason?: string | null
          sst_manager_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          must_change_password?: boolean | null
          password_reset_reason?: string | null
          sst_manager_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_answers: {
        Row: {
          created_at: string
          id: string
          question_id: string
          response_id: string
          score: number
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          response_id: string
          score: number
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pulse_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "pulse_survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_cycles: {
        Row: {
          closed_at: string | null
          created_at: string
          cycle_number: number
          ended_at: string
          id: string
          pulse_survey_id: string
          started_at: string
          summary_email_sent_at: string | null
          total_responses: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          cycle_number: number
          ended_at: string
          id?: string
          pulse_survey_id: string
          started_at?: string
          summary_email_sent_at?: string | null
          total_responses?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          cycle_number?: number
          ended_at?: string
          id?: string
          pulse_survey_id?: string
          started_at?: string
          summary_email_sent_at?: string | null
          total_responses?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_cycles_pulse_survey_id_fkey"
            columns: ["pulse_survey_id"]
            isOneToOne: false
            referencedRelation: "pulse_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_departments: {
        Row: {
          created_at: string
          id: string
          name: string
          pulse_survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pulse_survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pulse_survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_departments_pulse_survey_id_fkey"
            columns: ["pulse_survey_id"]
            isOneToOne: false
            referencedRelation: "pulse_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_questions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          order_index: number
          pulse_survey_id: string
          required: boolean
          text: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          order_index?: number
          pulse_survey_id: string
          required?: boolean
          text: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          order_index?: number
          pulse_survey_id?: string
          required?: boolean
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_questions_pulse_survey_id_fkey"
            columns: ["pulse_survey_id"]
            isOneToOne: false
            referencedRelation: "pulse_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_responses: {
        Row: {
          cycle_id: string
          department_name: string | null
          id: string
          pulse_survey_id: string
          submitted_at: string
        }
        Insert: {
          cycle_id: string
          department_name?: string | null
          id?: string
          pulse_survey_id: string
          submitted_at?: string
        }
        Update: {
          cycle_id?: string
          department_name?: string | null
          id?: string
          pulse_survey_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_responses_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "pulse_survey_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_survey_responses_pulse_survey_id_fkey"
            columns: ["pulse_survey_id"]
            isOneToOne: false
            referencedRelation: "pulse_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_surveys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          frequency: string
          id: string
          manager_email: string
          status: string
          title: string
          updated_at: string
          use_emojis: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency: string
          id?: string
          manager_email: string
          status?: string
          title: string
          updated_at?: string
          use_emojis?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string
          id?: string
          manager_email?: string
          status?: string
          title?: string
          updated_at?: string
          use_emojis?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pulse_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      report_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          report_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          report_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_public"
            referencedColumns: ["id"]
          },
        ]
      }
      report_updates: {
        Row: {
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          report_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          report_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          report_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_updates_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_updates_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          ai_summary: string | null
          category: string
          company_id: string
          created_at: string
          department: string | null
          description: string
          id: string
          is_anonymous: boolean
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          status: string
          title: string
          tracking_code: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          ai_summary?: string | null
          category: string
          company_id: string
          created_at?: string
          department?: string | null
          description: string
          id?: string
          is_anonymous?: boolean
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string
          title: string
          tracking_code?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          ai_summary?: string | null
          category?: string
          company_id?: string
          created_at?: string
          department?: string | null
          description?: string
          id?: string
          is_anonymous?: boolean
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string
          title?: string
          tracking_code?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          archived: boolean
          archived_at: string | null
          assisted_companies_count: number | null
          city: string | null
          closing_meeting_date: string | null
          closing_notes: string | null
          cnpj: string | null
          company_name: string
          contact_name: string | null
          contact_role: string | null
          created_at: string
          created_by: string | null
          denial_reason: string | null
          id: string
          large_companies: string | null
          large_companies_employees: string | null
          meeting_date: string | null
          notes: string | null
          phone: string | null
          result: string | null
          status: string
          total_assisted_employees: number | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          assisted_companies_count?: number | null
          city?: string | null
          closing_meeting_date?: string | null
          closing_notes?: string | null
          cnpj?: string | null
          company_name: string
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string
          created_by?: string | null
          denial_reason?: string | null
          id?: string
          large_companies?: string | null
          large_companies_employees?: string | null
          meeting_date?: string | null
          notes?: string | null
          phone?: string | null
          result?: string | null
          status?: string
          total_assisted_employees?: number | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          assisted_companies_count?: number | null
          city?: string | null
          closing_meeting_date?: string | null
          closing_notes?: string | null
          cnpj?: string | null
          company_name?: string
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string
          created_by?: string | null
          denial_reason?: string | null
          id?: string
          large_companies?: string | null
          large_companies_employees?: string | null
          meeting_date?: string | null
          notes?: string | null
          phone?: string | null
          result?: string | null
          status?: string
          total_assisted_employees?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sector_viewer_access: {
        Row: {
          assessment_type: string
          company_id: string
          created_at: string
          department_name: string
          granted_by: string | null
          id: string
          sst_manager_id: string
          user_id: string
        }
        Insert: {
          assessment_type: string
          company_id: string
          created_at?: string
          department_name: string
          granted_by?: string | null
          id?: string
          sst_manager_id: string
          user_id: string
        }
        Update: {
          assessment_type?: string
          company_id?: string
          created_at?: string
          department_name?: string
          granted_by?: string | null
          id?: string
          sst_manager_id?: string
          user_id?: string
        }
        Relationships: []
      }
      sector_viewer_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          assessment_type: string
          company_id: string
          created_at: string
          department_names: string[]
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          sst_manager_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          assessment_type: string
          company_id: string
          created_at?: string
          department_names: string[]
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          sst_manager_id: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          assessment_type?: string
          company_id?: string
          created_at?: string
          department_names?: string[]
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          sst_manager_id?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      sst_extra_slot_purchases: {
        Row: {
          asaas_subscription_id: string | null
          billing_started_at: string | null
          company_id: string | null
          created_at: string
          id: string
          kind: string
          purchased_by: string | null
          slots_added: number
          sst_manager_id: string | null
          status: string
          subscription_id: string | null
          unit_price_cents: number
        }
        Insert: {
          asaas_subscription_id?: string | null
          billing_started_at?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          purchased_by?: string | null
          slots_added?: number
          sst_manager_id?: string | null
          status?: string
          subscription_id?: string | null
          unit_price_cents?: number
        }
        Update: {
          asaas_subscription_id?: string | null
          billing_started_at?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          purchased_by?: string | null
          slots_added?: number
          sst_manager_id?: string | null
          status?: string
          subscription_id?: string | null
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "sst_extra_slot_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_extra_slot_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_extra_slot_purchases_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_extra_slot_purchases_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_extra_slot_purchases_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_managers: {
        Row: {
          address: string | null
          brand_color: string | null
          cnpj: string | null
          contract_expires_at: string | null
          contract_signed_at: string | null
          created_at: string | null
          email: string | null
          extra_company_slots: number
          extra_employee_slots: number
          id: string
          logo_url: string | null
          max_companies: number
          name: string
          onboarding_completed_pages: Json | null
          pgr_module_enabled: boolean
          phone: string | null
          slug: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          cnpj?: string | null
          contract_expires_at?: string | null
          contract_signed_at?: string | null
          created_at?: string | null
          email?: string | null
          extra_company_slots?: number
          extra_employee_slots?: number
          id?: string
          logo_url?: string | null
          max_companies?: number
          name: string
          onboarding_completed_pages?: Json | null
          pgr_module_enabled?: boolean
          phone?: string | null
          slug?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          cnpj?: string | null
          contract_expires_at?: string | null
          contract_signed_at?: string | null
          created_at?: string | null
          email?: string | null
          extra_company_slots?: number
          extra_employee_slots?: number
          id?: string
          logo_url?: string | null
          max_companies?: number
          name?: string
          onboarding_completed_pages?: Json | null
          pgr_module_enabled?: boolean
          phone?: string | null
          slug?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sst_portal_documents: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string
          file_url: string
          id: string
          target_sst_manager_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          target_sst_manager_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          target_sst_manager_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sst_portal_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean | null
          target_sst_manager_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          target_sst_manager_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          target_sst_manager_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sst_portal_trainings: {
        Row: {
          category: string | null
          content_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          target_sst_manager_ids: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          target_sst_manager_ids?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          target_sst_manager_ids?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sst_training_company_access: {
        Row: {
          company_id: string
          granted_at: string
          id: string
          module_id: string
        }
        Insert: {
          company_id: string
          granted_at?: string
          id?: string
          module_id: string
        }
        Update: {
          company_id?: string
          granted_at?: string
          id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sst_training_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_training_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_training_company_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "sst_training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_training_materials: {
        Row: {
          article_content: string | null
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          material_type: string
          module_id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          article_content?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          material_type: string
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          article_content?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          material_type?: string
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sst_training_materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "sst_training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_training_modules: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          order_index: number
          sst_manager_id: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          sst_manager_id: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          sst_manager_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sst_training_modules_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_training_modules_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          ai_enabled: boolean
          base_price_cents: number
          category: string
          create_company_login: boolean
          created_at: string | null
          display_order: number
          features: Json | null
          id: string
          is_active: boolean | null
          is_custom_quote: boolean
          max_cnpjs: number | null
          max_companies: number | null
          max_employees: number | null
          min_employees: number
          name: string
          ouvidoria_enabled: boolean
          pgr_enabled: boolean
          price_annual_cents: number | null
          price_monthly_cents: number | null
          price_per_employee_cents: number | null
          price_quarterly_cents: number | null
          roi_initial_cents: number | null
          roi_monthly_cents: number | null
          slug: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          tier: string | null
          trial_days: number | null
          trial_redirect_url: string | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          ai_enabled?: boolean
          base_price_cents: number
          category?: string
          create_company_login?: boolean
          created_at?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_custom_quote?: boolean
          max_cnpjs?: number | null
          max_companies?: number | null
          max_employees?: number | null
          min_employees: number
          name: string
          ouvidoria_enabled?: boolean
          pgr_enabled?: boolean
          price_annual_cents?: number | null
          price_monthly_cents?: number | null
          price_per_employee_cents?: number | null
          price_quarterly_cents?: number | null
          roi_initial_cents?: number | null
          roi_monthly_cents?: number | null
          slug: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier?: string | null
          trial_days?: number | null
          trial_redirect_url?: string | null
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          ai_enabled?: boolean
          base_price_cents?: number
          category?: string
          create_company_login?: boolean
          created_at?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_custom_quote?: boolean
          max_cnpjs?: number | null
          max_companies?: number | null
          max_employees?: number | null
          min_employees?: number
          name?: string
          ouvidoria_enabled?: boolean
          pgr_enabled?: boolean
          price_annual_cents?: number | null
          price_monthly_cents?: number | null
          price_per_employee_cents?: number | null
          price_quarterly_cents?: number | null
          roi_initial_cents?: number | null
          roi_monthly_cents?: number | null
          slug?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier?: string | null
          trial_days?: number | null
          trial_redirect_url?: string | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle_enum"]
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          hotmart_subscriber_code: string | null
          hotmart_transaction_id: string | null
          id: string
          invoice_url: string | null
          metadata: Json | null
          next_charge_date: string | null
          owner_email: string
          owner_user_id: string | null
          plan_id: string
          provider: string
          status: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle_enum"]
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          hotmart_subscriber_code?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          invoice_url?: string | null
          metadata?: Json | null
          next_charge_date?: string | null
          owner_email: string
          owner_user_id?: string | null
          plan_id: string
          provider?: string
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle_enum"]
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          hotmart_subscriber_code?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          invoice_url?: string | null
          metadata?: Json | null
          next_charge_date?: string | null
          owner_email?: string
          owner_user_id?: string | null
          plan_id?: string
          provider?: string
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          answer_text: string | null
          answer_value: string | null
          created_at: string
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_text?: string | null
          answer_value?: string | null
          created_at?: string
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_text?: string | null
          answer_value?: string | null
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_departments: {
        Row: {
          created_at: string
          employee_count: number
          id: string
          name: string
          order_index: number
          survey_id: string
        }
        Insert: {
          created_at?: string
          employee_count?: number
          id?: string
          name: string
          order_index?: number
          survey_id: string
        }
        Update: {
          created_at?: string
          employee_count?: number
          id?: string
          name?: string
          order_index?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_departments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "climate_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["survey_question_type"]
          survey_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: Database["public"]["Enums"]["survey_question_type"]
          survey_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["survey_question_type"]
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "climate_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completed_at: string | null
          created_at: string
          demographics: Json | null
          department: string | null
          id: string
          respondent_token: string
          survey_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          demographics?: Json | null
          department?: string | null
          id?: string
          respondent_token: string
          survey_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          demographics?: Json | null
          department?: string | null
          id?: string
          respondent_token?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "climate_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sst_managers: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          sst_manager_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          sst_manager_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          sst_manager_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sst_managers_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sst_managers_sst_manager_id_fkey"
            columns: ["sst_manager_id"]
            isOneToOne: false
            referencedRelation: "sst_managers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          enabled: boolean
          notes: string | null
          provider: string
          token: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          notes?: string | null
          provider: string
          token?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          notes?: string | null
          provider?: string
          token?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          error: string | null
          event_type: string | null
          headers: Json | null
          id: string
          payload: Json | null
          provider: string
          received_at: string
          response: Json | null
          source_ip: string | null
          status_code: number | null
        }
        Insert: {
          error?: string | null
          event_type?: string | null
          headers?: Json | null
          id?: string
          payload?: Json | null
          provider: string
          received_at?: string
          response?: Json | null
          source_ip?: string | null
          status_code?: number | null
        }
        Update: {
          error?: string | null
          event_type?: string | null
          headers?: Json | null
          id?: string
          payload?: Json | null
          provider?: string
          received_at?: string
          response?: Json | null
          source_ip?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      companies_public: {
        Row: {
          id: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      reports_public: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          department: string | null
          id: string | null
          is_anonymous: boolean | null
          status: string | null
          title: string | null
          tracking_code: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          status?: string | null
          title?: string | null
          tracking_code?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          status?: string | null
          title?: string | null
          tracking_code?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_managers_public: {
        Row: {
          brand_color: string | null
          email: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          phone: string | null
          slug: string | null
        }
        Insert: {
          brand_color?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          slug?: string | null
        }
        Update: {
          brand_color?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      company_has_no_sst: { Args: { _company_id: string }; Returns: boolean }
      company_has_smart_ouvidoria: {
        Args: { _company_id: string }
        Returns: boolean
      }
      count_sst_companies: {
        Args: { _sst_manager_id: string }
        Returns: number
      }
      count_training_materials: {
        Args: { _module_id: string }
        Returns: number
      }
      entity_has_ai_access: {
        Args: { _company_id: string; _sst_manager_id: string }
        Returns: boolean
      }
      generate_tracking_code: { Args: never; Returns: string }
      get_company_features: {
        Args: { _company_id: string }
        Returns: {
          burnout_enabled: boolean
          clima_enabled: boolean
          ouvidoria_enabled: boolean
          psicossocial_enabled: boolean
          treinamentos_enabled: boolean
        }[]
      }
      get_sst_max_companies: {
        Args: { _sst_manager_id: string }
        Returns: number
      }
      get_user_sector_access: {
        Args: { _user_id: string }
        Returns: {
          assessment_type: string
          company_id: string
          company_name: string
          department_name: string
        }[]
      }
      get_user_sst_manager_id: { Args: { _user_id: string }; Returns: string }
      has_ai_access: { Args: { _user_id: string }; Returns: boolean }
      has_pgr_module: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_sector_access: {
        Args: {
          _assessment_type: string
          _company_id: string
          _department_name: string
          _user_id: string
        }
        Returns: boolean
      }
      is_sst_module_owner: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      pulse_create_next_cycle: { Args: { _survey_id: string }; Returns: string }
      pulse_cycle_duration: { Args: { _frequency: string }; Returns: string }
      user_has_aep_access: {
        Args: { _aep_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_pgr_shortcut_plan: {
        Args: { _user_id: string }
        Returns: boolean
      }
      user_has_smart_plan: { Args: { _user_id: string }; Returns: boolean }
      user_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_sst_manager: {
        Args: { _sst_manager_id: string; _user_id: string }
        Returns: boolean
      }
      user_manages_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "company"
        | "sst"
        | "pending"
        | "partner"
        | "affiliate"
        | "sales"
        | "sector_viewer"
      billing_cycle_enum: "monthly" | "quarterly" | "annual"
      subscription_status_enum:
        | "pending"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
        | "trial"
        | "trialing"
      survey_question_type:
        | "likert"
        | "single_choice"
        | "multiple_choice"
        | "scale_0_10"
        | "open_text"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "company",
        "sst",
        "pending",
        "partner",
        "affiliate",
        "sales",
        "sector_viewer",
      ],
      billing_cycle_enum: ["monthly", "quarterly", "annual"],
      subscription_status_enum: [
        "pending",
        "active",
        "past_due",
        "canceled",
        "expired",
        "trial",
        "trialing",
      ],
      survey_question_type: [
        "likert",
        "single_choice",
        "multiple_choice",
        "scale_0_10",
        "open_text",
      ],
    },
  },
} as const
