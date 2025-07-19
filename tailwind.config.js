/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'], // Define Rajdhani font family
      },
      colors: {
        spotifyGreen: '#1DB954', // Spotify's official green
        // You can add other custom colors here if needed
      }
    },
  },
  plugins: [],
}
