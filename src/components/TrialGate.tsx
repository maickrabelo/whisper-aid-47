import React from 'react';
import { useLocation } from 'react-router-dom';
import { useRealAuth } from '@/contexts/RealAuthContext';
import TrialExpiredOverlay from '@/components/TrialExpiredOverlay';

// Routes that must remain accessible even when trial is expired
// (public forms, auth, sign-up flows, static pages)
const ALLOWED_PREFIXES = [
  '/auth',
  '/sms/auth',
  '/reset-password',
  '/change-password',
  '/completar-cadastro',
  '/report/', // public denunciation form
  '/denuncia-enviada',
  '/pesquisa/',
  '/hseit/', // matches public respondent form + management (blocked by overlay through role check anyway)
  '/burnout/',
  '/copsoq/',
  '/pulse/',
  '/ouvidoria-beta/',
  '/i/',
  '/sst/',
  '/teste-gratis',
  '/apresentacao',
  '/relatoriodemo',
  '/preview/',
  '/convite',
];

// Only truly public respondent form paths (contain /:companySlug/:assessmentId etc.)
const PUBLIC_FORM_MATCHERS = [
  /^\/report\/[^/]+$/,
  /^\/pesquisa\//,
  /^\/hseit\/[^/]+\/[^/]+$/,
  /^\/burnout\/[^/]+\/[^/]+$/,
  /^\/copsoq\/[^/]+\/[^/]+$/,
  /^\/pulse\/[^/]+$/,
  /^\/ouvidoria-beta\//,
  /^\/i\//,
  /^\/sst\/[^/]+$/,
  /^\/teste-gratis/,
  /^\/apresentacao$/,
  /^\/relatoriodemo$/,
  /^\/preview\//,
  /^\/convite/,
  /^\/auth$/,
  /^\/sms\/auth$/,
  /^\/reset-password$/,
  /^\/change-password$/,
  /^\/completar-cadastro$/,
  /^\/denuncia-enviada$/,
  /^\/$/,
];

const TrialGate: React.FC = () => {
  const { isTrialExpired, role } = useRealAuth();
  const location = useLocation();

  if (!isTrialExpired) return null;
  // Admins/sales are never gated
  if (role === 'admin' || role === 'sales') return null;

  const isPublic = PUBLIC_FORM_MATCHERS.some((rx) => rx.test(location.pathname));
  if (isPublic) return null;

  return <TrialExpiredOverlay />;
};

export default TrialGate;
