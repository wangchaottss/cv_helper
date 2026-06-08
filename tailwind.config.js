/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        canvas: {
          bg: '#e5e7eb',
          paper: '#ffffff',
        },
      },
      width: {
        'a4': '794px',
      },
      height: {
        'a4': '1123px',
      },
    },
  },
  plugins: [],
};
