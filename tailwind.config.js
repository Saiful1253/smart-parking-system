/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './docs/**/*.html',
    './docs/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
          950: '#172554',
        },
        sp: {
          primary: '#0B1426',
          secondary: '#111B33',
          card: '#152238',
          accent: '#3B82F6',
          emerald: '#10B981',
          purple: '#8B5CF6',
          cyan: '#06B6D4',
          red: '#EF4444',
          amber: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
};
