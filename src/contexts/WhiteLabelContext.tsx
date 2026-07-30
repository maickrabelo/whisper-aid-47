import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import srSmsLogo from '@/assets/sr-sms-logo.png.asset.json';

/**
 * Sr.SMS é a única marca desta aplicação (logo fixa),
 * mas cada gestora SST pode escolher o esquema de cores
 * aplicado aos painéis e páginas.
 */

const SR_SMS_LOGO_URL = srSmsLogo.url;
const SR_SMS_BRAND_NAME = 'Sr.SMS';

export type BrandColorTheme = 'green' | 'navy' | 'orange' | 'purple' | 'teal' | 'wine';

interface ColorPalette {
  primary: string;
  primaryDark: string;
  primaryMid: string;
  primaryLight: string;
  primary50: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
}

export const COLOR_PALETTES: Record<BrandColorTheme, ColorPalette> = {
  green: {
    primary: '158 75% 22%',
    primaryDark: '158 75% 15%',
    primaryMid: '158 56% 42%',
    primaryLight: '138 76% 97%',
    primary50: '138 76% 93%',
    gradientFrom: '#14532d',
    gradientVia: '#166534',
    gradientTo: '#15803d',
  },
  navy: {
    primary: '220 56% 24%',
    primaryDark: '220 56% 18%',
    primaryMid: '217 91% 60%',
    primaryLight: '214 100% 97%',
    primary50: '214 95% 93%',
    gradientFrom: '#1e3a5f',
    gradientVia: '#1e40af',
    gradientTo: '#2563eb',
  },
  orange: {
    primary: '20 91% 34%',
    primaryDark: '20 91% 25%',
    primaryMid: '21 90% 48%',
    primaryLight: '33 100% 96%',
    primary50: '33 100% 92%',
    gradientFrom: '#7c2d12',
    gradientVia: '#9a3412',
    gradientTo: '#ea580c',
  },
  purple: {
    primary: '274 72% 32%',
    primaryDark: '274 72% 22%',
    primaryMid: '263 70% 58%',
    primaryLight: '270 100% 98%',
    primary50: '270 100% 95%',
    gradientFrom: '#3b0764',
    gradientVia: '#581c87',
    gradientTo: '#7c3aed',
  },
  teal: {
    primary: '190 80% 24%',
    primaryDark: '192 84% 16%',
    primaryMid: '188 78% 41%',
    primaryLight: '185 96% 96%',
    primary50: '186 94% 90%',
    gradientFrom: '#083344',
    gradientVia: '#155e75',
    gradientTo: '#0891b2',
  },
  wine: {
    primary: '347 70% 28%',
    primaryDark: '347 74% 20%',
    primaryMid: '346 77% 50%',
    primaryLight: '355 100% 97%',
    primary50: '353 96% 93%',
    gradientFrom: '#4c0519',
    gradientVia: '#881337',
    gradientTo: '#be123c',
  },
};

const STORAGE_KEY = 'sms-brand-color';

interface WhiteLabelBrand {
  brandLogo: string;
  brandName: string;
  sstSlug: string | null;
  brandColor: BrandColorTheme;
  isWhiteLabel: boolean;
  isLoading: boolean;
  setBrandColorDB: (color: BrandColorTheme) => Promise<void>;
  getColorPalette: () => ColorPalette;
}

const applyColorTheme = (color: BrandColorTheme) => {
  if (typeof document === 'undefined') return;
  const palette = COLOR_PALETTES[color] || COLOR_PALETTES.green;
  const root = document.documentElement;
  root.style.setProperty('--sst-primary', palette.primary);
  root.style.setProperty('--sst-primary-dark', palette.primaryDark);
  root.style.setProperty('--sst-primary-mid', palette.primaryMid);
  root.style.setProperty('--sst-primary-light', palette.primaryLight);
  root.style.setProperty('--sst-primary-50', palette.primary50);
  root.style.setProperty('--sst-gradient-from', palette.gradientFrom);
  root.style.setProperty('--sst-gradient-via', palette.gradientVia);
  root.style.setProperty('--sst-gradient-to', palette.gradientTo);
  root.style.setProperty('--primary', palette.primary);
  root.style.setProperty('--secondary', palette.primaryMid);
  root.style.setProperty('--accent', palette.primaryDark);
  root.style.setProperty('--ring', palette.primaryMid);
  root.style.setProperty('--audit-primary', palette.primaryDark);
  root.style.setProperty('--audit-secondary', palette.primaryMid);
};

const readStoredColor = (): BrandColorTheme => {
  if (typeof window === 'undefined') return 'green';
  const stored = window.localStorage.getItem(STORAGE_KEY) as BrandColorTheme | null;
  return stored && COLOR_PALETTES[stored] ? stored : 'green';
};

const WhiteLabelContext = createContext<WhiteLabelBrand>({
  brandLogo: SR_SMS_LOGO_URL,
  brandName: SR_SMS_BRAND_NAME,
  sstSlug: null,
  brandColor: 'green',
  isWhiteLabel: true,
  isLoading: false,
  setBrandColorDB: async () => {},
  getColorPalette: () => COLOR_PALETTES.green,
});

export const WhiteLabelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useRealAuth();
  const sstManagerId = (profile as any)?.sst_manager_id ?? null;
  const [brandColor, setBrandColor] = useState<BrandColorTheme>(readStoredColor);

  const getColorPalette = useCallback(
    () => COLOR_PALETTES[brandColor] || COLOR_PALETTES.green,
    [brandColor],
  );

  // Aplica imediatamente (inclusive antes de carregar do banco)
  useEffect(() => {
    applyColorTheme(brandColor);
  }, [brandColor]);

  // Carrega a cor salva da gestora SST
  useEffect(() => {
    let cancelled = false;
    if (!sstManagerId) return;
    (async () => {
      const { data } = await supabase
        .from('sst_managers')
        .select('brand_color')
        .eq('id', sstManagerId)
        .maybeSingle();
      const color = (data as any)?.brand_color as BrandColorTheme | null;
      if (!cancelled && color && COLOR_PALETTES[color]) {
        setBrandColor(color);
        window.localStorage.setItem(STORAGE_KEY, color);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sstManagerId]);

  const setBrandColorDB = useCallback(
    async (color: BrandColorTheme) => {
      if (!COLOR_PALETTES[color]) return;
      // Aplica na hora — a personalização não depende do banco
      setBrandColor(color);
      applyColorTheme(color);
      window.localStorage.setItem(STORAGE_KEY, color);

      if (sstManagerId) {
        const { error } = await supabase
          .from('sst_managers')
          .update({ brand_color: color })
          .eq('id', sstManagerId);
        if (error) {
          console.error('Erro ao salvar cor da marca:', error);
          throw error;
        }
      }
    },
    [sstManagerId],
  );

  return (
    <WhiteLabelContext.Provider
      value={{
        brandLogo: SR_SMS_LOGO_URL,
        brandName: SR_SMS_BRAND_NAME,
        sstSlug: null,
        brandColor,
        isWhiteLabel: true,
        isLoading: false,
        setBrandColorDB,
        getColorPalette,
      }}
    >
      {children}
    </WhiteLabelContext.Provider>
  );
};

export const useWhiteLabel = () => useContext(WhiteLabelContext);
