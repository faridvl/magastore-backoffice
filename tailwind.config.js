const customColors = {
  primary: {
    DEFAULT: '#5ec4aa',
    light: '#8bd6c3',
    dark: '#3f9c85',
    soft: '#e3f5ef',
  },
  secondary: {
    DEFAULT: '#0EA5E9',
    dark: '#0369A1',
  },
  accent: {
    DEFAULT: '#ffcd3c',
    dark: '#e6ab00',
    soft: '#fff3d1',
  },
  neutral: {
    50: '#fdfcf9',
    100: '#f5f4f0',
    200: '#e7e5e0',
    300: '#d3d1cb',
    400: '#9c9a94',
    500: '#6e6c67',
    600: '#4a4947',
    700: '#333230',
    800: '#1f1e1d',
    900: '#111111',
  },
  success: { DEFAULT: '#10B981', dark: '#047857' },
  danger: { DEFAULT: '#EF4444', dark: '#B91C1C' },
  warning: { DEFAULT: '#F59E0B', dark: '#B45309' },

  background: '#111111',
  surface: '#1f1e1d',
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
        glow: '0 0 15px 2px rgba(255, 205, 60, 0.3)',
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
