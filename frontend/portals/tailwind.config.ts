import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff8ff',
          100: '#dbeefe',
          200: '#bedffd',
          300: '#91c7fb',
          400: '#5da6f7',
          500: '#3784f2',
          600: '#2168e3',
          700: '#1c54d1',
          800: '#1d46aa',
          900: '#1e3d86',
          950: '#172651',
        },
        success: { 500: '#16a34a', 600: '#15803d' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        danger:  { 500: '#dc2626', 600: '#b91c1c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
