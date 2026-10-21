/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        clinical: '0 1px 3px 0 rgba(15, 43, 60, 0.06), 0 1px 2px -1px rgba(15, 43, 60, 0.04)',
        'clinical-md':
          '0 4px 6px -1px rgba(15, 43, 60, 0.08), 0 2px 4px -2px rgba(15, 43, 60, 0.05)',
        'clinical-lg':
          '0 10px 15px -3px rgba(15, 43, 60, 0.08), 0 4px 6px -4px rgba(15, 43, 60, 0.04)',
      },
    },
  },
  plugins: [],
};
