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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_accounts: {
        Row: {
          category: string | null
          created_at: string | null
          encrypted_password: string | null
          id: string
          notes: string | null
          service_name: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          encrypted_password?: string | null
          id?: string
          notes?: string | null
          service_name: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          encrypted_password?: string | null
          id?: string
          notes?: string | null
          service_name?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          accent_color: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      board_cells: {
        Row: {
          column_id: string
          created_at: string | null
          id: string
          row_id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          column_id: string
          created_at?: string | null
          id?: string
          row_id: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          column_id?: string
          created_at?: string | null
          id?: string
          row_id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "board_cells_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_cells_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "board_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      board_columns: {
        Row: {
          created_at: string | null
          id: string
          is_visible: boolean | null
          name: string
          options: Json | null
          position: number
          type: Database["public"]["Enums"]["column_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          name: string
          options?: Json | null
          position?: number
          type?: Database["public"]["Enums"]["column_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          name?: string
          options?: Json | null
          position?: number
          type?: Database["public"]["Enums"]["column_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      board_groups: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          position: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      board_rows: {
        Row: {
          created_at: string | null
          created_by: string | null
          group_id: string
          id: string
          position: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          group_id: string
          id?: string
          position?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          group_id?: string
          id?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_rows_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "board_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      duties: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          position: number
          role: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          role?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          role?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duties_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "duty_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      duty_completions: {
        Row: {
          completed_at: string
          duty_id: string
          employee_id: string | null
          id: string
          notes: string | null
          rating: number | null
          reason: string | null
        }
        Insert: {
          completed_at?: string
          duty_id: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          reason?: string | null
        }
        Update: {
          completed_at?: string
          duty_id?: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duty_completions_duty_id_fkey"
            columns: ["duty_id"]
            isOneToOne: false
            referencedRelation: "duties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_completions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_completions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active_days: number | null
          avatar_color: string | null
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          off_day_rate: number | null
          orders_added: number | null
          orders_finished: number | null
          phone: string | null
          profile_id: string | null
          role: string | null
          shift_end: string | null
          shift_start: string | null
          shift_type: string | null
          updated_at: string | null
        }
        Insert: {
          active_days?: number | null
          avatar_color?: string | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          off_day_rate?: number | null
          orders_added?: number | null
          orders_finished?: number | null
          phone?: string | null
          profile_id?: string | null
          role?: string | null
          shift_end?: string | null
          shift_start?: string | null
          shift_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active_days?: number | null
          avatar_color?: string | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          off_day_rate?: number | null
          orders_added?: number | null
          orders_finished?: number | null
          phone?: string | null
          profile_id?: string | null
          role?: string | null
          shift_end?: string | null
          shift_start?: string | null
          shift_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          avg_days_to_refill: number | null
          category_id: string | null
          created_at: string | null
          current_stock: number | null
          id: string
          last_refill_date: string | null
          min_threshold: number | null
          name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          avg_days_to_refill?: number | null
          category_id?: string | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          last_refill_date?: string | null
          min_threshold?: number | null
          name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_days_to_refill?: number | null
          category_id?: string | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          last_refill_date?: string | null
          min_threshold?: number | null
          name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          consumption_date: string | null
          created_at: string | null
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reason: string | null
          total_price: number | null
          type: string
          unit_price: number | null
          vat_rate: number | null
        }
        Insert: {
          consumption_date?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          reason?: string | null
          total_price?: number | null
          type: string
          unit_price?: number | null
          vat_rate?: number | null
        }
        Update: {
          consumption_date?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reason?: string | null
          total_price?: number | null
          type?: string
          unit_price?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      overtime: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          employee_id: string
          hours: number
          id: string
          is_paid: boolean | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          employee_id: string
          hours: number
          id?: string
          is_paid?: boolean | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          employee_id?: string
          hours?: number
          id?: string
          is_paid?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "overtime_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_color: string | null
          can_edit_columns: boolean | null
          can_manage_users: boolean | null
          can_view_reports: boolean | null
          created_at: string | null
          email: string | null
          id: string
          passcode: string
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          api_key?: string | null
          avatar_color?: string | null
          can_edit_columns?: boolean | null
          can_manage_users?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          passcode: string
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          api_key?: string | null
          avatar_color?: string | null
          can_edit_columns?: boolean | null
          can_manage_users?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          passcode?: string
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      quality_criteria: {
        Row: {
          created_at: string
          id: string
          item_id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "quality_criteria_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "quality_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_items: {
        Row: {
          created_at: string
          cycle_days: number
          id: string
          name: string
          position: number
          section_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_days?: number
          id?: string
          name: string
          position?: number
          section_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_days?: number
          id?: string
          name?: string
          position?: number
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "quality_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_review_ratings: {
        Row: {
          created_at: string
          criteria_id: string
          id: string
          note: string | null
          rating: number
          review_id: string
        }
        Insert: {
          created_at?: string
          criteria_id: string
          id?: string
          note?: string | null
          rating?: number
          review_id: string
        }
        Update: {
          created_at?: string
          criteria_id?: string
          id?: string
          note?: string | null
          rating?: number
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_review_ratings_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "quality_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_review_ratings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "quality_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_reviews: {
        Row: {
          created_at: string
          id: string
          improvement_target: string | null
          item_id: string
          notes: string | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          improvement_target?: string | null
          item_id: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          improvement_target?: string | null
          item_id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "quality_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_reviews_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_reviews_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_sections: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          color: string | null
          created_at: string | null
          data: Json | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      shift_attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          is_on_time: boolean | null
          notes: string | null
          scheduled_end: string
          scheduled_start: string
          shift_type: string
          updated_at: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          is_on_time?: boolean | null
          notes?: string | null
          scheduled_end: string
          scheduled_start: string
          shift_type: string
          updated_at?: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          is_on_time?: boolean | null
          notes?: string | null
          scheduled_end?: string
          scheduled_start?: string
          shift_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      employees_public: {
        Row: {
          active_days: number | null
          avatar_color: string | null
          created_at: string | null
          id: string | null
          name: string | null
          orders_added: number | null
          orders_finished: number | null
          profile_id: string | null
          role: string | null
          shift_end: string | null
          shift_start: string | null
          shift_type: string | null
          updated_at: string | null
        }
        Insert: {
          active_days?: number | null
          avatar_color?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          orders_added?: number | null
          orders_finished?: number | null
          profile_id?: string | null
          role?: string | null
          shift_end?: string | null
          shift_start?: string | null
          shift_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active_days?: number | null
          avatar_color?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          orders_added?: number | null
          orders_finished?: number | null
          profile_id?: string | null
          role?: string | null
          shift_end?: string | null
          shift_start?: string | null
          shift_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_color: string | null
          can_edit_columns: boolean | null
          can_manage_users: boolean | null
          can_view_reports: boolean | null
          id: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_color?: string | null
          can_edit_columns?: boolean | null
          can_manage_users?: boolean | null
          can_view_reports?: boolean | null
          id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_color?: string | null
          can_edit_columns?: boolean | null
          can_manage_users?: boolean | null
          can_view_reports?: boolean | null
          id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      authenticate_with_passcode: {
        Args: { _passcode: string }
        Returns: {
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_system_initialized: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "viewer"
      column_type:
        | "text"
        | "number"
        | "select"
        | "multi_select"
        | "date"
        | "person"
        | "files"
        | "checkbox"
        | "items_qty"
        | "relation"
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
      app_role: ["admin", "user", "viewer"],
      column_type: [
        "text",
        "number",
        "select",
        "multi_select",
        "date",
        "person",
        "files",
        "checkbox",
        "items_qty",
        "relation",
      ],
    },
  },
} as const
