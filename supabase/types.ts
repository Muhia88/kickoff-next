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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          admin_id: number
          id: number
          timestamp: string | null
        }
        Insert: {
          action: string
          admin_id: number
          id?: number
          timestamp?: string | null
        }
        Update: {
          action?: string
          admin_id?: number
          id?: number
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          can_manage_events: boolean | null
          can_manage_products: boolean | null
          created_at: string | null
          email: string
          id: number
          password_hash: string
          role: string
          username: string
        }
        Insert: {
          can_manage_events?: boolean | null
          can_manage_products?: boolean | null
          created_at?: string | null
          email: string
          id?: number
          password_hash: string
          role: string
          username: string
        }
        Update: {
          can_manage_events?: boolean | null
          can_manage_products?: boolean | null
          created_at?: string | null
          email?: string
          id?: number
          password_hash?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      edge_webhook_events: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload: Json
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
      events: {
        Row: {
          date: string
          description: string | null
          id: number
          image_url: string | null
          location: string
          name: string
          number_of_tickets: number
          ticket_price: number
        }
        Insert: {
          date: string
          description?: string | null
          id?: number
          image_url?: string | null
          location: string
          name: string
          number_of_tickets: number
          ticket_price: number
        }
        Update: {
          date?: string
          description?: string | null
          id?: number
          image_url?: string | null
          location?: string
          name?: string
          number_of_tickets?: number
          ticket_price?: number
        }
        Relationships: []
      }
      featured_items: {
        Row: {
          created_at: string | null
          id: number
          position: number | null
          product_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          position?: number | null
          product_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          position?: number | null
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "featured_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      merchandise: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          image_url: string | null
          name: string
          price: number
          stock: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          name: string
          price: number
          stock?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          name?: string
          price?: number
          stock?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: number
          merchandise_id: number | null
          order_id: number
          product_id: number | null
          quantity: number
        }
        Insert: {
          id?: number
          merchandise_id?: number | null
          order_id: number
          product_id?: number | null
          quantity: number
        }
        Update: {
          id?: number
          merchandise_id?: number | null
          order_id?: number
          product_id?: number | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          delivered: boolean | null
          id: number
          metadata: Json | null
          order_type: string | null
          order_uuid: string
          product_id: number | null
          qr_image_url: string | null
          quantity: number | null
          source: string
          status: string
          total_price: number | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          delivered?: boolean | null
          id?: number
          metadata?: Json | null
          order_type?: string | null
          order_uuid?: string
          product_id?: number | null
          qr_image_url?: string | null
          quantity?: number | null
          source?: string
          status: string
          total_price?: number | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          delivered?: boolean | null
          id?: number
          metadata?: Json | null
          order_type?: string | null
          order_uuid?: string
          product_id?: number | null
          qr_image_url?: string | null
          quantity?: number | null
          source?: string
          status?: string
          total_price?: number | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: number
          idempotency_key: string | null
          order_id: number | null
          phone_number: string | null
          provider: string
          provider_transaction_id: string | null
          raw_payload: Json | null
          request_id: string | null
          status: string
          subscription_id: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: number
          idempotency_key?: string | null
          order_id?: number | null
          phone_number?: string | null
          provider: string
          provider_transaction_id?: string | null
          raw_payload?: Json | null
          request_id?: string | null
          status?: string
          subscription_id?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: number
          idempotency_key?: string | null
          order_id?: number | null
          phone_number?: string | null
          provider?: string
          provider_transaction_id?: string | null
          raw_payload?: Json | null
          request_id?: string | null
          status?: string
          subscription_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_classes: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      product_names: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand_id: number | null
          category_id: number
          created_at: string | null
          description: string | null
          id: number
          image_url: string | null
          name_id: number | null
          price: number
          product_class: string | null
          product_class_id: number | null
          search_vector: unknown
          stock: number
        }
        Insert: {
          brand_id?: number | null
          category_id: number
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          name_id?: number | null
          price: number
          product_class?: string | null
          product_class_id?: number | null
          search_vector?: unknown
          stock: number
        }
        Update: {
          brand_id?: number | null
          category_id?: number
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          name_id?: number | null
          price?: number
          product_class?: string | null
          product_class_id?: number | null
          search_vector?: unknown
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_brand_id_brands"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_name_id_product_names"
            columns: ["name_id"]
            isOneToOne: false
            referencedRelation: "product_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_product_class_id_product_classes"
            columns: ["product_class_id"]
            isOneToOne: false
            referencedRelation: "product_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: number
          product_id: number
          rating: number
          updated_at: string | null
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: number
          product_id: number
          rating: number
          updated_at?: string | null
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: number
          product_id?: number
          rating?: number
          updated_at?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          end_date: string | null
          id: number
          interval_days: number
          last_payment_id: number | null
          metadata: Json | null
          plan: string
          price: number
          start_date: string | null
          status: string
          supabase_id: string | null
          updated_at: string
          user_id: number | null
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          end_date?: string | null
          id?: number
          interval_days?: number
          last_payment_id?: number | null
          metadata?: Json | null
          plan: string
          price: number
          start_date?: string | null
          status?: string
          supabase_id?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          end_date?: string | null
          id?: number
          interval_days?: number
          last_payment_id?: number | null
          metadata?: Json | null
          plan?: string
          price?: number
          start_date?: string | null
          status?: string
          supabase_id?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_last_payment_id_fkey"
            columns: ["last_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          event_id: number
          id: number
          is_used: boolean | null
          price: number
          purchased_at: string | null
          qr_code_url: string | null
          qr_object_path: string | null
          ticket_uid: string | null
          user_id: number | null
        }
        Insert: {
          event_id: number
          id?: number
          is_used?: boolean | null
          price: number
          purchased_at?: string | null
          qr_code_url?: string | null
          qr_object_path?: string | null
          ticket_uid?: string | null
          user_id?: number | null
        }
        Update: {
          event_id?: number
          id?: number
          is_used?: boolean | null
          price?: number
          purchased_at?: string | null
          qr_code_url?: string | null
          qr_object_path?: string | null
          ticket_uid?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: number
          is_email_confirmed: boolean | null
          is_phone_confirmed: boolean | null
          metadata: Json | null
          phone: string | null
          role: string
          status: string | null
          supabase_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: number
          is_email_confirmed?: boolean | null
          is_phone_confirmed?: boolean | null
          metadata?: Json | null
          phone?: string | null
          role?: string
          status?: string | null
          supabase_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: number
          is_email_confirmed?: boolean | null
          is_phone_confirmed?: boolean | null
          metadata?: Json | null
          phone?: string | null
          role?: string
          status?: string | null
          supabase_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
