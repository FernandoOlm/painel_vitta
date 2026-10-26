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
      acoes_trabalhador: {
        Row: {
          arquivo_url: string | null
          created_at: string
          data_realizacao: string | null
          data_vencimento: string | null
          descricao: string
          id: string
          observacoes: string | null
          tipo: Database["public"]["Enums"]["acao_tipo"]
          trabalhador_id: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          data_realizacao?: string | null
          data_vencimento?: string | null
          descricao: string
          id?: string
          observacoes?: string | null
          tipo: Database["public"]["Enums"]["acao_tipo"]
          trabalhador_id: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          data_realizacao?: string | null
          data_vencimento?: string | null
          descricao?: string
          id?: string
          observacoes?: string | null
          tipo?: Database["public"]["Enums"]["acao_tipo"]
          trabalhador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_trabalhador_trabalhador_id_fkey"
            columns: ["trabalhador_id"]
            isOneToOne: false
            referencedRelation: "trabalhadores"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_logs: {
        Row: {
          campanha_id: string
          created_at: string
          error_message: string | null
          id: string
          sent_at: string
          status: string
          target: string
        }
        Insert: {
          campanha_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status: string
          target: string
        }
        Update: {
          campanha_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_logs_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          created_at: string
          criado_por: string | null
          destinatarios: string[]
          enviados: number
          erros: number
          finalizada_em: string | null
          id: string
          media_url: string | null
          mensagem: string
          resposta: string | null
          scheduled_at: string | null
          status: string
          titulo: string | null
          total_destinatarios: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          destinatarios?: string[]
          enviados?: number
          erros?: number
          finalizada_em?: string | null
          id?: string
          media_url?: string | null
          mensagem: string
          resposta?: string | null
          scheduled_at?: string | null
          status?: string
          titulo?: string | null
          total_destinatarios?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          destinatarios?: string[]
          enviados?: number
          erros?: number
          finalizada_em?: string | null
          id?: string
          media_url?: string | null
          mensagem?: string
          resposta?: string | null
          scheduled_at?: string | null
          status?: string
          titulo?: string | null
          total_destinatarios?: number
          updated_at?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          created_at: string
          criado_por: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["contato_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["contato_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["contato_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          contabilidade: string | null
          contador_email: string | null
          contador_telefone: string | null
          contato_responsavel: string | null
          created_at: string
          data_entrada: string | null
          dia_faturamento: number | null
          email: string | null
          endereco: string | null
          estado: string | null
          grau_risco: number | null
          id: string
          mes_renovacao: string | null
          nome: string
          observacoes: string | null
          razao_social: string | null
          resp_contador: string | null
          resp_rh: string | null
          rh_email: string | null
          rh_telefone: string | null
          status: string
          telefone: string | null
          tem_contrato: boolean
          updated_at: string
          venc_art: string | null
          vidas: number | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          contabilidade?: string | null
          contador_email?: string | null
          contador_telefone?: string | null
          contato_responsavel?: string | null
          created_at?: string
          data_entrada?: string | null
          dia_faturamento?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          grau_risco?: number | null
          id?: string
          mes_renovacao?: string | null
          nome: string
          observacoes?: string | null
          razao_social?: string | null
          resp_contador?: string | null
          resp_rh?: string | null
          rh_email?: string | null
          rh_telefone?: string | null
          status?: string
          telefone?: string | null
          tem_contrato?: boolean
          updated_at?: string
          venc_art?: string | null
          vidas?: number | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          contabilidade?: string | null
          contador_email?: string | null
          contador_telefone?: string | null
          contato_responsavel?: string | null
          created_at?: string
          data_entrada?: string | null
          dia_faturamento?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          grau_risco?: number | null
          id?: string
          mes_renovacao?: string | null
          nome?: string
          observacoes?: string | null
          razao_social?: string | null
          resp_contador?: string | null
          resp_rh?: string | null
          rh_email?: string | null
          rh_telefone?: string | null
          status?: string
          telefone?: string | null
          tem_contrato?: boolean
          updated_at?: string
          venc_art?: string | null
          vidas?: number | null
        }
        Relationships: []
      }
      exames: {
        Row: {
          clinica: string | null
          created_at: string
          custo: number | null
          data: string | null
          empresa_id: string | null
          esocial: string | null
          fatura: number | null
          horario: string | null
          id: string
          kit: string | null
          lucro: number | null
          observacoes: string | null
          periodicidade_meses: number | null
          proxima_data: string | null
          registro: string | null
          status: string
          tipo: string
          tipo_exame_id: string | null
          trabalhador_id: string | null
          updated_at: string
          valor: number | null
          valor_clinica: number | null
          valor_laboratorio: number | null
        }
        Insert: {
          clinica?: string | null
          created_at?: string
          custo?: number | null
          data?: string | null
          empresa_id?: string | null
          esocial?: string | null
          fatura?: number | null
          horario?: string | null
          id?: string
          kit?: string | null
          lucro?: number | null
          observacoes?: string | null
          periodicidade_meses?: number | null
          proxima_data?: string | null
          registro?: string | null
          status?: string
          tipo?: string
          tipo_exame_id?: string | null
          trabalhador_id?: string | null
          updated_at?: string
          valor?: number | null
          valor_clinica?: number | null
          valor_laboratorio?: number | null
        }
        Update: {
          clinica?: string | null
          created_at?: string
          custo?: number | null
          data?: string | null
          empresa_id?: string | null
          esocial?: string | null
          fatura?: number | null
          horario?: string | null
          id?: string
          kit?: string | null
          lucro?: number | null
          observacoes?: string | null
          periodicidade_meses?: number | null
          proxima_data?: string | null
          registro?: string | null
          status?: string
          tipo?: string
          tipo_exame_id?: string | null
          trabalhador_id?: string | null
          updated_at?: string
          valor?: number | null
          valor_clinica?: number | null
          valor_laboratorio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exames_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exames_tipo_exame_id_fkey"
            columns: ["tipo_exame_id"]
            isOneToOne: false
            referencedRelation: "tipos_exame"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exames_trabalhador_id_fkey"
            columns: ["trabalhador_id"]
            isOneToOne: false
            referencedRelation: "trabalhadores"
            referencedColumns: ["id"]
          },
        ]
      }
      laudos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          data_emissao: string | null
          data_vencimento: string | null
          empresa_id: string | null
          id: string
          observacoes: string | null
          tipo: Database["public"]["Enums"]["laudo_tipo"]
          titulo: string
          trabalhador_id: string | null
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          tipo: Database["public"]["Enums"]["laudo_tipo"]
          titulo: string
          trabalhador_id?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          tipo?: Database["public"]["Enums"]["laudo_tipo"]
          titulo?: string
          trabalhador_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudos_trabalhador_id_fkey"
            columns: ["trabalhador_id"]
            isOneToOne: false
            referencedRelation: "trabalhadores"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_acao: {
        Row: {
          created_at: string
          data_abertura: string
          data_conclusao: string | null
          data_prevista: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          observacoes: string | null
          responsavel_id: string | null
          status: string
          tipo_acao: string
          titulo: string
          trabalhador_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_abertura?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          tipo_acao?: string
          titulo: string
          trabalhador_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_abertura?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          tipo_acao?: string
          titulo?: string
          trabalhador_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_acao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_acao_trabalhador_id_fkey"
            columns: ["trabalhador_id"]
            isOneToOne: false
            referencedRelation: "trabalhadores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_exame: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          periodicidade_meses: number | null
          updated_at: string
          valor_padrao: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          periodicidade_meses?: number | null
          updated_at?: string
          valor_padrao?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          periodicidade_meses?: number | null
          updated_at?: string
          valor_padrao?: number
        }
        Relationships: []
      }
      trabalhadores: {
        Row: {
          ativo: boolean
          cbo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          funcao: string | null
          id: string
          nome: string
          proximo_exame_data: string | null
          registro: string
          rg: string | null
          setor: string | null
          status_exame: string
          telefone: string | null
          ultimo_exame_data: string | null
          ultimo_exame_tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cbo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          funcao?: string | null
          id?: string
          nome: string
          proximo_exame_data?: string | null
          registro?: string
          rg?: string | null
          setor?: string | null
          status_exame?: string
          telefone?: string | null
          ultimo_exame_data?: string | null
          ultimo_exame_tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cbo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          proximo_exame_data?: string | null
          registro?: string
          rg?: string | null
          setor?: string | null
          status_exame?: string
          telefone?: string | null
          ultimo_exame_data?: string | null
          ultimo_exame_tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabalhadores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_dev: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      acao_tipo: "treinamento" | "exame" | "aso" | "outro"
      app_role: "admin" | "dev" | "user"
      contato_tipo: "cliente" | "nao_cliente"
      laudo_tipo: "PCMSO" | "PGR" | "LTCAT" | "PPP" | "AVCB" | "outro"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      acao_tipo: ["treinamento", "exame", "aso", "outro"],
      app_role: ["admin", "dev", "user"],
      contato_tipo: ["cliente", "nao_cliente"],
      laudo_tipo: ["PCMSO", "PGR", "LTCAT", "PPP", "AVCB", "outro"],
    },
  },
} as const
