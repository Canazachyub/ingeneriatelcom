/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores por variable: en el sitio público valen lo mismo de siempre; dentro
        // del panel (html.admin-ui, src/styles/admin.css) pasan a la escala navy del
        // dashboard de operaciones y todas las pantallas cambian sin reescribirlas.
        primary: {
          50: 'rgb(var(--tw-primary-50) / <alpha-value>)',
          100: 'rgb(var(--tw-primary-100) / <alpha-value>)',
          200: 'rgb(var(--tw-primary-200) / <alpha-value>)',
          300: 'rgb(var(--tw-primary-300) / <alpha-value>)',
          400: 'rgb(var(--tw-primary-400) / <alpha-value>)',
          500: 'rgb(var(--tw-primary-500) / <alpha-value>)',
          600: 'rgb(var(--tw-primary-600) / <alpha-value>)',
          700: 'rgb(var(--tw-primary-700) / <alpha-value>)',
          800: 'rgb(var(--tw-primary-800) / <alpha-value>)',
          900: 'rgb(var(--tw-primary-900) / <alpha-value>)',
          950: 'rgb(var(--tw-primary-950) / <alpha-value>)',
        },
        slate: {
          50: 'rgb(var(--tw-slate-50) / <alpha-value>)',
          100: 'rgb(var(--tw-slate-100) / <alpha-value>)',
          200: 'rgb(var(--tw-slate-200) / <alpha-value>)',
          300: 'rgb(var(--tw-slate-300) / <alpha-value>)',
          400: 'rgb(var(--tw-slate-400) / <alpha-value>)',
          500: 'rgb(var(--tw-slate-500) / <alpha-value>)',
          600: 'rgb(var(--tw-slate-600) / <alpha-value>)',
          700: 'rgb(var(--tw-slate-700) / <alpha-value>)',
          800: 'rgb(var(--tw-slate-800) / <alpha-value>)',
          900: 'rgb(var(--tw-slate-900) / <alpha-value>)',
          950: 'rgb(var(--tw-slate-950) / <alpha-value>)',
        },
        gray: {
          50: 'rgb(var(--tw-gray-50) / <alpha-value>)',
          100: 'rgb(var(--tw-gray-100) / <alpha-value>)',
          200: 'rgb(var(--tw-gray-200) / <alpha-value>)',
          300: 'rgb(var(--tw-gray-300) / <alpha-value>)',
          400: 'rgb(var(--tw-gray-400) / <alpha-value>)',
          500: 'rgb(var(--tw-gray-500) / <alpha-value>)',
          600: 'rgb(var(--tw-gray-600) / <alpha-value>)',
          700: 'rgb(var(--tw-gray-700) / <alpha-value>)',
          800: 'rgb(var(--tw-gray-800) / <alpha-value>)',
          900: 'rgb(var(--tw-gray-900) / <alpha-value>)',
          950: 'rgb(var(--tw-gray-950) / <alpha-value>)',
        },
        accent: {
          electric: '#00d4ff',
          energy: '#fbbf24',
          success: '#10b981',
          warning: '#f59e0b',
        }
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'counter': 'counter 2s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #00d4ff, 0 0 10px #00d4ff' },
          '100%': { boxShadow: '0 0 20px #00d4ff, 0 0 30px #00d4ff' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.8), 0 0 30px rgba(0, 212, 255, 0.4)' },
        },
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0f2847 100%)',
        'gradient-electric': 'linear-gradient(90deg, #2563eb 0%, #00d4ff 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(30,73,118,0.1) 0%, rgba(10,22,40,0.3) 100%)',
      },
    },
  },
  plugins: [],
}
