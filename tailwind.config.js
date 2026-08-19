/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // HUD surfaces, darkest to lightest
        void: '#0a0e27',
        hull: '#0d1230',
        panel: '#111739',
        raised: '#161d47',
        // Structure
        grid: '#1a2350',
        edge: '#232c5e',
        // Accent
        indigo: {
          DEFAULT: '#4f46e5',
          bright: '#6366f1',
          dim: '#3730a3',
        },
        // Readouts
        cyan: '#22d3ee',
        amber: '#f59e0b',
        emerald: '#10b981',
        rose: '#f43f5e',
        // Type
        ink: '#e2e8f0',
        dim: '#94a3b8',
        faint: '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(79,70,229,0.35), 0 0 24px -4px rgba(79,70,229,0.45)',
        'glow-sm': '0 0 0 1px rgba(79,70,229,0.3), 0 0 12px -4px rgba(79,70,229,0.4)',
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        breathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        sweep: 'sweep 1.8s ease-in-out infinite',
        breathe: 'breathe 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
