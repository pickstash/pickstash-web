export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nickname: string
          avatar_url: string | null
          handle: string | null
          bio: string | null
          tags: string[]
          created_at: string
        }
        Insert: {
          id: string
          nickname: string
          avatar_url?: string | null
          handle?: string | null
          bio?: string | null
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          avatar_url?: string | null
          handle?: string | null
          bio?: string | null
          tags?: string[]
          created_at?: string
        }
        Relationships: []
      }
      boxes: {
        Row: {
          id: string
          title: string
          memo: string | null
          deadline_at: string | null
          closed_at: string | null
          current_round: number
          decision_mode: string
          mode: string
          checkable: boolean
          invite_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          memo?: string | null
          deadline_at?: string | null
          closed_at?: string | null
          current_round?: number
          decision_mode?: string
          mode?: string
          checkable?: boolean
          invite_code?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          memo?: string | null
          deadline_at?: string | null
          closed_at?: string | null
          current_round?: number
          decision_mode?: string
          mode?: string
          checkable?: boolean
          invite_code?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      options: {
        Row: {
          id: string
          box_id: string
          name: string
          summary: Json
          links: Json
          images: Json
          content: Json
          memo: string | null
          decided_at: string | null
          checked_at: string | null
          group_label: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          box_id: string
          name: string
          summary?: Json
          links?: Json
          images?: Json
          content?: Json
          memo?: string | null
          decided_at?: string | null
          checked_at?: string | null
          group_label?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          box_id?: string
          name?: string
          summary?: Json
          links?: Json
          images?: Json
          content?: Json
          memo?: string | null
          decided_at?: string | null
          checked_at?: string | null
          group_label?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          option_id: string
          user_id: string
          vote_type: string
          round: number
          created_at: string
        }
        Insert: {
          id?: string
          option_id: string
          user_id: string
          vote_type: string
          round?: number
          created_at?: string
        }
        Update: {
          id?: string
          option_id?: string
          user_id?: string
          vote_type?: string
          round?: number
          created_at?: string
        }
        Relationships: []
      }
      box_participants: {
        Row: {
          box_id: string
          user_id: string
          last_seen_at: string
          joined_at: string
        }
        Insert: {
          box_id: string
          user_id: string
          last_seen_at?: string
          joined_at?: string
        }
        Update: {
          box_id?: string
          user_id?: string
          last_seen_at?: string
          joined_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          owner_id: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          invite_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          invite_code?: string
          created_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          user_id: string
          box_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          box_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          box_id?: string
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          user_id: string
          box_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          box_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          box_id?: string
          created_at?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          id: string
          name: string
          sort: number
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sort?: number
          invite_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          sort?: number
          invite_code?: string
          created_at?: string
        }
        Relationships: []
      }
      folder_members: {
        Row: {
          folder_id: string
          user_id: string
          sort: number
          joined_at: string
        }
        Insert: {
          folder_id: string
          user_id: string
          sort?: number
          joined_at?: string
        }
        Update: {
          folder_id?: string
          user_id?: string
          sort?: number
          joined_at?: string
        }
        Relationships: []
      }
      box_folders: {
        Row: {
          box_id: string
          folder_id: string
          sort: number
          shared: boolean
          created_at: string
        }
        Insert: {
          box_id: string
          folder_id: string
          sort?: number
          shared?: boolean
          created_at?: string
        }
        Update: {
          box_id?: string
          folder_id?: string
          sort?: number
          shared?: boolean
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          option_id: string
          user_id: string
          body: string
          parent_comment_id: string | null
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          option_id: string
          user_id: string
          body: string
          parent_comment_id?: string | null
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          option_id?: string
          user_id?: string
          body?: string
          parent_comment_id?: string | null
          edited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          comment_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      withdraw_reasons: {
        Row: {
          id: string
          reasons: Json
          detail: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reasons?: Json
          detail?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reasons?: Json
          detail?: string | null
          created_at?: string
        }
        Relationships: []
      }
      box_activities: {
        Row: {
          id: string
          box_id: string
          actor_id: string
          type: string
          meta: Json
          created_at: string
          target_user_id: string | null
        }
        Insert: {
          id?: string
          box_id: string
          actor_id: string
          type: string
          meta?: Json
          created_at?: string
          target_user_id?: string | null
        }
        Update: {
          id?: string
          box_id?: string
          actor_id?: string
          type?: string
          meta?: Json
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_box: {
        Args: {
          p_title: string
          p_memo?: string | null
          p_decision_mode?: string
          p_deadline_at?: string | null
          p_mode?: string
        }
        Returns: Database['public']['Tables']['boxes']['Row']
      }
      get_box_by_invite_code: {
        Args: { p_code: string }
        Returns: { id: string; title: string }[]
      }
      join_box_by_invite_code: {
        Args: { p_code: string }
        Returns: string
      }
      invite_group_to_box: {
        Args: { p_box_id: string; p_group_id: string }
        Returns: undefined
      }
      get_group_by_invite_code: {
        Args: { p_code: string }
        Returns: { id: string; name: string }[]
      }
      join_group_by_invite_code: {
        Args: { p_code: string }
        Returns: string
      }
      check_group_name_exists: {
        Args: { p_name: string }
        Returns: boolean
      }
      is_box_participant: {
        Args: { p_box_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      delete_account: {
        Args: Record<string, never>
        Returns: void
      }
      close_box: {
        Args: { p_box_id: string }
        Returns: undefined
      }
      reopen_box: {
        Args: { p_box_id: string }
        Returns: undefined
      }
      decide_box: {
        Args: { p_box_id: string; p_option_ids: string[] }
        Returns: undefined
      }
      auto_decide_box: {
        Args: { p_box_id: string }
        Returns: undefined
      }
      get_box_preview_by_invite_code: {
        Args: { p_code: string }
        Returns: {
          id: string
          title: string
          memo: string | null
          participant_count: number
          option_names: string[]
        }[]
      }
      get_box_view_by_invite_code: {
        Args: { p_code: string }
        Returns: Json
      }
      get_folder_by_invite_code: {
        Args: { p_code: string }
        Returns: { id: string; name: string }[]
      }
      get_folder_view_by_invite_code: {
        Args: { p_code: string }
        Returns: Json
      }
      join_folder_by_invite_code: {
        Args: { p_code: string }
        Returns: string
      }
      leave_folder: {
        Args: { p_folder_id: string; p_leave_boxes?: boolean }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
