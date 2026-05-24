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
      contests: {
        Row: {
          created_at: string
          creator: string | null
          id: number
          running: boolean
          title: string
        }
        Insert: {
          created_at?: string
          creator?: string | null
          id?: number
          running: boolean
          title: string
        }
        Update: {
          created_at?: string
          creator?: string | null
          id?: number
          running?: boolean
          title?: string
        }
        Relationships: []
      }
      levels: {
        Row: {
          created_at: string
          data_json: Json
          full_identifier: string
          id: number
          level_id: string
          user_generated: boolean
        }
        Insert: {
          created_at?: string
          data_json: Json
          full_identifier: string
          id?: number
          level_id: string
          user_generated: boolean
        }
        Update: {
          created_at?: string
          data_json?: Json
          full_identifier?: string
          id?: number
          level_id?: string
          user_generated?: boolean
        }
        Relationships: []
      }
      participants: {
        Row: {
          contest: number | null
          created_at: string
          id: number
          name: string | null
          player_id: string | null
        }
        Insert: {
          contest?: number | null
          created_at?: string
          id?: number
          name?: string | null
          player_id?: string | null
        }
        Update: {
          contest?: number | null
          created_at?: string
          id?: number
          name?: string | null
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_contest_fkey"
            columns: ["contest"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
          line_item_id: string
          product: string | null
          quantity: number | null
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: number
          line_item_id: string
          product?: string | null
          quantity?: number | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: number
          line_item_id?: string
          product?: string | null
          quantity?: number | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      solutions: {
        Row: {
          contest: number | null
          created_at: string
          id: number
          level_id: string
          num_moves: number
          player_id: string
          solution: Json
        }
        Insert: {
          contest?: number | null
          created_at?: string
          id?: number
          level_id: string
          num_moves: number
          player_id: string
          solution: Json
        }
        Update: {
          contest?: number | null
          created_at?: string
          id?: number
          level_id?: string
          num_moves?: number
          player_id?: string
          solution?: Json
        }
        Relationships: [
          {
            foreignKeyName: "solutions_contest_fkey"
            columns: ["contest"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["level_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decode_contest_hashid: { Args: { p_id: string }; Returns: number }
      encode_contest_hashid: { Args: { p_hashid: number }; Returns: string }
      get_contest_leaderboard:
        | {
            Args: { p_contest_hashid: string }
            Returns: {
              last_improvement_at: string
              levels_solved: number
              name: string
              player_id: string
              total_moves: number
            }[]
          }
        | {
            Args: { p_contest_id: number }
            Returns: {
              last_improvement_at: string
              levels_solved: number
              name: string
              player_id: string
              total_moves: number
            }[]
          }
      get_level_histograms: { Args: { p_level_id: string }; Returns: Json }
      get_level_histograms_and_summary: {
        Args: { p_level_id: string; p_player_id: string }
        Returns: Json
      }
      get_level_rankings: {
        Args: { p_level_id: string }
        Returns: {
          first_solved_at: string
          num_moves: number
          player_id: string
          rank: number
        }[]
      }
      get_player_level_histograms_and_summary: {
        Args: { p_level_id: string; p_player_id: string }
        Returns: Json
      }
      get_player_level_summary: {
        Args: { p_level_id: string; p_player_id: string }
        Returns: Json
      }
      get_purchased_products: {
        Args: { p_email?: string; p_user_id: string }
        Returns: {
          product: string
        }[]
      }
      get_user_level_summary: {
        Args: { p_level_id: string; p_player_id: string }
        Returns: Json
      }
      id_decode: { Args: { "": string }; Returns: number[] }
      id_decode_once: { Args: { "": string }; Returns: number }
      insert_solution_and_get_histogram:
        | {
            Args: {
              p_level_id: string
              p_num_moves: number
              p_player_id: string
              p_solution: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_contest_hashid?: string
              p_level_id: string
              p_num_moves: number
              p_player_id: string
              p_solution: Json
            }
            Returns: Json
          }
      insert_solution_and_get_histogram_2: {
        Args: {
          p_level_id: string
          p_num_moves: number
          p_player_id: string
          p_solution: Json
        }
        Returns: Json
      }
      submit_participant_name: {
        Args: { p_contest_hashid: string; p_name: string; p_player_id: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
