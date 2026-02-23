const customColors = {
  primary: {
    DEFAULT: '#2563EB',
    light: '#3B82F6',
    dark: '#1E40AF',
    soft: '#DBEAFE',
  },
  secondary: {
    DEFAULT: '#0EA5E9',
    dark: '#0369A1',
  },
  accent: {
    DEFAULT: '#D4AF37',
    dark: '#B8860B',
    soft: '#F5E6BE',
  },
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  success: { DEFAULT: '#10B981', dark: '#047857' },
  danger: { DEFAULT: '#EF4444', dark: '#B91C1C' },
  warning: { DEFAULT: '#F59E0B' },

  background: '#0F172A',
  surface: '#1E293B',
  'navy-blue': '#001f3f',
  'navy-blue-dark': '#001737',
};

function getColorWhitelist() {
  const prefixes = ['hover:bg', 'hover:text', 'hover:border', 'bg', 'text', 'border', 'ring'];
  const whitelist = [];
  function insertColor(className) {
    if (!whitelist.includes(className)) whitelist.push(className);
  }

  prefixes.forEach((prefix) =>
    Object.entries(customColors).forEach(([color, value]) => {
      if (typeof value === 'object') {
        Object.keys(value).forEach((subColor) => {
          insertColor(
            subColor === 'DEFAULT' ? `${prefix}-${color}` : `${prefix}-${color}-${subColor}`,
          );
        });
      } else {
        insertColor(`${prefix}-${color}`);
      }
    }),
  );
  return whitelist;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  safelist: getColorWhitelist(),
  theme: {
    extend: {
      colors: customColors,
      boxShadow: {
        card: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
        'card-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.35)',
        glow: '0 0 15px 2px rgba(212, 175, 55, 0.3)',
        'primary-button': '0 6px 12px rgba(37, 99, 235, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      spacing: {
        4.5: '1.125rem',
        18: '4.5rem',
        22: '5.5rem',
        76: '19rem',
        100: '25rem',
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.7s ease-out',
      },
      keyframes: {
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
    screens: {
      xs: '340px',
      sm: '644px',
      md: '768px',
      lg: '924px',
      xl: '1366px',
    },
  },
  plugins: [],
};
