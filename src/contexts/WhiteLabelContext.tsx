import React, { createContext, useContext, useEffect, useCallback } from 'react';
import srSmsLogo from '@/assets/sr-sms-logo.png.asset.json';

/**
 * Sr.SMS é a única marca desta aplicação.
 * Este contexto sempre retorna a logo/cor do Sr.SMS e aplica
 * a paleta verde como tema global.
 */

const SR_SMS_LOGO_URL = srSmsLogo.url;
const SR_SMS_BRAND_NAME = 'Sr.SMS';

export type BrandColorTheme = 'green';

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

const GREEN_PALETTE: ColorPalette = {
  primary: '158 75% 22%',
  primaryDark: '158 75% 15%',
  primaryMid: '158 56% 42%',
  primaryLight: '138 76% 97%',
  primary50: '138 76% 93%',
  gradientFrom: '#14532d',
  gradientVia: '#166534',
  gradientTo: '#15803d',
};

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

const applyGreenTheme = () => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--sst-primary', GREEN_PALETTE.primary);
  root.style.setProperty('--sst-primary-dark', GREEN_PALETTE.primaryDark);
  root.style.setProperty('--sst-primary-mid', GREEN_PALETTE.primaryMid);
  root.style.setProperty('--sst-primary-light', GREEN_PALETTE.primaryLight);
  root.style.setProperty('--sst-primary-50', GREEN_PALETTE.primary50);
  root.style.setProperty('--sst-gradient-from', GREEN_PALETTE.gradientFrom);
  root.style.setProperty('--sst-gradient-via', GREEN_PALETTE.gradientVia);
  root.style.setProperty('--sst-gradient-to', GREEN_PALETTE.gradientTo);
  root.style.setProperty('--primary', GREEN_PALETTE.primary);
  root.style.setProperty('--secondary', GREEN_PALETTE.primaryMid);
  root.style.setProperty('--accent', GREEN_PALETTE.primaryDark);
  root.style.setProperty('--ring', GREEN_PALETTE.primaryMid);
  root.style.setProperty('--audit-primary', GREEN_PALETTE.primaryDark);
  root.style.setProperty('--audit-secondary', GREEN_PALETTE.primaryMid);
};

const WhiteLabelContext = createContext<WhiteLabelBrand>({
  brandLogo: SR_SMS_LOGO_URL,
  brandName: SR_SMS_BRAND_NAME,
  sstSlug: null,
  brandColor: 'green',
  isWhiteLabel: true,
  isLoading: false,
  setBrandColorDB: async () => {},
  getColorPalette: () => GREEN_PALETTE,
});

export const WhiteLabelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getColorPalette = useCallback(() => GREEN_PALETTE, []);
  const setBrandColorDB = useCallback(async (_color: BrandColorTheme) => {
    // Marca fixa, nada a salvar
  }, []);

  useEffect(() => {
    applyGreenTheme();
  }, []);

  return (
    <WhiteLabelContext.Provider
      value={{
        brandLogo: SR_SMS_LOGO_URL,
        brandName: SR_SMS_BRAND_NAME,
        sstSlug: null,
        brandColor: 'green',
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
