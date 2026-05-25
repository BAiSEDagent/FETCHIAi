import type { Config } from 'tailwindcss'

/**
 * Fetchi v2.3 — dual-surface Tailwind theme map.
 *
 * v2.3 governs theme boundaries (cream/light marketing + onboarding
 * ↔ dark/operator product). v2.1 governs how the dark product surface
 * uses those tokens (coral discipline, Apollo restraint).
 *
 * Color tokens are pulled from CSS variables defined in app/globals.css
 * under .theme-light and .theme-dark. Components should reach for the
 * v2.3 names (bg, surface, raised, border, text, text2, coral, blue, …),
 * not the legacy brand-* aliases — the aliases stay only as a safety
 * net so unmigrated files keep compiling.
 */
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
      colors: {
        // ── v2.3 semantic tokens (preferred) ──────────────────────
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

        // ── shadcn HSL aliases (driven by globals.css per-theme) ──
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

        // ── LEGACY brand-* aliases — SAFETY NET ONLY ──────────────
        // Re-pointed at the v2.3 scale so unmigrated files render in
        // the new system. New code should NOT use these — reach for
        // bg/surface/raised/text/text2/coral/blue/ok directly.
        // `brand-near-black` is pinned to the constant darkSlab so
        // unmigrated dark slabs don't invert when wrapped in .theme-dark.
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
