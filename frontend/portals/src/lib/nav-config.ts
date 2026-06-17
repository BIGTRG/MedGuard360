import {
  HomeIcon, UsersIcon, DocumentTextIcon, ShieldCheckIcon, CurrencyDollarIcon,
  ExclamationTriangleIcon, ChartBarIcon, PhoneIcon, BoltIcon, ClipboardDocumentCheckIcon,
  TruckIcon, BeakerIcon, AcademicCapIcon, ArrowsRightLeftIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import type { UserRole } from './types';

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const PROVIDER_NAV: NavItem[] = [
  { label: 'Overview',    href: '/provider',            icon: HomeIcon },
  { label: 'Patients',    href: '/provider/patients',   icon: UsersIcon },
  { label: 'Encounters',  href: '/provider/encounters', icon: DocumentTextIcon },
  { label: 'Workflow',    href: '/provider/workflow',   icon: BoltIcon },
  { label: 'Claims',      href: '/provider/claims',     icon: CurrencyDollarIcon },
  { label: 'PA Requests', href: '/provider/pa',         icon: ClipboardDocumentCheckIcon },
];

const STATE_NAV: NavItem[] = [
  { label: 'Dashboard',     href: '/state',              icon: HomeIcon },
  { label: 'Claims',        href: '/state/claims',       icon: CurrencyDollarIcon },
  { label: 'PERM',          href: '/state/perm',         icon: ChartBarIcon },
  { label: 'Fraud',         href: '/state/fraud',        icon: ShieldCheckIcon },
  { label: 'Credentialing', href: '/state/credentialing',icon: ClipboardDocumentCheckIcon },
];

const FRAUD_NAV: NavItem[] = [
  { label: 'Queue',  href: '/fraud',          icon: HomeIcon },
  { label: 'Rings',  href: '/fraud/rings',    icon: ArrowsRightLeftIcon },
  { label: 'Cases',  href: '/fraud/cases',    icon: ExclamationTriangleIcon },
];

const PA_NAV: NavItem[] = [
  { label: 'Queue',     href: '/pa-queue',         icon: HomeIcon },
  { label: 'Decided',   href: '/pa-queue/decided', icon: ClipboardDocumentCheckIcon },
];

const COMPLIANCE_NAV: NavItem[] = [
  { label: 'Overview',      href: '/compliance',           icon: HomeIcon },
  { label: 'Audit search',  href: '/audit',                icon: DocumentTextIcon },
  { label: 'Integrations',  href: '/admin/integrations',   icon: ArrowsRightLeftIcon },
  { label: 'Reports',       href: '/reporting',            icon: ChartBarIcon },
];

const DENIAL_NAV: NavItem[] = [
  { label: 'Queue',    href: '/denials', icon: HomeIcon },
];

const PATIENT_NAV: NavItem[] = [
  { label: 'My Health', href: '/patient', icon: HomeIcon },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Admin Home',    href: '/admin',                icon: Cog6ToothIcon },
  { label: 'Integrations',  href: '/admin/integrations',   icon: ArrowsRightLeftIcon },
  { label: 'Pilot States',  href: '/admin/pilot-states',   icon: ChartBarIcon },
  { label: 'Provider',      href: '/provider',      icon: UsersIcon },
  { label: 'Patient',       href: '/patient',       icon: UsersIcon },
  { label: 'Pharmacy',      href: '/pharmacy',      icon: BeakerIcon },
  { label: 'DME',           href: '/dme',           icon: TruckIcon },
  { label: 'NEMT',          href: '/nemt',          icon: TruckIcon },
  { label: 'PA Queue',      href: '/pa-queue',      icon: ClipboardDocumentCheckIcon },
  { label: 'Credentialing', href: '/credentialing', icon: ShieldCheckIcon },
  { label: 'Fraud',         href: '/fraud',         icon: ShieldCheckIcon },
  { label: 'Denials',       href: '/denials',       icon: ExclamationTriangleIcon },
  { label: 'HIE',           href: '/hie',           icon: ArrowsRightLeftIcon },
  { label: 'School',        href: '/school',        icon: AcademicCapIcon },
  { label: 'State',         href: '/state',         icon: ChartBarIcon },
  { label: 'Responder',     href: '/responder',     icon: BoltIcon },
  { label: 'Biometric',     href: '/biometric',     icon: ShieldCheckIcon },
  { label: 'Audit Log',     href: '/audit',         icon: DocumentTextIcon },
  { label: 'Reports',       href: '/reporting',     icon: ChartBarIcon },
];

export const PORTAL_TITLE: Record<UserRole, string> = {
  patient:                    'My Health',
  individual_provider:        'Provider Portal',
  facility_provider:          'Facility Portal',
  pharmacy:                   'Pharmacy',
  dmepos_supplier:            'DME Supplier',
  nemt_broker:                'Transport Broker',
  mco_admin:                  'MCO Admin',
  state_medicaid_agency:      'State Medicaid',
  federal_cms:                'Federal CMS',
  credentialing_specialist:   'Credentialing',
  prior_auth_specialist:      'Prior Auth',
  billing_manager:            'Billing',
  compliance_officer:         'Compliance',
  fraud_investigator:         'Fraud Investigator',
  denial_appeals_specialist:  'Denials & Appeals',
  school_administrator:       'School-Based',
  hie_administrator:          'HIE Admin',
  emergency_responder:        'Responder',
  qa_auditor:                 'QA',
  platform_administrator:     'Platform Admin',
};

export function navForRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'individual_provider':
    case 'facility_provider':
      return PROVIDER_NAV;
    case 'state_medicaid_agency':
    case 'mco_admin':
    case 'federal_cms':
      return STATE_NAV;
    case 'fraud_investigator':
      return FRAUD_NAV;
    case 'prior_auth_specialist':
      return PA_NAV;
    case 'compliance_officer':
    case 'qa_auditor':
      return COMPLIANCE_NAV;
    case 'denial_appeals_specialist':
      return DENIAL_NAV;
    case 'patient':
      return PATIENT_NAV;
    case 'platform_administrator':
      return ADMIN_NAV;
    default:
      return [{ label: 'Home', href: '/', icon: HomeIcon }];
  }
}

void PhoneIcon;
