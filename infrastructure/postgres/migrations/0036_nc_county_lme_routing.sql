-- NC County-to-LME/MCO Routing Table
-- Maps all 100 NC counties to Tailored Plan (BH/IDD/TBI) MCOs
-- Partners Health transitioning to Vaya on 2026-10-01
-- Standard Plan only counties default to nearest LME catchment

BEGIN;

CREATE TABLE IF NOT EXISTS nc_county_lme_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_name VARCHAR(50) NOT NULL UNIQUE,
  tailored_plan_payer_id VARCHAR(50) NOT NULL,
  routing_start_date DATE NOT NULL DEFAULT '2024-07-01',
  routing_end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE nc_county_lme_routing ENABLE ROW LEVEL SECURITY;
CREATE POLICY nc_county_lme_routing_read_all
  ON nc_county_lme_routing FOR SELECT USING (TRUE);

-- Index for fast county lookups
CREATE INDEX idx_nc_county_lme_routing_county ON nc_county_lme_routing(county_name);
CREATE INDEX idx_nc_county_lme_routing_payer ON nc_county_lme_routing(tailored_plan_payer_id);

-- =====================================================================
-- ALLIANCE HEALTH (payer_id: NC_TP_ALLIANCE) — 7 counties
-- =====================================================================
INSERT INTO nc_county_lme_routing (county_name, tailored_plan_payer_id, routing_start_date, notes) VALUES
  ('Cumberland', 'NC_TP_ALLIANCE', '2024-07-01', 'Alliance Health catchment area'),
  ('Durham', 'NC_TP_ALLIANCE', '2024-07-01', 'Alliance Health catchment area'),
  ('Harnett', 'NC_TP_ALLIANCE', '2024-07-01', 'Alliance Health catchment area'),
  ('Johnston', 'NC_TP_ALLIANCE', '2024-07-01', 'Alliance Health catchment area'),
  ('Mecklenburg', 'NC_TP_ALLIANCE', '2024-07-01', 'Alliance Health catchment area'),
  ('Orange', 'NC_TP_ALLIANCE', '2024-07-01', 'Alliance Health catchment area'),
  ('Wake', 'NC_TP_ALLIANCE', '2024-07-01', 'Alliance Health catchment area')
ON CONFLICT (county_name) DO NOTHING;

-- =====================================================================
-- TRILLIUM HEALTH RESOURCES (payer_id: NC_TP_TRILLIUM) — 43 counties
-- =====================================================================
INSERT INTO nc_county_lme_routing (county_name, tailored_plan_payer_id, routing_start_date, notes) VALUES
  ('Anson', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Beaufort', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Bertie', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Bladen', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Brunswick', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Camden', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Carteret', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Chowan', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Columbus', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Craven', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Currituck', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Dare', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Duplin', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Edgecombe', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Gates', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Greene', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Guilford', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Halifax', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Hertford', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Hoke', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Hyde', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Jones', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Lee', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Lenoir', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Martin', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Montgomery', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Moore', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Nash', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('New Hanover', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Northampton', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Onslow', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Pamlico', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Pasquotank', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Pender', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Perquimans', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Pitt', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Randolph', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Richmond', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Robeson', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Sampson', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Scotland', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Tyrrell', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Warren', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Washington', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Wayne', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area'),
  ('Wilson', 'NC_TP_TRILLIUM', '2024-07-01', 'Trillium Health catchment area')
ON CONFLICT (county_name) DO NOTHING;

-- =====================================================================
-- VAYA TOTAL CARE (payer_id: NC_TP_VAYA) — 30 counties
-- =====================================================================
INSERT INTO nc_county_lme_routing (county_name, tailored_plan_payer_id, routing_start_date, notes) VALUES
  ('Alamance', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Alexander', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Alleghany', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Ashe', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Avery', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Buncombe', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Caldwell', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Caswell', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Chatham', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Cherokee', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Clay', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Franklin', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Graham', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Granville', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Haywood', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Henderson', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Jackson', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Macon', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Madison', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('McDowell', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Mitchell', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Person', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Polk', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Rowan', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Rockingham', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Stokes', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Swain', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Transylvania', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Vance', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Watauga', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Wilkes', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area'),
  ('Yancey', 'NC_TP_VAYA', '2024-07-01', 'Vaya Total Care catchment area')
ON CONFLICT (county_name) DO NOTHING;

-- =====================================================================
-- PARTNERS HEALTH MANAGEMENT (payer_id: NC_TP_PARTNERS)
-- Active until 2026-09-30, then transitioning to VAYA
-- 15 counties
-- =====================================================================
INSERT INTO nc_county_lme_routing (county_name, tailored_plan_payer_id, routing_start_date, routing_end_date, notes) VALUES
  ('Gaston', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Cleveland', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Lincoln', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Burke', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Catawba', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Iredell', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Rutherford', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Forsyth', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Davie', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Surry', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Davidson', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Stokes', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Burke', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Catawba', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01'),
  ('Watauga', 'NC_TP_PARTNERS', '2024-07-01', '2026-09-30', 'Partners Health → Vaya transition 2026-10-01')
ON CONFLICT (county_name) DO NOTHING;

-- =====================================================================
-- PARTNERS COUNTIES TRANSITIONING TO VAYA (effective 2026-10-01)
-- =====================================================================
INSERT INTO nc_county_lme_routing (county_name, tailored_plan_payer_id, routing_start_date, notes) VALUES
  ('Gaston', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Cleveland', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Lincoln', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Burke', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Catawba', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Iredell', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Rutherford', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Forsyth', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Davie', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Surry', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Davidson', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Stokes', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)'),
  ('Watauga', 'NC_TP_VAYA', '2026-10-01', 'Vaya Total Care (Partners transition)')
ON CONFLICT (county_name) DO NOTHING;

-- =====================================================================
-- STANDARD PLAN ONLY COUNTIES (no Tailored Plan / LME routing)
-- For behavioral health: route to nearest LME/MCO catchment area
-- =====================================================================
INSERT INTO nc_county_lme_routing (county_name, tailored_plan_payer_id, routing_start_date, notes) VALUES
  ('Stanly', 'NC_TP_VAYA', '2024-07-01', 'Standard Plan only; route BH to Vaya nearest'),
  ('Union', 'NC_TP_VAYA', '2024-07-01', 'Standard Plan only; route BH to Vaya nearest'),
  ('Cabarrus', 'NC_TP_VAYA', '2024-07-01', 'Standard Plan only; route BH to Vaya nearest'),
  ('Anson', 'NC_TP_TRILLIUM', '2024-07-01', 'Standard Plan only; route BH to Trillium nearest')
ON CONFLICT (county_name) DO NOTHING;

-- Create function: get_lme_mco(county_name, service_date)
-- Returns the correct tailored_plan_payer_id for a given county and date
CREATE OR REPLACE FUNCTION get_lme_mco(
  p_county_name VARCHAR(50),
  p_service_date DATE DEFAULT CURRENT_DATE
) RETURNS VARCHAR(50) AS $$
DECLARE
  v_payer_id VARCHAR(50);
BEGIN
  SELECT tailored_plan_payer_id INTO v_payer_id
    FROM nc_county_lme_routing
   WHERE county_name = p_county_name
     AND routing_start_date <= p_service_date
     AND (routing_end_date IS NULL OR routing_end_date >= p_service_date)
   ORDER BY routing_start_date DESC
   LIMIT 1;

  RETURN COALESCE(v_payer_id, 'UNKNOWN');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Audit
SELECT 'NC county LME routing seeded' AS status, COUNT(*) AS total_rows
  FROM nc_county_lme_routing;

COMMIT;
