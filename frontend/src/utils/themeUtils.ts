/**
 * Theme & Color Utility Functions for Dynamic Multi-Tenant White-labeling
 */

export interface ColorTonalPalette {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  primaryFixed: string;
  primaryFixedDim: string;
  onPrimaryFixed: string;
  onPrimaryFixedVariant: string;
  surfaceTint: string;
  rgb: string;
}

export interface ClinicalColorPreset {
  id: string;
  name: string;
  hex: string;
  category: 'clinical' | 'modern' | 'nature' | 'sports';
  description: string;
}

export const CLINICAL_COLOR_PRESETS: ClinicalColorPreset[] = [
  {
    id: 'kinesys-blue',
    name: 'Azul Clínico KineSys',
    hex: '#004870',
    category: 'clinical',
    description: 'Tono institucional de alta confianza, serenidad médica y rigor clínico.',
  },
  {
    id: 'surgical-teal',
    name: 'Teal Quirúrgico & Fisio',
    hex: '#006c49',
    category: 'clinical',
    description: 'Verde quirúrgico y rehabilitación motora con alta frescura y vitalidad.',
  },
  {
    id: 'ocean-rehab',
    name: 'Azul Océano Terapéutico',
    hex: '#0284c7',
    category: 'sports',
    description: 'Enérgico y dinámico, ideal para kinesiología deportiva y alto rendimiento.',
  },
  {
    id: 'emerald-health',
    name: 'Esmeralda Bienestar & Nutrición',
    hex: '#059669',
    category: 'nature',
    description: 'Conexión con salud metabólica, balance nutricional y vida sana.',
  },
  {
    id: 'indigo-specialty',
    name: 'Índigo Medicina Integral',
    hex: '#4f46e5',
    category: 'modern',
    description: 'Elegancia tecnológica para centros médicos y consultas multidisciplinarias.',
  },
  {
    id: 'amethyst-care',
    name: 'Amatista Neuro-Rehabilitación',
    hex: '#7c3aed',
    category: 'modern',
    description: 'Enfoque empático y moderno para terapias avanzadas y salud integral.',
  },
  {
    id: 'warm-slate',
    name: 'Grafito Clínico Minimal',
    hex: '#334155',
    category: 'clinical',
    description: 'Estilo sobrio, neutro y minimalista para estética clínica premium.',
  },
  {
    id: 'coral-vitality',
    name: 'Coral Salud & Ergonomía',
    hex: '#ea580c',
    category: 'sports',
    description: 'Cálido y motivacional para entrenamiento funcional y readaptación física.',
  },
];

/**
 * Converts a 3 or 6 digit hex string to RGB numbers
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, '');
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (fullHex.length !== 6) return null;

  const num = parseInt(fullHex, 16);
  if (isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Validates if a string is a valid HEX color
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex.trim());
}

/**
 * Computes luminance and returns high-contrast on-primary color (#ffffff or #0f172a)
 */
export function getContrastForeground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  // Perceived luminance formula (ITU-R BT.709)
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.55 ? '#0f172a' : '#ffffff';
}

/**
 * Darkens or lightens a hex color by percentage (-100 to 100)
 */
export function adjustColorBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  const adjust = (channel: number) => {
    if (factor > 0) {
      return Math.min(255, Math.round(channel + (255 - channel) * factor));
    } else {
      return Math.max(0, Math.round(channel * (1 + factor)));
    }
  };

  const r = adjust(rgb.r).toString(16).padStart(2, '0');
  const g = adjust(rgb.g).toString(16).padStart(2, '0');
  const b = adjust(rgb.b).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

/**
 * Generates a full cohesive tonal palette matching Material 3 / Tailwind CSS token structure
 */
export function generateTonalPalette(baseHex: string): ColorTonalPalette {
  const validHex = isValidHexColor(baseHex) ? baseHex : '#004870';
  const rgb = hexToRgb(validHex) || { r: 0, g: 72, b: 112 };
  const onPrimary = getContrastForeground(validHex);

  const primaryContainer = adjustColorBrightness(validHex, 15);
  const onPrimaryContainer = adjustColorBrightness(validHex, 70);
  const primaryFixed = adjustColorBrightness(validHex, 75);
  const primaryFixedDim = adjustColorBrightness(validHex, 55);
  const onPrimaryFixed = adjustColorBrightness(validHex, -60);
  const onPrimaryFixedVariant = adjustColorBrightness(validHex, -25);
  const surfaceTint = adjustColorBrightness(validHex, 5);

  return {
    primary: validHex,
    onPrimary,
    primaryContainer,
    onPrimaryContainer,
    primaryFixed,
    primaryFixedDim,
    onPrimaryFixed,
    onPrimaryFixedVariant,
    surfaceTint,
    rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
  };
}

/**
 * Injects CSS variables directly into :root (document.documentElement)
 */
export function applyThemeToDOM(palette: ColorTonalPalette): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--color-on-primary', palette.onPrimary);
  root.style.setProperty('--color-primary-container', palette.primaryContainer);
  root.style.setProperty('--color-on-primary-container', palette.onPrimaryContainer);
  root.style.setProperty('--color-primary-fixed', palette.primaryFixed);
  root.style.setProperty('--color-primary-fixed-dim', palette.primaryFixedDim);
  root.style.setProperty('--color-on-primary-fixed', palette.onPrimaryFixed);
  root.style.setProperty('--color-on-primary-fixed-variant', palette.onPrimaryFixedVariant);
  root.style.setProperty('--color-surface-tint', palette.surfaceTint);
  root.style.setProperty('--color-primary-rgb', palette.rgb);
}
