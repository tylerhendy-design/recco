import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        bg: {
          base: '#0c0c0e',
          card: '#161618',
          elevated: '#1a1a1e',
          input: '#161618',
          hover: '#111114',
        },
        // Borders
        border: {
          DEFAULT: '#2a2a30',
          subtle: '#1e1e22',
          faint: '#161618',
        },
        // Text
        text: {
          primary: '#ffffff',
          secondary: '#c8c8d4',
          muted: '#909099',   // 5.7:1 — body supporting text
          dim: '#777780',     // 4.5:1 — secondary labels, timestamps
          faint: '#606068',   // 3.1:1 — decorative labels, section headers (large/bold)
          ghost: '#2a2a32',   // placeholder only — not for readable text
        },
        // Accent
        accent: {
          DEFAULT: '#D4E23A',
          bg: 'rgba(212,226,58,0.15)',
          border: 'rgba(212,226,58,0.3)',
          fg: '#1a1c00',
        },
        // Categories
        cat: {
          restaurant: '#F56E6E',
          'restaurant-bg': '#2a1010',
          tv: '#5BC4F5',
          'tv-bg': '#0e1e2e',
          podcast: '#2DD4BF',
          'podcast-bg': '#062420',
          music: '#C084FC',
          'music-bg': '#1e1030',
          book: '#FB923C',
          'book-bg': '#2a1808',
          film: '#F472B6',
          'film-bg': '#2a0e1e',
        },
        // Sentiment
        good: {
          DEFAULT: '#22c55e',
          bg: 'rgba(34,197,94,0.1)',
        },
        bad: {
          DEFAULT: '#92400e',
          bg: 'rgba(146,64,14,0.1)',
        },
        meh: {
          DEFAULT: '#888888',
          bg: 'rgba(136,136,136,0.08)',
        },
        // Spotify
        spotify: {
          DEFAULT: '#1DB954',
          bg: '#0a1f0e',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        phone: '48px',
        sheet: '24px',
        card: '16px',
        chip: '100px',
        btn: '14px',
        input: '12px',
      },
      boxShadow: {
        phone: '0 0 0 6px #1a1a1c',
      },
      width: {
        phone: '390px',
      },
      maxWidth: {
        phone: '390px',
      },
      height: {
        phone: '844px',
      },
      screens: {
        phone: '390px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.32,0.72,0,1)',
      },
    },
  },
  plugins: [],
}

export default config
