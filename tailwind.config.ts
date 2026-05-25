import type { Config } from 'tailwindcss'

/** Fetchi v2.3 dual-surface Tailwind theme map. */
const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
        'dm-sans': ['var(--font-dm-sans)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        heading: ['var(--font-outfit)', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      fontSize: {
        display: ['36px', { lineHeight: '1.1', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '1.15', fontWeight: '600' }],
        h2: ['22px', { lineHeight: '1.2', fontWeight: '600' }],
        h3: ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        body: ['14px', { lineHeight: '1.55', fontWeight: '400' }],
        caption: ['12.5px', { lineHeight: '1.5', fontWeight: '500' }],
        micro: ['11px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '1px' }],
      },
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        text2: 'rgb(var(--text2) / <alpha-value>)',
        textMuted: 'rgb(var(--textMuted) / <alpha-value>)',
        coral: 'rgb(var(--coral) / <alpha-value>)',
        coralDeep: 'rgb(var(--coralDeep) / <alpha-value>)',
        coralSoft: 'rgb(var(--coralSoft) / <alpha-value>)',
        blue: 'rgb(var(--blue) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        parch: 'rgb(var(--parch) / <alpha-value>)',
        parchMute: 'rgb(var(--parchMute) / <alpha-value>)',
        mustard: 'rgb(var(--mustard) / <alpha-value>)',
        darkSlab: 'rgb(var(--darkSlab) / <alpha-value>)',
        border: 'hsl(var(--border-hsl))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        'brand-parchment': 'rgb(var(--bg) / <alpha-value>)',
        'brand-cream': 'rgb(var(--surface) / <alpha-value>)',
        'brand-cream-muted': 'rgb(var(--raised) / <alpha-value>)',
        'brand-near-black': '#101211',
        'brand-green': 'rgb(var(--ok) / <alpha-value>)',
        'brand-dark': 'rgb(var(--text2) / <alpha-value>)',
        'brand-light': 'rgb(var(--surface) / <alpha-value>)',
        'brand-coral': 'rgb(var(--coral) / <alpha-value>)',
        'ml-card': 'rgb(var(--surface) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'fetchi-soft':
          '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px -10px rgba(0,0,0,0.10)',
        'fetchi-card':
          '0 2px 4px rgba(0,0,0,0.04), 0 12px 30px -12px rgba(0,0,0,0.16)',
        'fetchi-sticky': '0 -6px 24px -8px rgba(0,0,0,0.10)',
        'fetchi-stamp': '5px 5px 0 #2D2B2A',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
