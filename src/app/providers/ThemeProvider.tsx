import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { 
  generateTonalPalette, 
  applyThemeToDOM, 
  CLINICAL_COLOR_PRESETS, 
  ClinicalColorPreset,
  isValidHexColor
} from '../../utils/themeUtils';

interface ThemeContextType {
  primaryColor: string;
  previewColor: string | null;
  logoUrl: string | null;
  previewLogoUrl: string | null;
  activeColor: string;
  activeLogoUrl: string;
  clinicalPresets: ClinicalColorPreset[];
  setPreviewColor: (hex: string | null) => void;
  setPreviewLogoUrl: (url: string | null) => void;
  resetPreview: () => void;
  saveBranding: (updates: { logo_url?: string; primary_color?: string; settings?: any }) => Promise<{ success: boolean; error?: string }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant, updateTenant } = useAuth();

  // Active saved branding from tenant or fallbacks
  const tenantPrimaryColor = tenant?.primary_color || '#004870';
  const tenantLogoUrl = tenant?.logo_url || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80';

  // Live preview state for interactive color picker & image uploader
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(null);

  // The effective active color displayed right now
  const activeColor = useMemo(() => {
    if (previewColor && isValidHexColor(previewColor)) {
      return previewColor;
    }
    return isValidHexColor(tenantPrimaryColor) ? tenantPrimaryColor : '#004870';
  }, [previewColor, tenantPrimaryColor]);

  // The effective active logo displayed right now
  const activeLogoUrl = useMemo(() => {
    return previewLogoUrl || tenantLogoUrl;
  }, [previewLogoUrl, tenantLogoUrl]);

  // Inject CSS variables into DOM whenever activeColor changes
  useEffect(() => {
    const palette = generateTonalPalette(activeColor);
    applyThemeToDOM(palette);
  }, [activeColor]);

  const resetPreview = () => {
    setPreviewColor(null);
    setPreviewLogoUrl(null);
  };

  const saveBranding = async (updates: { 
    logo_url?: string; 
    primary_color?: string; 
    settings?: any 
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      if (updates.primary_color && !isValidHexColor(updates.primary_color)) {
        return { success: false, error: 'Código de color HEX inválido (formato: #RRGGBB).' };
      }

      await updateTenant({
        logo_url: updates.logo_url !== undefined ? updates.logo_url : tenant?.logo_url,
        primary_color: updates.primary_color !== undefined ? updates.primary_color : tenant?.primary_color,
        settings: {
          ...(tenant?.settings || {}),
          ...(updates.settings || {}),
        },
      });

      // Clear preview states after successful persistence
      setPreviewColor(null);
      setPreviewLogoUrl(null);

      return { success: true };
    } catch (err: any) {
      console.error('Error saving branding settings:', err);
      return { success: false, error: err?.message || 'Error al persistir la personalización de marca.' };
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        primaryColor: tenantPrimaryColor,
        previewColor,
        logoUrl: tenantLogoUrl,
        previewLogoUrl,
        activeColor,
        activeLogoUrl,
        clinicalPresets: CLINICAL_COLOR_PRESETS,
        setPreviewColor,
        setPreviewLogoUrl,
        resetPreview,
        saveBranding,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
