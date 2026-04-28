/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        verifai: {
          bg: '#0a0a0a',
          green: '#00ff88',
          cyan: '#00d4ff',
        },
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(0,255,136,0.25), 0 0 30px rgba(0,255,136,0.10)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-40%)' },
          '100%': { transform: 'translateY(140%)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        scanline: 'scanline 1.4s ease-in-out infinite',
        floaty: 'floaty 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

