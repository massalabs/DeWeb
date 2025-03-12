/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  presets: [require("../../server/pages/src/colors/preset.js")],
};
