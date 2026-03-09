/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0F172A',
        card: '#1E293B',
        primary: '#22C55E', // Green gymrats
        streak: '#F97316' // Orange
      }
    },
  },
  plugins: [],
}
