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
        primary: {
          DEFAULT: '#7c3aed',
          dark: '#6d28d9',
        },
        accent: {
          DEFAULT: '#d4af37',
          dark: '#b79025',
        },
        ink: '#1f1b2c',
        cream: '#fdf9f3',
      },
    },
  },
  plugins: [],
}


