import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--line-1)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        primary: 'var(--blue)',
        'primary-hover': 'var(--blue-h)',
        navy: 'var(--navy)',
        green: 'var(--green)',
        gold: 'var(--gold)',
        red: 'var(--red)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;