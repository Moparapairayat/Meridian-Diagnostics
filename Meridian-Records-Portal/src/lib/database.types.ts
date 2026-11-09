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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          require_manager_mfa: boolean
        }
        Insert: {
          id?: number
          require_manager_mfa?: boolean
        }
        Update: {
          id?: number
          require_manager_mfa?: boolean
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          at: string
          branch_id: string | null
          details: Json
          id: number
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          at?: string
          branch_id?: string | null
          details?: Json
          id?: never
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          at?: string
          branch_id?: string | null
          details?: Json
          id?: never
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_bdt: number
          created_at: string
          id: string
          order_id: string
          paid: boolean
        }
        Insert: {
          amount_bdt: number
          created_at?: string
          id?: string
          order_id: string
          paid?: boolean
        }
        Update: {
          amount_bdt?: number
          created_at?: string
          id?: string
          order_id?: string
          paid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          body_bn: string
          body_en: string
          category: string
          id: string
          owner_id: string
          published: boolean
          review_date: string
          slug: string
          title_bn: string
          title_en: string
          updated_at: string
          version: number
        }
        Insert: {
          body_bn: string
          body_en: string
          category: string
          id?: string
          owner_id: string
          published?: boolean
          review_date: string
          slug: string
          title_bn: string
          title_en: string
          updated_at?: string
          version?: number
        }
        Update: {
          body_bn?: string
          body_en?: string
          category?: string
          id?: string
          owner_id?: string
          published?: boolean
          review_date?: string
          slug?: string
          title_bn?: string
          title_en?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          patient_id: string | null
          provider_message_id: string | null
          recipient_masked: string
          ref_id: string | null
          staff_user_id: string | null
          status: string
          type: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          patient_id?: string | null
          provider_message_id?: string | null
          recipient_masked: string
          ref_id?: string | null
          staff_user_id?: string | null
          status: string
          type: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          patient_id?: string | null
          provider_message_id?: string | null
          recipient_masked?: string
          ref_id?: string | null
          staff_user_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          sample_barcode: string
          test_code: string
        }
        Insert: {
          id?: string
          order_id: string
          sample_barcode: string
          test_code: string
        }
        Update: {
          id?: string
          order_id?: string
          sample_barcode?: string
          test_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_test_code_fkey"
            columns: ["test_code"]
            isOneToOne: false
            referencedRelation: "test_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string
          collected_at: string | null
          created_at: string
          created_by: string | null
          downloaded_at: string | null
          id: string
          in_lab_at: string | null
          order_no: string
          patient_id: string
          released_at: string | null
          resulted_at: string | null
          retest_count: number
          retest_reason: string | null
          status: string
        }
        Insert: {
          branch_id: string
          collected_at?: string | null
          created_at?: string
          created_by?: string | null
          downloaded_at?: string | null
          id?: string
          in_lab_at?: string | null
          order_no?: string
          patient_id: string
          released_at?: string | null
          resulted_at?: string | null
          retest_count?: number
          retest_reason?: string | null
          status?: string
        }
        Update: {
          branch_id?: string
          collected_at?: string | null
          created_at?: string
          created_by?: string | null
          downloaded_at?: string | null
          id?: string
          in_lab_at?: string | null
          order_no?: string
          patient_id?: string
          released_at?: string | null
          resulted_at?: string | null
          retest_count?: number
          retest_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          age_years: number
          consent_given_at: string
          consent_version: string
          created_at: string
          created_by: string | null
          email: string | null
          email_opt_in: boolean
          full_name: string
          id: string
          language: string
          patient_code: string
          phone: string
          preferred_channel: string
          registered_branch_id: string
          sex: string
        }
        Insert: {
          age_years: number
          consent_given_at?: string
          consent_version: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_opt_in?: boolean
          full_name: string
          id?: string
          language?: string
          patient_code?: string
          phone: string
          preferred_channel?: string
          registered_branch_id: string
          sex: string
        }
        Update: {
          age_years?: number
          consent_given_at?: string
          consent_version?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_opt_in?: boolean
          full_name?: string
          id?: string
          language?: string
          patient_code?: string
          phone?: string
          preferred_channel?: string
          registered_branch_id?: string
          sex?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_registered_branch_id_fkey"
            columns: ["registered_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_locks: {
        Row: {
          locked_until: string
          patient_id: string
        }
        Insert: {
          locked_until: string
          patient_id: string
        }
        Update: {
          locked_until?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_locks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_otps: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          ip_hash: string | null
          patient_id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          channel: string
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          ip_hash?: string | null
          patient_id: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          patient_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_otps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          amend_reason: string | null
          id: string
          order_id: string
          pdf_path: string | null
          signed_at: string
          signed_by: string | null
          status: string
          verify_code: string
          version: number
        }
        Insert: {
          amend_reason?: string | null
          id?: string
          order_id: string
          pdf_path?: string | null
          signed_at?: string
          signed_by?: string | null
          status?: string
          verify_code: string
          version: number
        }
        Update: {
          amend_reason?: string | null
          id?: string
          order_id?: string
          pdf_path?: string | null
          signed_at?: string
          signed_by?: string | null
          status?: string
          verify_code?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          analyte: string
          correction_reason: string | null
          entered_at: string
          entered_by: string | null
          flag: string
          id: string
          order_item_id: string
          ref_high: number
          ref_low: number
          source: string
          unit: string
          value: number
        }
        Insert: {
          analyte: string
          correction_reason?: string | null
          entered_at?: string
          entered_by?: string | null
          flag?: string
          id?: string
          order_item_id: string
          ref_high: number
          ref_low: number
          source?: string
          unit?: string
          value: number
        }
        Update: {
          analyte?: string
          correction_reason?: string | null
          entered_at?: string
          entered_by?: string | null
          flag?: string
          id?: string
          order_item_id?: string
          ref_high?: number
          ref_low?: number
          source?: string
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "results_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          active: boolean
          branch_id: string
          full_name: string
          notify_email: string | null
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          full_name: string
          notify_email?: string | null
          role: string
          user_id: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          full_name?: string
          notify_email?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      test_analytes: {
        Row: {
          analyte: string
          decimals: number
          id: string
          ref_high: number
          ref_low: number
          test_code: string
          unit: string
        }
        Insert: {
          analyte: string
          decimals?: number
          id?: string
          ref_high: number
          ref_low: number
          test_code: string
          unit?: string
        }
        Update: {
          analyte?: string
          decimals?: number
          id?: string
          ref_high?: number
          ref_low?: number
          test_code?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_analytes_test_code_fkey"
            columns: ["test_code"]
            isOneToOne: false
            referencedRelation: "test_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      test_catalog: {
        Row: {
          active: boolean
          code: string
          name: string
          prep_bn: string
          prep_en: string
          price_bdt: number
          specimen: string
        }
        Insert: {
          active?: boolean
          code: string
          name: string
          prep_bn?: string
          prep_en?: string
          price_bdt: number
          specimen: string
        }
        Update: {
          active?: boolean
          code?: string
          name?: string
          prep_bn?: string
          prep_en?: string
          price_bdt?: number
          specimen?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      amend_report: {
        Args: {
          p_order_id: string
          p_pdf_path: string
          p_reason: string
          p_verify_code: string
        }
        Returns: string
      }
      create_order: {
        Args: { p_patient_id: string; p_test_codes: string[] }
        Returns: string
      }
      log_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_record: string
          p_table: string
        }
        Returns: undefined
      }
      release_order: {
        Args: { p_order_id: string; p_pdf_path: string; p_verify_code: string }
        Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
