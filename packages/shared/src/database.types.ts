
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "app_settings": {
                  Row: {
                    "contact_email": string | null,"id": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_email"?: string | null,"id"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "contact_email"?: string | null,"id"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"at": string,"detail": string | null,"id": number,"target_id": string | null,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"at"?: string,"detail"?: string | null,"id"?: never,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"at"?: string,"detail"?: string | null,"id"?: never,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "granted": boolean,"granted_at": string,"kind": Database["public"]['Enums']["consent_kind"],"member_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted": boolean,"granted_at"?: string,"kind": Database["public"]['Enums']["consent_kind"],"member_id": string,"version": string
                  }
                  Update: {
                    "granted"?: boolean,"granted_at"?: string,"kind"?: Database["public"]['Enums']["consent_kind"],"member_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "body": string | null,"created_at": string,"created_by": string | null,"id": string,"published_at": string | null,"sort": number,"status": Database["public"]['Enums']["item_status"],"summary": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"published_at"?: string | null,"sort"?: number,"status"?: Database["public"]['Enums']["item_status"],"summary"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"published_at"?: string | null,"sort"?: number,"status"?: Database["public"]['Enums']["item_status"],"summary"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"member_roles": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"member_id": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"member_id": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"member_id"?: string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_roles_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "auth_user_id": string,"created_at": string,"email": string | null,"first_name": string | null,"id": string,"last_name": string | null,"onboarding_completed_at": string | null,"status": Database["public"]['Enums']["member_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id": string,"created_at"?: string,"email"?: string | null,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"onboarding_completed_at"?: string | null,"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string
                  }
                  Update: {
                    "auth_user_id"?: string,"created_at"?: string,"email"?: string | null,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"onboarding_completed_at"?: string | null,"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"terms_versions": {
                  Row: {
                    "accept_label": string,"body": string,"changes": (string)[],"is_current": boolean,"published_at": string,"title": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accept_label": string,"body": string,"changes"?: (string)[],"is_current"?: boolean,"published_at"?: string,"title": string,"version": string
                  }
                  Update: {
                    "accept_label"?: string,"body"?: string,"changes"?: (string)[],"is_current"?: boolean,"published_at"?: string,"title"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_terms":
{ Args: { "version": string }; Returns: Json
                           },
"complete_onboarding":
{ Args: { "adult": boolean,"first_name": string,"last_name": string,"marketing"?: boolean,"terms_version": string }; Returns: Json
                           },
"create_item":
{ Args: { "body"?: string,"publish"?: boolean,"sort"?: number,"summary"?: string,"title": string }; Returns: {
              "body": string | null,
"created_at": string,
"created_by": string | null,
"id": string,
"published_at": string | null,
"sort": number,
"status": Database["public"]['Enums']["item_status"],
"summary": string | null,
"title": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "items"
        isOneToOne: true
        isSetofReturn: false
      } },
"current_member_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"custom_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"grant_role":
{ Args: { "member_id": string,"role": Database["public"]['Enums']["app_role"] }; Returns: undefined
                           },
"has_role":
{ Args: { "check_role": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"launch_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"my_roles":
{ Args: Record<PropertyKey, never>; Returns: (Database["public"]['Enums']["app_role"])[]
                           },
"publish_terms_version":
{ Args: { "accept_label": string,"body": string,"changes"?: (string)[],"title": string,"version": string }; Returns: {
              "accept_label": string,
"body": string,
"changes": (string)[],
"is_current": boolean,
"published_at": string,
"title": string,
"version": string
            }
                          SetofOptions: {
        from: "*"
        to: "terms_versions"
        isOneToOne: true
        isSetofReturn: false
      } },
"revoke_role":
{ Args: { "member_id": string,"role": Database["public"]['Enums']["app_role"] }; Returns: undefined
                           },
"set_member_status":
{ Args: { "member_id": string,"reason"?: string,"status": Database["public"]['Enums']["member_status"] }; Returns: undefined
                           },
"update_app_settings":
{ Args: { "patch": Json }; Returns: {
              "contact_email": string | null,
"id": boolean,
"updated_at": string,
"updated_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "app_settings"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_item":
{ Args: { "item_id": string,"patch": Json }; Returns: {
              "body": string | null,
"created_at": string,
"created_by": string | null,
"id": string,
"published_at": string | null,
"sort": number,
"status": Database["public"]['Enums']["item_status"],
"summary": string | null,
"title": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "items"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "app_role": "member"|"staff"|"admin","consent_kind": "terms"|"adult"|"marketing","item_status": "draft"|"published"|"archived","member_status": "active"|"suspended"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["member", "staff", "admin"],"consent_kind": ["terms", "adult", "marketing"],"item_status": ["draft", "published", "archived"],"member_status": ["active", "suspended"]
          }
        }
} as const
