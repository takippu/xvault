/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{js,ts,jsx,tsx,html}", // Scan entrypoints directory
    "./components/**/*.{js,ts,jsx,tsx,html}", // Scan potential components directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
