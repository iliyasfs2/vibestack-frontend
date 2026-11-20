export type UserRole = "customer" | "staff" | "admin";

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}

export interface UserOut {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: UserOut;
  access_token: string;
  token_type: string;
}

export interface RegisterInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface SiteConfigOut {
  site_name: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  working_hours: string | null;
  logo_url: string | null;
  social_links: Record<string, string>;
  extra: Record<string, unknown>;
  updated_at: string;
}

export interface SiteConfigUpdateInput {
  site_name: string;
  tagline?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  working_hours?: string | null;
  logo_url?: string | null;
  social_links?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface ContentBlockOut {
  id: string;
  section_key: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentBlockCreateInput {
  section_key: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface ContentBlockUpdateInput {
  section_key?: string;
  title?: string;
  subtitle?: string | null;
  body?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface MediaFileOut {
  id: string;
  file_key: string;
  url: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  uploaded_by: string;
  created_at: string;
}

export type PaymentStatus = "pending" | "paid" | "failed";

export interface PaymentTransactionOut {
  id: string;
  user_id: string;
  amount_toman: number;
  description: string;
  gateway: string;
  authority: string | null;
  ref_id: string | null;
  status: PaymentStatus;
  idempotency_key: string;
  reference_type: string;
  reference_id: string;
  error_detail: string | null;
  created_at: string;
}

export interface PaymentInitiateInput {
  amount_toman: number;
  description: string;
  reference_type: string;
  reference_id: string;
  idempotency_key: string;
  callback_url?: string;
}

export interface PaymentInitiateResponse {
  transaction: PaymentTransactionOut;
  payment_url: string;
}

export interface PaymentVerifyInput {
  authority: string;
  status: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
