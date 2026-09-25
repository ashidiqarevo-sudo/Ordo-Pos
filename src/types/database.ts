/**
 * Definisi TypeScript untuk Skema Relasional PostgreSQL Supabase Ordo V0
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ServiceStatusEnum = 'BARU' | 'PROSES' | 'SIAP' | 'DIAMBIL' | 'BATAL';
export type ConfirmationStatusEnum = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK' | 'TIDAK_PERLU';
export type PaymentTypeEnum = 'DP' | 'PELUNASAN';
export type CashEntryTypeEnum = 'IN' | 'OUT' | 'TRANSFER';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; // UUID references auth.users.id
          full_name: string;
          phone: string;
          role: 'OWNER';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string;
          role?: 'OWNER';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          role?: 'OWNER';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      stores: {
        Row: {
          id: string; // UUID
          owner_id: string; // UUID references profiles.id
          name: string;
          username: string; // unique slug e.g. jaya-phone-a1b2c
          tagline: string;
          address: string;
          phone: string;
          logo_url: string | null;
          default_warranty_days: string;
          warranty_terms: string;
          theme_preference: 'dark' | 'light';
          has_completed_onboarding: boolean;
          has_completed_store_setup: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          username: string;
          tagline?: string;
          address?: string;
          phone?: string;
          logo_url?: string | null;
          default_warranty_days?: string;
          warranty_terms?: string;
          theme_preference?: 'dark' | 'light';
          has_completed_onboarding?: boolean;
          has_completed_store_setup?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          username?: string;
          tagline?: string;
          address?: string;
          phone?: string;
          logo_url?: string | null;
          default_warranty_days?: string;
          warranty_terms?: string;
          theme_preference?: 'dark' | 'light';
          has_completed_onboarding?: boolean;
          has_completed_store_setup?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      store_whatsapp_templates: {
        Row: {
          id: string;
          store_id: string; // UUID references stores.id
          wa_intake_msg: string;
          wa_diagnosis_msg: string;
          wa_ready_msg: string;
          wa_done_msg: string;
          wa_cancel_msg: string;
          wa_cancel_pickup_msg: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          wa_intake_msg?: string;
          wa_diagnosis_msg?: string;
          wa_ready_msg?: string;
          wa_done_msg?: string;
          wa_cancel_msg?: string;
          wa_cancel_pickup_msg?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          wa_intake_msg?: string;
          wa_diagnosis_msg?: string;
          wa_ready_msg?: string;
          wa_done_msg?: string;
          wa_cancel_msg?: string;
          wa_cancel_pickup_msg?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      store_ticket_sequences: {
        Row: {
          store_id: string;
          year_short: string;
          last_sequence: number;
        };
        Insert: {
          store_id: string;
          year_short: string;
          last_sequence?: number;
        };
        Update: {
          store_id?: string;
          year_short?: string;
          last_sequence?: number;
        };
        Relationships: [];
      };

      customers: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          phone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          phone: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          phone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      services: {
        Row: {
          id: string;
          store_id: string;
          ticket_no: string;
          customer_id: string | null;
          customer_name_snapshot: string;
          customer_phone_snapshot: string;
          device_model: string;
          screen_lock: string;
          complaints: string[];
          notes: string;
          status: ServiceStatusEnum;
          estimated_cost: number;
          initial_estimated_cost: number | null;
          diagnosis: string | null;
          confirmation_status: ConfirmationStatusEnum;
          confirmed_at: string | null;
          final_cost: number;
          dp_amount: number;
          sparepart_cost: number;
          warranty_days: number;
          payment_method: string;
          ready_at: string | null;
          picked_up_at: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          ticket_no: string;
          customer_id?: string | null;
          customer_name_snapshot: string;
          customer_phone_snapshot?: string;
          device_model: string;
          screen_lock?: string;
          complaints?: string[];
          notes?: string;
          status?: ServiceStatusEnum;
          estimated_cost?: number;
          initial_estimated_cost?: number | null;
          diagnosis?: string | null;
          confirmation_status?: ConfirmationStatusEnum;
          confirmed_at?: string | null;
          final_cost?: number;
          dp_amount?: number;
          sparepart_cost?: number;
          warranty_days?: number;
          payment_method?: string;
          ready_at?: string | null;
          picked_up_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          ticket_no?: string;
          customer_id?: string | null;
          customer_name_snapshot?: string;
          customer_phone_snapshot?: string;
          device_model?: string;
          screen_lock?: string;
          complaints?: string[];
          notes?: string;
          status?: ServiceStatusEnum;
          estimated_cost?: number;
          initial_estimated_cost?: number | null;
          diagnosis?: string | null;
          confirmation_status?: ConfirmationStatusEnum;
          confirmed_at?: string | null;
          final_cost?: number;
          dp_amount?: number;
          sparepart_cost?: number;
          warranty_days?: number;
          payment_method?: string;
          ready_at?: string | null;
          picked_up_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      payments: {
        Row: {
          id: string;
          store_id: string;
          service_id: string;
          payment_type: PaymentTypeEnum;
          amount: number;
          payment_method: string;
          payment_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          service_id: string;
          payment_type: PaymentTypeEnum;
          amount: number;
          payment_method: string;
          payment_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          service_id?: string;
          payment_type?: PaymentTypeEnum;
          amount?: number;
          payment_method?: string;
          payment_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      warranties: {
        Row: {
          id: string;
          store_id: string;
          service_id: string;
          duration_days: number;
          start_date: string;
          expiry_date: string;
          terms: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          service_id: string;
          duration_days: number;
          start_date: string;
          expiry_date: string;
          terms?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          service_id?: string;
          duration_days?: number;
          start_date?: string;
          expiry_date?: string;
          terms?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      cash_entries: {
        Row: {
          id: string;
          store_id: string;
          entry_type: CashEntryTypeEnum;
          category: string;
          amount: number;
          notes: string;
          payment_method: string | null;
          transfer_from: string | null;
          transfer_to: string | null;
          entry_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          entry_type: CashEntryTypeEnum;
          category: string;
          amount: number;
          notes?: string;
          payment_method?: string | null;
          transfer_from?: string | null;
          transfer_to?: string | null;
          entry_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          entry_type?: CashEntryTypeEnum;
          category?: string;
          amount?: number;
          notes?: string;
          payment_method?: string | null;
          transfer_from?: string | null;
          transfer_to?: string | null;
          entry_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      generate_next_ticket_no: {
        Args: {
          p_store_id: string;
          p_year_short: string;
        };
        Returns: string;
      };
      get_current_store_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };

    Enums: {
      service_status_enum: ServiceStatusEnum;
      confirmation_status_enum: ConfirmationStatusEnum;
      payment_type_enum: PaymentTypeEnum;
      cash_entry_type_enum: CashEntryTypeEnum;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
