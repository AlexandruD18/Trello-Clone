/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trello-blue': '#0079bf',
        'trello-blue-dark': '#026aa7',
        'trello-navy': '#172b4d',
        'trello-gray': '#5e6c84',
        'trello-light-gray': '#ebecf0',
      },
    },
  },
  plugins: [],
}
