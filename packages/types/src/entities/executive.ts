/**
 * Executive Profile Entity Types
 */

export interface PhoneEntry {
  type: 'mobile' | 'office' | 'home' | 'assistant' | 'other';
  number: string;
  is_primary: boolean;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface SchedulingPreferences {
  meeting_buffer_minutes: number;
  preferred_meeting_times: string[]; // e.g., ['morning', 'afternoon']
  max_meetings_per_day?: number;
  working_hours: {
    start: string; // HH:mm
    end: string;
  };
  blocked_times?: {
    day_of_week: number;
    start: string;
    end: string;
    reason?: string;
  }[];
}

export interface DietaryPreferences {
  restrictions: string[];
  allergies: string[];
  favorites: string[];
  dislikes: string[];
  notes?: string;
}

export interface TravelPreferences {
  preferred_airlines: string[];
  airline_loyalty_numbers: Record<string, string>;
  seat_preference: 'window' | 'aisle' | 'no_preference';
  class_preference: 'economy' | 'premium_economy' | 'business' | 'first';
  hotel_preferences: string[];
  hotel_loyalty_numbers: Record<string, string>;
  car_rental_preferences: string[];
  tsa_precheck?: string;
  global_entry?: string;
  passport_number?: string;
  passport_expiry?: string;
}

export interface DiningPreferences {
  favorite_restaurants: string[];
  cuisine_preferences: string[];
  reservation_notes?: string;
}

export interface HealthInfo {
  blood_type?: string;
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medical_notes?: string;
}

export interface FleetInfo {
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vin?: string;
  notes?: string;
}

export interface ExecutiveProfile {
  id: string;
  org_id: string;
  full_name: string;
  title?: string;
  email?: string;
  phones: PhoneEntry[];
  main_office_location?: string;
  office_address?: Address;
  home_address?: Address;
  timezone: string;
  avatar_url?: string;
  bio?: string;
  scheduling_preferences: SchedulingPreferences;
  dietary_preferences: DietaryPreferences;
  travel_preferences: TravelPreferences;
  dining_preferences: DiningPreferences;
  health_info: HealthInfo;
  fleet_info: FleetInfo[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExecutiveCreateInput {
  full_name: string;
  title?: string;
  email?: string;
  phones?: PhoneEntry[];
  main_office_location?: string;
  timezone?: string;
  avatar_url?: string;
  bio?: string;
}

export interface ExecutiveUpdateInput {
  full_name?: string;
  title?: string;
  email?: string;
  phones?: PhoneEntry[];
  main_office_location?: string;
  office_address?: Address;
  home_address?: Address;
  timezone?: string;
  avatar_url?: string;
  bio?: string;
  scheduling_preferences?: Partial<SchedulingPreferences>;
  dietary_preferences?: Partial<DietaryPreferences>;
  travel_preferences?: Partial<TravelPreferences>;
  dining_preferences?: Partial<DiningPreferences>;
  health_info?: Partial<HealthInfo>;
  fleet_info?: FleetInfo[];
  is_active?: boolean;
}

export interface DirectReport {
  id: string;
  executive_id: string;
  full_name: string;
  title?: string;
  email?: string;
  phone?: string;
  department?: string;
  notes?: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  executive_id: string;
  full_name: string;
  relationship: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface Membership {
  id: string;
  executive_id: string;
  name: string;
  membership_type: 'airline' | 'hotel' | 'club' | 'gym' | 'other';
  member_id?: string;
  tier?: string;
  expiry_date?: string;
  notes?: string;
  created_at: string;
}

export interface UserExecutiveAssignment {
  id: string;
  user_id: string;
  executive_id: string;
  is_primary: boolean;
  assigned_at: string;
}
