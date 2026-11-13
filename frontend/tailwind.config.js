/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        erise: {
          50: '#e0f7f8',
          100: '#b3ecee',
          200: '#80e0e4',
          300: '#4dd3d9',
          400: '#26cad1',
          500: '#00838F', // E-RISE Brand Teal
          600: '#007480',
          700: '#00616c',
          800: '#004f58',
          900: '#00333b',
          accent: '#00A896',
          dark: {
            950: '#070C14',
            900: '#0B1320', // deep background
            850: '#0F1A2C',
            800: '#142238', // sidebar / panels
            750: '#1A2B46',
            700: '#223656', // cards / dock
            600: '#334B70',
          }
        },
        status: {
          online: '#10B981',
          asleep: '#F59E0B',
          dnd: '#EF4444',
          offline: '#64748B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
