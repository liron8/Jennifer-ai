export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string | null
          executive_id: string | null
          id: string
          last_message_at: string | null
          org_id: string
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          executive_id?: string | null
          id?: string
          last_message_at?: string | null
          org_id: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          executive_id?: string | null
          id?: string
          last_message_at?: string | null
          org_id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "executive_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          description: string | null
          executive_id: string | null
          id: string
          insight_type: string
          model_version: string | null
          org_id: string
          priority: string | null
          reasoning: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string | null
          suggested_actions: Json | null
          title: string
          updated_at: string | null
          user_action: string | null
          user_action_at: string | null
          user_feedback: string | null
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          executive_id?: string | null
          id?: string
          insight_type: string
          model_version?: string | null
          org_id: string
          priority?: string | null
          reasoning?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          suggested_actions?: Json | null
          title: string
          updated_at?: string | null
          user_action?: string | null
          user_action_at?: string | null
          user_feedback?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          executive_id?: string | null
          id?: string
          insight_type?: string
          model_version?: string | null
          org_id?: string
          priority?: string | null
          reasoning?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          suggested_actions?: Json | null
          title?: string
          updated_at?: string | null
          user_action?: string | null
          user_action_at?: string | null
          user_feedback?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          model: string | null
          role: string
          tokens_used: number | null
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          model?: string | null
          role: string
          tokens_used?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          model?: string | null
          role?: string
          tokens_used?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: []
      }
      ai_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          executive_id: string | null
          first_observed_at: string | null
          id: string
          is_active: boolean | null
          last_observed_at: string | null
          org_id: string
          pattern_key: string
          pattern_type: string
          pattern_value: Json
          sample_size: number | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          executive_id?: string | null
          first_observed_at?: string | null
          id?: string
          is_active?: boolean | null
          last_observed_at?: string | null
          org_id: string
          pattern_key: string
          pattern_type: string
          pattern_value: Json
          sample_size?: number | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          executive_id?: string | null
          first_observed_at?: string | null
          id?: string
          is_active?: boolean | null
          last_observed_at?: string | null
          org_id?: string
          pattern_key?: string
          pattern_type?: string
          pattern_value?: Json
          sample_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      approvals: {
        Row: {
          ai_notes: string | null
          ai_recommendation: string | null
          ai_risk_score: number | null
          amount: number | null
          approval_type: string
          attachments: Json | null
          category: string | null
          created_at: string | null
          currency: string | null
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          description: string | null
          due_date: string | null
          executive_id: string
          id: string
          org_id: string
          related_task_id: string | null
          status: string | null
          submitted_by: string
          title: string
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          ai_notes?: string | null
          ai_recommendation?: string | null
          ai_risk_score?: number | null
          amount?: number | null
          approval_type: string
          attachments?: Json | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          description?: string | null
          due_date?: string | null
          executive_id: string
          id?: string
          org_id: string
          related_task_id?: string | null
          status?: string | null
          submitted_by: string
          title: string
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          ai_notes?: string | null
          ai_recommendation?: string | null
          ai_risk_score?: number | null
          amount?: number | null
          approval_type?: string
          attachments?: Json | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          description?: string | null
          due_date?: string | null
          executive_id?: string
          id?: string
          org_id?: string
          related_task_id?: string | null
          status?: string | null
          submitted_by?: string
          title?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          org_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_sync_tokens: {
        Row: {
          calendar_id: string
          calendar_name: string | null
          color: string | null
          created_at: string | null
          id: string
          integration_id: string
          is_enabled: boolean | null
          is_primary: boolean | null
          last_synced_at: string | null
          page_token: string | null
          sync_token: string | null
          updated_at: string | null
        }
        Insert: {
          calendar_id: string
          calendar_name?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          integration_id: string
          is_enabled?: boolean | null
          is_primary?: boolean | null
          last_synced_at?: string | null
          page_token?: string | null
          sync_token?: string | null
          updated_at?: string | null
        }
        Update: {
          calendar_id?: string
          calendar_name?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          integration_id?: string
          is_enabled?: boolean | null
          is_primary?: boolean | null
          last_synced_at?: string | null
          page_token?: string | null
          sync_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      concierge_services: {
        Row: {
          address: string | null
          category: string
          city: string | null
          contact_name: string | null
          created_at: string | null
          created_by: string
          description: string | null
          email: string | null
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          price_range: string | null
          rating: number | null
          special_instructions: string | null
          subcategory: string | null
          tags: Json | null
          times_used: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          city?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          email?: string | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          special_instructions?: string | null
          subcategory?: string | null
          tags?: Json | null
          times_used?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          email?: string | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          special_instructions?: string | null
          subcategory?: string | null
          tags?: Json | null
          times_used?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          ai_enriched_at: string | null
          ai_enriched_data: Json | null
          assistant_email: string | null
          assistant_name: string | null
          assistant_phone: string | null
          category: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          email: string | null
          executive_id: string | null
          full_name: string
          id: string
          last_contacted_at: string | null
          linkedin_url: string | null
          mobile: string | null
          next_followup_at: string | null
          org_id: string
          phone: string | null
          postal_code: string | null
          preferences: Json | null
          relationship_notes: string | null
          relationship_strength: number | null
          state: string | null
          tags: Json | null
          title: string | null
          twitter_handle: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          ai_enriched_at?: string | null
          ai_enriched_data?: Json | null
          assistant_email?: string | null
          assistant_name?: string | null
          assistant_phone?: string | null
          category?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          email?: string | null
          executive_id?: string | null
          full_name: string
          id?: string
          last_contacted_at?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          next_followup_at?: string | null
          org_id: string
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          relationship_notes?: string | null
          relationship_strength?: number | null
          state?: string | null
          tags?: Json | null
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          ai_enriched_at?: string | null
          ai_enriched_data?: Json | null
          assistant_email?: string | null
          assistant_name?: string | null
          assistant_phone?: string | null
          category?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          email?: string | null
          executive_id?: string | null
          full_name?: string
          id?: string
          last_contacted_at?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          next_followup_at?: string | null
          org_id?: string
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          relationship_notes?: string | null
          relationship_strength?: number | null
          state?: string | null
          tags?: Json | null
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delegations: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          delegated_by: string
          delegated_to: string
          delegation_notes: string | null
          due_date: string | null
          id: string
          org_id: string
          status: string | null
          task_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          delegated_by: string
          delegated_to: string
          delegation_notes?: string | null
          due_date?: string | null
          id?: string
          org_id: string
          status?: string | null
          task_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          delegated_by?: string
          delegated_to?: string
          delegation_notes?: string | null
          due_date?: string | null
          id?: string
          org_id?: string
          status?: string | null
          task_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      direct_reports: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          executive_id: string
          full_name: string
          id: string
          org_id: string
          phone: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          executive_id: string
          full_name: string
          id?: string
          org_id: string
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          executive_id?: string
          full_name?: string
          id?: string
          org_id?: string
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      executive_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          communication_preferences: Json | null
          created_at: string | null
          deleted_at: string | null
          dietary_preferences: Json | null
          dining_preferences: Json | null
          email: string | null
          full_name: string
          gift_preferences: Json | null
          home_address: string | null
          id: string
          is_active: boolean | null
          office_address: string | null
          office_location: string | null
          org_id: string
          phone: string | null
          scheduling_preferences: Json | null
          timezone: string | null
          title: string | null
          travel_preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          communication_preferences?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          dietary_preferences?: Json | null
          dining_preferences?: Json | null
          email?: string | null
          full_name: string
          gift_preferences?: Json | null
          home_address?: string | null
          id?: string
          is_active?: boolean | null
          office_address?: string | null
          office_location?: string | null
          org_id: string
          phone?: string | null
          scheduling_preferences?: Json | null
          timezone?: string | null
          title?: string | null
          travel_preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          communication_preferences?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          dietary_preferences?: Json | null
          dining_preferences?: Json | null
          email?: string | null
          full_name?: string
          gift_preferences?: Json | null
          home_address?: string | null
          id?: string
          is_active?: boolean | null
          office_address?: string | null
          office_location?: string | null
          org_id?: string
          phone?: string | null
          scheduling_preferences?: Json | null
          timezone?: string | null
          title?: string | null
          travel_preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          birthday: string | null
          created_at: string | null
          email: string | null
          executive_id: string
          full_name: string
          id: string
          notes: string | null
          org_id: string
          phone: string | null
          preferences: Json | null
          relationship: string
          updated_at: string | null
        }
        Insert: {
          birthday?: string | null
          created_at?: string | null
          email?: string | null
          executive_id: string
          full_name: string
          id?: string
          notes?: string | null
          org_id: string
          phone?: string | null
          preferences?: Json | null
          relationship: string
          updated_at?: string | null
        }
        Update: {
          birthday?: string | null
          created_at?: string | null
          email?: string | null
          executive_id?: string
          full_name?: string
          id?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          preferences?: Json | null
          relationship?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          allowed_tiers: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          key: string
          name: string
          rollout_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_tiers?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          key: string
          name: string
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_tiers?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          key?: string
          name?: string
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          integration_type: string
          last_error: string | null
          last_synced_at: string | null
          org_id: string
          provider: string
          provider_email: string | null
          provider_user_id: string | null
          refresh_token: string | null
          scopes: Json | null
          settings: Json | null
          status: string | null
          sync_cursor: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          integration_type: string
          last_error?: string | null
          last_synced_at?: string | null
          org_id: string
          provider: string
          provider_email?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          scopes?: Json | null
          settings?: Json | null
          status?: string | null
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          integration_type?: string
          last_error?: string | null
          last_synced_at?: string | null
          org_id?: string
          provider?: string
          provider_email?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          scopes?: Json | null
          settings?: Json | null
          status?: string | null
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          org_id: string
          role: string | null
          status: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          org_id: string
          role?: string | null
          status?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          org_id?: string
          role?: string | null
          status?: string | null
          token?: string
        }
        Relationships: []
      }
      key_dates: {
        Row: {
          ai_suggested_actions: Json | null
          category: string
          created_at: string | null
          created_by: string
          date: string
          description: string | null
          end_date: string | null
          executive_id: string | null
          id: string
          is_recurring: boolean | null
          org_id: string
          recurrence_rule: string | null
          related_contact_id: string | null
          related_family_member_id: string | null
          related_person: string | null
          reminder_days: Json | null
          tags: Json | null
          time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_suggested_actions?: Json | null
          category: string
          created_at?: string | null
          created_by: string
          date: string
          description?: string | null
          end_date?: string | null
          executive_id?: string | null
          id?: string
          is_recurring?: boolean | null
          org_id: string
          recurrence_rule?: string | null
          related_contact_id?: string | null
          related_family_member_id?: string | null
          related_person?: string | null
          reminder_days?: Json | null
          tags?: Json | null
          time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_suggested_actions?: Json | null
          category?: string
          created_at?: string | null
          created_by?: string
          date?: string
          description?: string | null
          end_date?: string | null
          executive_id?: string | null
          id?: string
          is_recurring?: boolean | null
          org_id?: string
          recurrence_rule?: string | null
          related_contact_id?: string | null
          related_family_member_id?: string | null
          related_person?: string | null
          reminder_days?: Json | null
          tags?: Json | null
          time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          ai_meeting_brief: string | null
          ai_suggested_prep: Json | null
          attendees: Json | null
          category: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_time: string
          executive_id: string | null
          external_calendar_id: string | null
          external_calendar_provider: string | null
          external_event_id: string | null
          id: string
          is_all_day: boolean | null
          is_recurring: boolean | null
          last_synced_at: string | null
          location: string | null
          location_details: string | null
          location_type: string | null
          meeting_type: string | null
          metadata: Json | null
          org_id: string
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          start_time: string
          status: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          video_conference_id: string | null
          video_conference_provider: string | null
          video_conference_url: string | null
        }
        Insert: {
          ai_meeting_brief?: string | null
          ai_suggested_prep?: Json | null
          attendees?: Json | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_time: string
          executive_id?: string | null
          external_calendar_id?: string | null
          external_calendar_provider?: string | null
          external_event_id?: string | null
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          location_details?: string | null
          location_type?: string | null
          meeting_type?: string | null
          metadata?: Json | null
          org_id: string
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          start_time: string
          status?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          video_conference_id?: string | null
          video_conference_provider?: string | null
          video_conference_url?: string | null
        }
        Update: {
          ai_meeting_brief?: string | null
          ai_suggested_prep?: Json | null
          attendees?: Json | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_time?: string
          executive_id?: string | null
          external_calendar_id?: string | null
          external_calendar_provider?: string | null
          external_event_id?: string | null
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          location_details?: string | null
          location_type?: string | null
          meeting_type?: string | null
          metadata?: Json | null
          org_id?: string
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          start_time?: string
          status?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          video_conference_id?: string | null
          video_conference_provider?: string | null
          video_conference_url?: string | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          benefits: string | null
          category: string
          created_at: string | null
          enrolled_at: string | null
          executive_id: string
          expires_at: string | null
          id: string
          member_number: string | null
          notes: string | null
          org_id: string
          program_name: string | null
          provider_name: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          benefits?: string | null
          category: string
          created_at?: string | null
          enrolled_at?: string | null
          executive_id: string
          expires_at?: string | null
          id?: string
          member_number?: string | null
          notes?: string | null
          org_id: string
          program_name?: string | null
          provider_name: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          benefits?: string | null
          category?: string
          created_at?: string | null
          enrolled_at?: string | null
          executive_id?: string
          expires_at?: string | null
          id?: string
          member_number?: string | null
          notes?: string | null
          org_id?: string
          program_name?: string | null
          provider_name?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          body: string | null
          category: string | null
          channels: Json | null
          created_at: string | null
          delivered_channels: Json | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          notification_type: string
          org_id: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          body?: string | null
          category?: string | null
          channels?: Json | null
          created_at?: string | null
          delivered_channels?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type: string
          org_id: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          body?: string | null
          category?: string | null
          channels?: Json | null
          created_at?: string | null
          delivered_channels?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string
          org_id?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      org_feature_overrides: {
        Row: {
          created_at: string | null
          feature_flag_id: string
          id: string
          is_enabled: boolean
          org_id: string
        }
        Insert: {
          created_at?: string | null
          feature_flag_id: string
          id?: string
          is_enabled: boolean
          org_id: string
        }
        Update: {
          created_at?: string | null
          feature_flag_id?: string
          id?: string
          is_enabled?: boolean
          org_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          ai_settings: Json | null
          created_at: string | null
          deleted_at: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          settings: Json | null
          size: string | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          ai_settings?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          size?: string | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          ai_settings?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          size?: string | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          ai_notes: string | null
          ai_suggested_due_date: string | null
          ai_suggested_priority: string | null
          assigned_to: string | null
          attachments: Json | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          executive_id: string | null
          id: string
          is_recurring: boolean | null
          org_id: string
          position: number | null
          priority: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          related_contact_id: string | null
          related_meeting_id: string | null
          status: string | null
          subtasks: Json | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_notes?: string | null
          ai_suggested_due_date?: string | null
          ai_suggested_priority?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          executive_id?: string | null
          id?: string
          is_recurring?: boolean | null
          org_id: string
          position?: number | null
          priority?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          related_contact_id?: string | null
          related_meeting_id?: string | null
          status?: string | null
          subtasks?: Json | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_notes?: string | null
          ai_suggested_due_date?: string | null
          ai_suggested_priority?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          executive_id?: string | null
          id?: string
          is_recurring?: boolean | null
          org_id?: string
          position?: number | null
          priority?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          related_contact_id?: string | null
          related_meeting_id?: string | null
          status?: string | null
          subtasks?: Json | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_executive_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          executive_id: string
          id: string
          is_primary: boolean | null
          permissions: Json | null
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          executive_id: string
          id?: string
          is_primary?: boolean | null
          permissions?: Json | null
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          executive_id?: string
          id?: string
          is_primary?: boolean | null
          permissions?: Json | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          last_seen_at: string | null
          onboarding_completed: boolean | null
          onboarding_data: Json | null
          onboarding_step: number | null
          org_id: string
          permissions: Json | null
          phone: string | null
          preferences: Json | null
          role: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          job_title?: string | null
          last_seen_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          onboarding_step?: number | null
          org_id: string
          permissions?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          last_seen_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          onboarding_step?: number | null
          org_id?: string
          permissions?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: Record<string, never>; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
