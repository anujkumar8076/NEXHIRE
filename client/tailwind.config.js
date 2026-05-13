/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter","system-ui","-apple-system","sans-serif"],
      },
      colors: {
        indigo: {
          50: "#eef2ff", 100:"#e0e7ff", 200:"#c7d2fe", 300:"#a5b4fc",
          400:"#818cf8", 500:"#6366f1", 600:"#4f46e5", 700:"#4338ca",
          800:"#3730a3", 900:"#312e81",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
      },
      animation: {
        "slide-right": "slideRight 0.3s ease-out",
        "fade-up":     "fadeUp 0.2s ease-out",
      },
      keyframes: {
        slideRight: { from:{ transform:"translateX(100%)" }, to:{ transform:"translateX(0)" } },
        fadeUp:     { from:{ opacity:"0", transform:"translateY(6px)" }, to:{ opacity:"1", transform:"translateY(0)" } },
      },
    },
  },
  plugins: [],
};
