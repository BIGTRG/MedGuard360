export type ProviderType = 'individual' | 'facility' | 'group' | 'pharmacy' | 'dmepos' | 'nemt';
export type ProviderStatus = 'pending_credentialing' | 'active' | 'suspended' | 'terminated';

export interface ProviderRow {
  id: string;
  user_id: string | null;
  npi: string;
  ein: string | null;
  type: ProviderType;
  legal_name: string;
  doing_business_as: string | null;
  email: string | null;
  phone: string | null;
  primary_taxonomy_code: string | null;
  enrolled_medicaid_states: string[];
  enrolled_medicare: boolean;
  status: ProviderStatus;
  state_code: string | null;
  org_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SpecialtyRow {
  id: string;
  provider_id: string;
  taxonomy_code: string;
  taxonomy_description: string;
  is_primary: boolean;
}

export interface LocationRow {
  id: string;
  provider_id: string;
  label: string;
  address_line1: string;
  city: string;
  state_code: string;
  postal_code: string;
  latitude: string | null;
  longitude: string | null;
  is_primary: boolean;
  active: boolean;
}
