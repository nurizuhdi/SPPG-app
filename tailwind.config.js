/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './*.html',
    './*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d'
        },
        sidebar: '#0f172a'
      }
    }
  },
  safelist: [
    'bg-emerald-600',
    'bg-rose-600',
    'bg-amber-500',
    'bg-teal-600',
    'hover:bg-teal-700',
    'bg-indigo-600',
    'hover:bg-indigo-700',
    'bg-blue-500'
  ],
  plugins: []
};
