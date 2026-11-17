export type Role = "admin" | "receptionist" | "patient";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Service {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price: string; // decimal as string, e.g. "60.00"
  is_active: boolean;
}

export interface Dentist {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  specialty: string;
  is_active: boolean;
}

export interface Appointment {
  id: number;
  patient: number;
  patient_name: string;
  dentist: number;
  dentist_name: string;
  service: number;
  service_name: string;
  starts_at: string; // ISO 8601 with offset
  ends_at: string;
  status: AppointmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Slot {
  starts_at: string;
  ends_at: string;
}

export interface Availability {
  date: string;
  dentist: number;
  service: number;
  duration_minutes: number;
  slots: Slot[];
}

export interface Me {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  patient: number | null;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface Stats {
  date_from: string;
  date_to: string;
  total: number;
  by_status: Record<AppointmentStatus, number>;
  cancellation_rate: number;
  by_day: { date: string; count: number }[];
  by_service: { service: string; count: number }[];
}

export type StatusAction = "confirm" | "complete" | "cancel";

export const isStaff = (me: Me | null): boolean =>
  me?.role === "admin" || me?.role === "receptionist";
