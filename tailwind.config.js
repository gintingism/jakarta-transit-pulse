/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        surface: {
          DEFAULT: '#12141c',
          card: '#161923',
          border: '#262b3a',
          hover: '#1e2230',
        },
        transit: {
          krlRed: '#e11d48',
          krlBlue: '#0284c7',
          krlGreen: '#10b981',
          krlYellow: '#f59e0b',
          tjRed: '#ef4444',
          tjBlue: '#3b82f6',
          tjOrange: '#f97316',
          tjPurple: '#8b5cf6',
          cyan: '#00f0ff',
          neon: '#10b981',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'radar-sweep': 'radarSweep 3s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.8))' },
          '50%': { opacity: '0.4', filter: 'drop-shadow(0 0 2px rgba(0, 240, 255, 0.2))' },
        },
      },
    },
  },
  plugins: [],
}
