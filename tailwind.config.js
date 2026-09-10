/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safety: {
          green: "#10b981",
          emerald: "#059669",
          red: "#ef4444",
          crimson: "#dc2626",
          amber: "#f59e0b",
          yellow: "#eab308",
          dark: "#0f172a",
          slate: "#1e293b",
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-red': 'flashRed 1.2s infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        flashRed: {
          '0%, 100%': { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
          '50%': { backgroundColor: '#fca5a5', borderColor: '#b91c1c' },
        }
      }
    },
  },
  plugins: [],
}
