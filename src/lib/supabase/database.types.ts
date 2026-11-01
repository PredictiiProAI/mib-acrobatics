// Hand-written to match supabase/migrations. Update when the schema changes.
export type AppRole = "superadmin" | "admin" | "media" | "user";
export type MediaType = "video" | "image";
export type ReactionKey = "like" | "love" | "fire" | "clap" | "acro";
export type AccountType = "Sportiv" | "Părinte" | "Antrenor";
export type TrainingLevel = "beginner" | "intermediate" | "advanced";
export type ScheduleLevel = "all" | "beginner" | "intermediate" | "advanced";
export type BadgeColor = "violet" | "fuchsia" | "sky" | "emerald" | "amber" | "rose";
type ScheduleInsert = {
  group_name: string;
  age_range?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  level?: ScheduleLevel;
  badge_color?: BadgeColor;
  notes?: string | null;
  sort_order?: number;
};

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: AppRole;
          full_name: string | null;
          created_at: string;
          display_name: string | null;
          discipline: string | null;
          level: TrainingLevel | null;
          avatar_url: string | null;
          account_type?: AccountType;
        };
        Insert: never;
        Update: {
          full_name?: string | null;
          display_name?: string | null;
          discipline?: string | null;
          level?: TrainingLevel | null;
          avatar_url?: string | null;
          account_type?: AccountType;
          children_names?: string | null;
          emergency_contact?: string | null;
          birthdate?: string | null;
          social_link?: string | null;
        };
        Relationships: [];
      };
      user_settings: {
        Row: { user_id: string; phone: string | null; notify_feed: boolean; notify_schedule: boolean; updated_at: string };
        Insert: { user_id: string; phone?: string | null; notify_feed?: boolean; notify_schedule?: boolean; updated_at?: string };
        Update: { phone?: string | null; notify_feed?: boolean; notify_schedule?: boolean; updated_at?: string };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          media_url: string;
          media_type: MediaType;
          caption: string | null;
          created_at: string;
          storage_path: string | null;
          is_public: boolean;
        };
        Insert: {
          author_id: string;
          media_url: string;
          media_type: MediaType;
          caption?: string | null;
          storage_path?: string | null;
          is_public?: boolean;
        };
        Update: { caption?: string | null; is_public?: boolean };
        Relationships: [
          { foreignKeyName: "posts_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      likes: {
        Row: { id: string; post_id: string; user_id: string; created_at: string; reaction: ReactionKey };
        Insert: { post_id: string; user_id: string; reaction?: ReactionKey };
        Update: { reaction?: ReactionKey };
        Relationships: [
          { foreignKeyName: "likes_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
          { foreignKeyName: "likes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      comments: {
        Row: { id: string; post_id: string; user_id: string; content: string; created_at: string };
        Insert: { post_id: string; user_id: string; content: string };
        Update: never;
        Relationships: [
          { foreignKeyName: "comments_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
          { foreignKeyName: "comments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      comment_reactions: {
        Row: { id: string; comment_id: string; user_id: string; reaction: ReactionKey; created_at: string };
        Insert: { comment_id: string; user_id: string; reaction: ReactionKey };
        Update: { reaction?: ReactionKey };
        Relationships: [
          { foreignKeyName: "comment_reactions_comment_id_fkey"; columns: ["comment_id"]; isOneToOne: false; referencedRelation: "comments"; referencedColumns: ["id"] },
          { foreignKeyName: "comment_reactions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      schedule: {
        Row: {
          id: string;
          group_name: string;
          age_range: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          level: ScheduleLevel;
          badge_color: BadgeColor;
          notes: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: ScheduleInsert;
        Update: Partial<ScheduleInsert>;
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: boolean;
          acrofeed_hero_text: string;
          updated_at: string;
          updated_by: string | null;
          announcement_enabled?: boolean;
          announcement_text?: string | null;
          announcement_tone?: string;
          quick_links?: { title: string; url: string }[];
        };
        Insert: never;
        Update: {
          acrofeed_hero_text?: string;
          updated_at?: string;
          updated_by?: string | null;
          announcement_enabled?: boolean;
          announcement_text?: string | null;
          announcement_tone?: string;
          quick_links?: { title: string; url: string }[];
        };
        Relationships: [];
      };
      team_members: {
        Row: { id: string; name: string; role: string; image_url: string | null; sort_order: number; created_at: string };
        Insert: { name: string; role?: string; image_url?: string | null; sort_order?: number };
        Update: { name?: string; role?: string; image_url?: string | null; sort_order?: number };
        Relationships: [];
      };
      gallery_images: {
        Row: { id: string; image_url: string; sort_order: number; created_at: string };
        Insert: { image_url: string; sort_order?: number };
        Update: { image_url?: string; sort_order?: number };
        Relationships: [];
      };
      waiver_submissions: {
        Row: {
          id: string;
          user_id: string;
          form_type: "parinte" | "sportiv";
          signer_name: string;
          child_name: string | null;
          child_birthdate: string | null;
          emergency_phone: string;
          emergency_secondary: string | null;
          allergies: string;
          chronic_conditions: string;
          previous_injuries: string;
          other_medical: string;
          acknowledgements: string[];
          signed_at: string;
          replaces: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      direct_messages: {
        Row: { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; read_at: string | null };
        Insert: { sender_id: string; receiver_id: string; content: string };
        Update: { read_at?: string | null };
        Relationships: [
          { foreignKeyName: "direct_messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
          { foreignKeyName: "direct_messages_receiver_id_fkey"; columns: ["receiver_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: {
      feed_posts: {
        Row: {
          id: string;
          author_id: string;
          media_url: string;
          media_type: MediaType;
          caption: string | null;
          created_at: string;
          is_public: boolean;
          author_name: string | null;
          author_role: AppRole;
          like_count: number;
          comment_count: number;
          liked_by_me: boolean;
          reactions: Partial<Record<ReactionKey, number>>;
          my_reaction: ReactionKey | null;
          author_avatar: string | null;
        };
        Relationships: Rel[];
      };
    };
    Functions: {
      current_app_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      can_publish: { Args: Record<string, never>; Returns: boolean };
      profile_details: {
        Args: { p_user: string };
        Returns: {
          account_type: AccountType;
          children_names: string | null;
          emergency_contact: string | null;
          birthdate: string | null;
          social_link: string | null;
          waiver_signed?: boolean;
          waiver_signed_at?: string | null;
          waiver_signed_by_name?: string | null;
          rules_accepted_at?: string | null;
        }[];
      };
      submit_waiver: { Args: { p: Record<string, unknown> }; Returns: { id: string; signed_at: string } };
      accept_rules: { Args: Record<string, never>; Returns: string };
      admin_set_account_type: { Args: { target: string; new_type: "Sportiv" | "Părinte" }; Returns: undefined };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string;
          role: AppRole;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          discipline: string | null;
          level: TrainingLevel | null;
          phone: string | null;
          created_at: string;
          last_sign_in_at: string | null;
          account_type?: AccountType;
          children_names?: string | null;
          emergency_contact?: string | null;
          birthdate?: string | null;
          waiver_signed?: boolean;
          waiver_signed_at?: string | null;
          waiver_signed_by_name?: string | null;
          rules_accepted_at?: string | null;
        }[];
      };
      admin_set_role: { Args: { target: string; new_role: AppRole }; Returns: undefined };
      email_registered: { Args: { p_email: string }; Returns: boolean };
    };
    Enums: { app_role: AppRole; media_type: MediaType };
    CompositeTypes: { [_ in never]: never };
  };
};
