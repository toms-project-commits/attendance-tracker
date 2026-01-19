/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
        'brutal-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
        'brutal-xl': '8px 8px 0px 0px rgba(0,0,0,1)',
      },
      borderWidth: {
        '3': '3px',
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      animation: {
        'press': 'press 0.2s ease-in-out forwards',
      },
      keyframes: {
        press: {
          '0%, 100%': { transform: 'translate(0, 0)', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' },
          '100%': { transform: 'translate(2px, 2px)', boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' },
        },
      },
      padding: {
        'brutal': '1.5rem',
      },
      colors: {
        'brutal-white': '#FFFFFF',
        'brutal-black': '#000000',
      },
    },
  },
  plugins: [],
}
