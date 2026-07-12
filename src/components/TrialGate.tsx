import React from 'react';
import { useLocation } from 'react-router-dom';
import { useRealAuth } from '@/contexts/RealAuthContext';
import TrialExpiredOverlay from '@/components/TrialExpiredOverlay';
import PaymentBlockedOverlay from '@/components/PaymentBlockedOverlay';
import PaymentOverdueBanner from '@/components/PaymentOverdueBanner';

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
  const { isTrialExpired, paymentStatus, role } = useRealAuth();
  const location = useLocation();

  // Admins/sales are never gated
  if (role === 'admin' || role === 'sales') return null;

  const isPublic = PUBLIC_FORM_MATCHERS.some((rx) => rx.test(location.pathname));
  if (isPublic) return null;

  // Precedence: trial expiration > payment blocked > overdue banner
  if (isTrialExpired) return <TrialExpiredOverlay />;
  if (paymentStatus === 'blocked') return <PaymentBlockedOverlay />;
  if (paymentStatus === 'overdue_warning' || paymentStatus === 'overdue_critical') {
    return <PaymentOverdueBanner />;
  }
  return null;
};

export default TrialGate;

