/**
 * MediChain Centralized Design Tokens
 * Clinical, restrained medical design tokens ensuring hospital-grade visual credibility.
 */

export const colors = {
  navy: {
    50: '#f0f5fa',
    100: '#e1ecf4',
    200: '#c3d9e9',
    300: '#95bed9',
    400: '#5fa0c4',
    500: '#3b84ad',
    600: '#2b6b90',
    700: '#235675',
    800: '#1b445c',
    900: '#0f2b3c',
    950: '#0a1c27',
  },
  medical: {
    50: '#f0f7ff',
    100: '#e0effe',
    200: '#b9ddfe',
    300: '#7cc2fd',
    400: '#36a3fa',
    500: '#0c86eb',
    600: '#026ac8',
    700: '#0254a2',
    800: '#064885',
    900: '#0b3c6f',
    950: '#07264a',
  },
  status: {
    success: {
      light: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534',
      solid: '#16a34a',
    },
    warning: {
      light: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
      solid: '#d97706',
    },
    danger: {
      light: '#fef2f2',
      border: '#fecaca',
      text: '#991b1b',
      solid: '#dc2626',
    },
    info: {
      light: '#f0f9ff',
      border: '#bae6fd',
      text: '#075985',
      solid: '#0284c7',
    },
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, Menlo, Monaco, Consolas, monospace',
  },
  scale: {
    xs: { fontSize: '0.75rem', lineHeight: '1rem' }, // 12px
    sm: { fontSize: '0.875rem', lineHeight: '1.25rem' }, // 14px
    base: { fontSize: '1rem', lineHeight: '1.5rem' }, // 16px
    lg: { fontSize: '1.125rem', lineHeight: '1.75rem' }, // 18px
    xl: { fontSize: '1.25rem', lineHeight: '1.75rem' }, // 20px
    '2xl': { fontSize: '1.5rem', lineHeight: '2rem' }, // 24px
    '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' }, // 30px
  },
} as const;

export const spacing = {
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
} as const;

export const radii = {
  sm: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  full: '9999px',
} as const;
