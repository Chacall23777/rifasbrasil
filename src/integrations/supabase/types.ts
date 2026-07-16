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
      profiles: {
        Row: {
          chave_pix: string | null
          cidade: string | null
          created_at: string
          email: string | null
          estado: string | null
          foto_url: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          chave_pix?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          foto_url?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          chave_pix?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      rifa_numeros: {
        Row: {
          aprovado_em: string | null
          comprador_email: string | null
          comprador_id: string | null
          comprador_nome: string | null
          comprador_telefone: string | null
          comprovante_url: string | null
          id: string
          numero: number
          reservado_em: string
          rifa_id: string
          status: string
        }
        Insert: {
          aprovado_em?: string | null
          comprador_email?: string | null
          comprador_id?: string | null
          comprador_nome?: string | null
          comprador_telefone?: string | null
          comprovante_url?: string | null
          id?: string
          numero: number
          reservado_em?: string
          rifa_id: string
          status?: string
        }
        Update: {
          aprovado_em?: string | null
          comprador_email?: string | null
          comprador_id?: string | null
          comprador_nome?: string | null
          comprador_telefone?: string | null
          comprovante_url?: string | null
          id?: string
          numero?: number
          reservado_em?: string
          rifa_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rifa_numeros_rifa_id_fkey"
            columns: ["rifa_id"]
            isOneToOne: false
            referencedRelation: "rifas"
            referencedColumns: ["id"]
          },
        ]
      }
      rifa_visitas: {
        Row: {
          created_at: string
          id: number
          rifa_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          rifa_id: string
        }
        Update: {
          created_at?: string
          id?: number
          rifa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rifa_visitas_rifa_id_fkey"
            columns: ["rifa_id"]
            isOneToOne: false
            referencedRelation: "rifas"
            referencedColumns: ["id"]
          },
        ]
      }
      rifas: {
        Row: {
          chave_pix: string
          created_at: string
          data_encerramento: string | null
          data_sorteio: string | null
          descricao: string | null
          foto_principal: string | null
          galeria: Json
          id: string
          nome_ganhador: string | null
          numero_vencedor: number | null
          organizador_id: string
          quantidade_numeros: number
          regulamento: string | null
          slug: string
          status: string
          titulo: string
          updated_at: string
          valor_numero: number
          visitas: number
        }
        Insert: {
          chave_pix: string
          created_at?: string
          data_encerramento?: string | null
          data_sorteio?: string | null
          descricao?: string | null
          foto_principal?: string | null
          galeria?: Json
          id?: string
          nome_ganhador?: string | null
          numero_vencedor?: number | null
          organizador_id: string
          quantidade_numeros: number
          regulamento?: string | null
          slug: string
          status?: string
          titulo: string
          updated_at?: string
          valor_numero: number
          visitas?: number
        }
        Update: {
          chave_pix?: string
          created_at?: string
          data_encerramento?: string | null
          data_sorteio?: string | null
          descricao?: string | null
          foto_principal?: string | null
          galeria?: Json
          id?: string
          nome_ganhador?: string | null
          numero_vencedor?: number | null
          organizador_id?: string
          quantidade_numeros?: number
          regulamento?: string | null
          slug?: string
          status?: string
          titulo?: string
          updated_at?: string
          valor_numero?: number
          visitas?: number
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          cidade: string | null
          estado: string | null
          foto_url: string | null
          id: string | null
          nome: string | null
          username: string | null
        }
        Insert: {
          cidade?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string | null
          nome?: string | null
          username?: string | null
        }
        Update: {
          cidade?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string | null
          nome?: string | null
          username?: string | null
        }
        Relationships: []
      }
      rifa_numeros_public: {
        Row: {
          aprovado_em: string | null
          id: string | null
          numero: number | null
          reservado_em: string | null
          rifa_id: string | null
          status: string | null
        }
        Insert: {
          aprovado_em?: string | null
          id?: string | null
          numero?: number | null
          reservado_em?: string | null
          rifa_id?: string | null
          status?: string | null
        }
        Update: {
          aprovado_em?: string | null
          id?: string | null
          numero?: number | null
          reservado_em?: string | null
          rifa_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rifa_numeros_rifa_id_fkey"
            columns: ["rifa_id"]
            isOneToOne: false
            referencedRelation: "rifas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_meus_numeros: {
        Args: never
        Returns: {
          aprovado_em: string | null
          comprador_email: string | null
          comprador_id: string | null
          comprador_nome: string | null
          comprador_telefone: string | null
          comprovante_url: string | null
          id: string
          numero: number
          reservado_em: string
          rifa_id: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "rifa_numeros"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_profile: {
        Args: never
        Returns: {
          chave_pix: string | null
          cidade: string | null
          created_at: string
          email: string | null
          estado: string | null
          foto_url: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_numeros_da_rifa: {
        Args: { _rifa_id: string }
        Returns: {
          aprovado_em: string | null
          comprador_email: string | null
          comprador_id: string | null
          comprador_nome: string | null
          comprador_telefone: string | null
          comprovante_url: string | null
          id: string
          numero: number
          reservado_em: string
          rifa_id: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "rifa_numeros"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
