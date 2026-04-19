/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
      keyframes: {
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-14px) scaleY(0.96)', transformOrigin: 'top' },
          to:   { opacity: '1', transform: 'translateY(0)    scaleY(1)',    transformOrigin: 'top' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up':    'fadeUp 0.3s ease-out both',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
