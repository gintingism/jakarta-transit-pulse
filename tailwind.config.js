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
          krlRed: '#D32F2F',
          krlBlue: '#0284C7',
          krlGreen: '#16A34A',
          krlYellow: '#F59E0B',
          mrtBlue: '#005BAA',
          mrtGreen: '#009B4C',
          lrtCoral: '#E04E26',
          tjBlue: '#0072BC',
          tjOrange: '#F58220',
          bandaraTeal: '#00A499',
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'floating': '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        'floating-dark': '0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 4px 16px -2px rgba(0, 0, 0, 0.4)',
      },
      letterSpacing: {
        'tightest': '-0.03em',
        'tighter': '-0.02em',
        'tight': '-0.01em',
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'radar-sweep': 'radarSweep 3s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(2, 132, 199, 0.8))' },
          '50%': { opacity: '0.4', filter: 'drop-shadow(0 0 2px rgba(2, 132, 199, 0.2))' },
        },
      },
    },
  },
  plugins: [],
}
