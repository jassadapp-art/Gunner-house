/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F4F8F5',
          100: '#E7F2EB',
          200: '#D1E5DA',
          300: '#B0D3BF',
          400: '#84B89A',
          500: '#5D9C77',
          600: '#46805E',
          700: '#38664C',
          800: '#2F523E',
          900: '#1C3326',
          950: '#0F1E16',
        },
        fintech: {
          dark: '#0B0F19',
          card: '#111827',
          cardHover: '#1F2937',
          border: '#1F293D',
          muted: '#94A3B8',
          subtle: '#64748B',
        },
        personA: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        personB: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Prompt', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.25)',
        'fintech-card': '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
        'sage-soft': '0 4px 24px -2px rgba(28, 51, 38, 0.06)',
      }
    },
  },
  plugins: [],
}
