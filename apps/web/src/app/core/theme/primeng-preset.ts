import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * PrimeNG theme: Aura with the Smart ERP brand blue and a neutral slate surface.
 * Tailwind reads the same tokens (tailwindcss-primeui), so `bg-primary`, `text-muted-color`
 * and the PrimeNG components always match, in light and dark mode.
 */
export const SmartErpPreset = definePreset(Aura, {
  primitive: {
    borderRadius: { none: '0', xs: '4px', sm: '6px', md: '10px', lg: '12px', xl: '16px' },
  },
  semantic: {
    primary: {
      50: '#eef5ff',
      100: '#d9e8ff',
      200: '#bcd7ff',
      300: '#8ebeff',
      400: '#599aff',
      500: '#3376fb',
      600: '#1d58f0',
      700: '#1544dc',
      800: '#1838b2',
      900: '#1a358c',
      950: '#152255',
    },
    focusRing: { width: '2px', style: 'solid', color: '{primary.color}', offset: '2px' },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
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
          950: '#020617',
        },
        primary: { color: '{primary.600}', hoverColor: '{primary.700}', activeColor: '{primary.800}' },
        highlight: { background: '{primary.50}', focusBackground: '{primary.100}', color: '{primary.700}', focusColor: '{primary.800}' },
      },
      dark: {
        surface: {
          0: '#ffffff',
          50: '#f1f4fa',
          100: '#dde3ef',
          200: '#bac4d8',
          300: '#8d99b3',
          400: '#65728f',
          500: '#47536d',
          600: '#323d55',
          700: '#232d45',
          800: '#18213a',
          900: '#121a2e',
          950: '#0b1020',
        },
        primary: { color: '{primary.400}', hoverColor: '{primary.300}', activeColor: '{primary.200}', contrastColor: '{surface.950}' },
        highlight: {
          background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
          color: '{primary.200}',
          focusColor: '{primary.100}',
        },
      },
    },
  },
});
