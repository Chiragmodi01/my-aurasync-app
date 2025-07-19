/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This tells Tailwind to scan all your JS/JSX/TS/TSX files in src for classes
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // Define Inter font family
      },
      colors: {
        // Define your custom colors if needed, or rely on Tailwind's defaults
        // Example:
        // 'rose-800': '#9F1239',
      }
    },
  },
  plugins: [],
}
