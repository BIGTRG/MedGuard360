export interface DmeOrder {
  id: string;
  patient_id: string;
  supplier_user_id: string;
  hcpcs_code: string;
  item_description: string | null;
  quantity: number;
  monthly_rental: boolean;
  rental_months: number | null;
  order_date: string; // DATE as ISO string
  delivery_date: string | null;
  state_code: string;
  payer_id: string;
  total_amount: number;
  prior_auth_number: string | null;
  status: DmeOrderStatus;
  created_at: string;
  created_by: string;
}

export type DmeOrderStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'delivered'
  | 'cancelled'
  | 'billed';

export interface CreateDmeOrderInput {
  patient_id: string;
  supplier_user_id: string;
  hcpcs_code: string;
  item_description?: string;
  quantity?: number;
  monthly_rental?: boolean;
  rental_months?: number;
  order_date?: string;
  delivery_date?: string;
  state_code: string;
  payer_id: string;
  total_amount: number;
  prior_auth_number?: string;
}

export interface DmeOrderFilters {
  patientId?: string;
  supplierId?: string;
  stateCode?: string;
  status?: DmeOrderStatus;
}

export interface HcpcsValidationResult {
  valid: boolean;
  description?: string;
  requiresPA?: boolean;
  category?: string;
}
