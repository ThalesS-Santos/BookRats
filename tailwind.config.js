/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          light: '#FDFCF5', // Cream/Papyrus
          dark: '#000000',  // Pure Black
        },
        card: {
          light: '#F5F3E7',
          dark: '#121212',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#0F172A',
        },
        surfaceLayer: {
          light: '#F1F5F9',
          dark: '#1E293B',
        },
        primary: {
          DEFAULT: '#5B8C5A', // Sage Green
          dark: '#A7C9A7',
        },
        streak: '#D97706', // Deep Orange
        text: {
          light: '#1A1A1A',
          dark: '#E0E0E0',
          muted: {
            light: '#6B7280',
            dark: '#9CA3AF',
          }
        },
        border: {
          light: '#E5E7EB',
          dark: '#262626',
        },
        borderGlass: {
          light: 'rgba(203, 213, 225, 0.6)',
          dark: 'rgba(71, 85, 105, 0.4)',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        mono: ['Courier New', 'monospace'],
      },
      fontSize: {
        micro: '7px',
        mini: '9px',
        tiny: '11px',
      },
      borderRadius: {
        card: '24px',
        hero: '32px',
        ultra: '40px',
      },
      letterSpacing: {
        ultra: '2px',
        mega: '3px',
      }
    },
  },
  plugins: [],
}
