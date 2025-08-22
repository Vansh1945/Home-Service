// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D9488',    // Teal – Fresh, modern
        background: '#FFFFFF', // White – Clean, airy
        secondary: '#374151',  // Dark Gray – Professional text
        accent: '#F97316',     // Orange – Strong action buttons
      },
    },
  },
  plugins: [],
}
