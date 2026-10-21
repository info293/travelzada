// Night Bordeaux ramps (600 = #651926 brand wine, 700 = #462831 mauve shadow)
const wine = {
  50: '#FBF4F5',
  100: '#F5E6E9',
  200: '#EBCDD3',
  300: '#D9A5B0',
  400: '#B86A79',
  500: '#852233',
  600: '#651926',
  700: '#4C111C',
  800: '#3A0D16',
  900: '#2A0910',
  950: '#1A0509',
}

const mauve = {
  50: '#F7F3F4',
  100: '#EDE4E7',
  200: '#DBC8CE',
  300: '#BFA0AA',
  400: '#9A7380',
  500: '#74505B',
  600: '#5D3642',
  700: '#462831',
  800: '#341D24',
  900: '#231318',
  950: '#14090C',
}

// Neutrals tinted toward mauve (200 = Alabaster, 500 ≈ Granite, 950 = Coffee)
const neutral = {
  50: '#F8F6F8',
  100: '#F1EEF1',
  200: '#E2DDE3',
  300: '#CDC8CF',
  400: '#A9A5AF',
  500: '#85818C',
  600: '#67636D',
  700: '#4A4450',
  800: '#2D2429',
  900: '#1A1013',
  950: '#0F0406',
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Figtree', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['var(--font-display)', '"Cormorant Garamond"', 'Georgia', 'serif'],
        script: ['var(--font-script)', '"Pinyon Script"', 'cursive'],
        cormorant: ['var(--font-display)', '"Cormorant Garamond"', 'Georgia', 'serif'],
        pinyon: ['var(--font-script)', '"Pinyon Script"', 'cursive'],
        figtree: ['var(--font-sans)', 'Figtree', 'system-ui', 'sans-serif'],
      },
      // Night Bordeaux palette — wine red & coffee black, cooled by granite and alabaster.
      //   Bordeaux  #651926  brand accent: primary CTAs, links, highlights, active states
      //   Coffee    #0F0406  ink: headings, body text, darkest surfaces
      //   Granite   #95929C  muted: meta text on dark, dividers, placeholders
      //   Alabaster #E2DDE3  canvas: page background, light buttons on dark imagery
      //   Mauve     #462831  depth: secondary dark surfaces, footer, hover of bordeaux
      colors: {
        tz: {
          bordeaux: '#651926',
          coffee: '#0F0406',
          granite: '#95929C',
          alabaster: '#E2DDE3',
          mauve: '#462831',
          rose: '#C9A0AC',
          mist: '#F5F2F5',
          // Brand aliases
          dark: '#0F0406',
          cocoa: '#462831',
          brown: '#651926',
          bronze: '#95929C',
          gold: '#C9A0AC',
          sand: '#E2DDE3',
          cream: '#E2DDE3',
        },
        bordeaux: {
          DEFAULT: '#651926',
          light: '#852233',
          dark: '#4c111c',
          ...wine,
        },
        coffee: {
          DEFAULT: '#0F0406',
          light: '#1e0c10',
        },
        granite: {
          DEFAULT: '#95929C',
          light: '#b0adb7',
          dark: '#6B6773',
        },
        alabaster: {
          DEFAULT: '#E2DDE3',
          light: '#F5F2F5',
          dark: '#cbc5cd',
        },
        mauve: {
          DEFAULT: '#462831',
          light: '#5d3642',
          dark: '#301b22',
          ...mauve,
        },
        gray: neutral,
        slate: neutral,
        // Legacy accent hues remapped onto the brand ramps so older components
        // (purple CTAs, indigo links, pink highlights) render in palette.
        purple: wine,
        violet: wine,
        fuchsia: wine,
        pink: wine,
        indigo: mauve,
        primary: {
          ...wine,
          DEFAULT: '#651926',
          dark: '#462831',
          light: '#852233',
        },
        accent: {
          DEFAULT: '#95929C',
          dark: '#462831',
          rose: '#651926',
        },
        ink: '#0F0406',
        cream: '#E2DDE3',
      },
      animation: {
        'spin-slow': 'spin-slow 8s linear infinite',
        'fly': 'fly 4s ease-in-out infinite',
        'fly-across': 'fly-across 1.5s ease-in-out',
        'sparkle': 'sparkle 2s ease-in-out infinite',
      },
      keyframes: {
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fly': {
          '0%': { transform: 'translateX(-30px) translateY(5px) rotate(-30deg)', opacity: '0' },
          '25%': { transform: 'translateX(-10px) translateY(-8px) rotate(-10deg)', opacity: '0.8' },
          '50%': { transform: 'translateX(0) translateY(-12px) rotate(0deg)', opacity: '1' },
          '75%': { transform: 'translateX(10px) translateY(-8px) rotate(10deg)', opacity: '0.8' },
          '100%': { transform: 'translateX(30px) translateY(5px) rotate(30deg)', opacity: '0' },
        },
        'fly-across': {
          '0%': { transform: 'translateX(-100px) translateY(0) rotate(-45deg)', opacity: '0' },
          '50%': { transform: 'translateX(0) translateY(-15px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateX(100px) translateY(0) rotate(45deg)', opacity: '0' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
          '50%': { opacity: '0.7', transform: 'scale(1.2) rotate(180deg)' },
        },
      },
    },
  },
  plugins: [],
}


