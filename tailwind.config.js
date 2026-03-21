/** @type {import('tailwindcss').Config} */
export default {
  // Solo procesar archivos en src/ para mantener el bundle pequeño
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // Paleta de marca: rojo crimson (#e0252d) + acento amarillo/naranja (piso de ventas)
      colors: {
        brand: {
          50:  '#fef2f2',
          100: '#fee2e3',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#e0252d',  // color exacto de marca
          600: '#e0252d',  // primario
          700: '#b91c22',  // hover
          800: '#991b1b',  // activo/oscuro
          900: '#7f1d1d',
        },
        accent: {
          400: '#fbbf24',  // amarillo
          500: '#f59e0b',  // naranja-amarillo
          600: '#d97706',  // naranja oscuro
        },
      },
      // Altura mínima touch-friendly para botones (44 px WCAG)
      minHeight: {
        touch: '44px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
