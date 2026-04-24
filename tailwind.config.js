/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bdc: {
          primary: '#00C853',
          dark: '#0A0F1E',
          card: '#111827',
          border: '#1F2937',
        }
      }
    },
  },
  plugins: [],
}