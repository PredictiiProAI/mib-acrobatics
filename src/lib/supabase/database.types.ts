// Hand-written to match supabase/migrations. Update when the schema changes.
export type AppRole = "superadmin" | "admin" | "media" | "user";
export type MediaType = "video" | "image";
export type ReactionKey = "like" | "love" | "fire" | "clap" | "acro";

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; role: AppRole; full_name: string | null; created_at: string };
        Insert: never;
        Update: { full_name?: string | null };
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
        };
        Relationships: Rel[];
      };
    };
    Functions: {
      current_app_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      can_publish: { Args: Record<string, never>; Returns: boolean };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: { id: string; email: string; role: AppRole; full_name: string | null; created_at: string }[];
      };
      admin_set_role: { Args: { target: string; new_role: AppRole }; Returns: undefined };
    };
    Enums: { app_role: AppRole; media_type: MediaType };
    CompositeTypes: { [_ in never]: never };
  };
};
