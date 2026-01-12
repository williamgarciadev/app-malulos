/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        bgDark: "var(--color-bg-dark)",
        bgCard: "var(--color-bg-card)",
        bgInput: "var(--color-bg-input)",
        bgHover: "var(--color-bg-hover)",
        textPrimary: "var(--color-text)",
        textMuted: "var(--color-text-muted)",
      },
      boxShadow: {
        'glass': 'var(--shadow-glass)',
        'premium': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
