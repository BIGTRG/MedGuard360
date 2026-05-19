BEGIN;
CREATE TABLE dme_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  supplier_user_id UUID NOT NULL REFERENCES users(id),
  hcpcs_code TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  monthly_rental BOOLEAN NOT NULL DEFAULT false,
  rental_months INTEGER,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  state_code CHAR(2) NOT NULL,
  payer_id TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  prior_auth_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);
COMMIT;
