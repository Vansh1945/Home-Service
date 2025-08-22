// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D9488',    
        background: '#FFFFFF', 
        secondary: '#374151',  
        accent: '#F97316',     
      },
    },
  },
  plugins: [],
}
