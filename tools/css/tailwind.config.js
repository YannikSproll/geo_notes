/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../../wwwroot/**/*.{js,html}"
  ],
  theme: {
    extend: {
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
}

