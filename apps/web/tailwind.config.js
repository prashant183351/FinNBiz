/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4fbf1',
          100: '#e5f6df',
          200: '#caecc0',
          300: '#a3dc97',
          400: '#8dc63f', // The primary bright green from the logo
          500: '#75ab30',
          600: '#5a8624',
          700: '#45671d',
          800: '#38521a',
          900: '#2f4418',
          950: '#172509',
        }
      }
    },
  },
  plugins: [],
}
