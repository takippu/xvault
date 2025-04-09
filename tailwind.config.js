/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode to be toggled via a "dark" class on the <html> or <body>
  content: [
    "./entrypoints/**/*.{js,ts,jsx,tsx,html}", // Scan entrypoints directory
    "./components/**/*.{js,ts,jsx,tsx,html}", // Scan potential components directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
