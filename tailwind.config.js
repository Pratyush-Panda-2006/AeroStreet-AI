/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './templates/**/*.html',
    './public/js/**/*.js',
    './components/**/*.{tsx,jsx,js}',
    './*.{tsx,jsx,js,html}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        'primary-hover': '#1d4ed8',
        'deep-slate': '#020617',
        'card-border': '#e2e8f0',
        'muted-bg': '#f8fafc',
        success: '#16a34a',
        warning: '#d97706',
        error: '#dc2626'
      },
      fontFamily: {
        sans: ['Inter', 'Satoshi', 'sans-serif']
      },
      borderRadius: {
        card: '12px',
        btn: '8px'
      }
    }
  },
  plugins: []
};
