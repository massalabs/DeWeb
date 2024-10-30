/** @type {import('tailwindcss').Config} */
import plugin from "tailwindcss/plugin";
import themeConfig from "./themeConfig.js";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createThemes } = require("tw-colors");

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      plex: ["IBM Plex Mono", "monospace"],
      clock: ["E1234", "sans-serif"]
    }
  },
  plugins: [
    createThemes(themeConfig),
    plugin(function ({ addComponents, theme }) {
      addComponents({
        ".paragraph-lg": {
          fontSize: "30px",
          fontWeight: "400",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "42px",
          fontStyle: "normal",
          userSelect: "none"
        },
        ".paragraph-light-lg": {
          fontSize: "28px",
          fontWeight: "200",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "42px",
          fontStyle: "normal",
          userSelect: "none"
        },
        ".paragraph-italic-lg": {
          fontSize: "30px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "42px",
          fontStyle: "italic",
          userSelect: "none"
        },
        ".paragraph-italic-light-lg": {
          fontSize: "30px",
          fontWeight: "300",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "42px",
          fontStyle: "italic",
          userSelect: "none"
        },
        ".title-lg": {
          fontSize: "46px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "62px",
          fontStyle: "semi-bold",
          userSelect: "none"
        },

        // medium
        ".paragraph-md": {
          fontSize: "24px",
          fontWeight: "400",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "36px",
          fontStyle: "normal",
          userSelect: "none"
        },
        ".paragraph-light-md": {
          fontSize: "22px",
          fontWeight: "200",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "36px",
          fontStyle: "normal",
          userSelect: "none"
        },
        ".paragraph-italic-md": {
          fontSize: "24px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "36px",
          fontStyle: "italic",
          userSelect: "none"
        },
        ".paragraph-italic-light-md": {
          fontSize: "24px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "36px",
          fontStyle: "italic",
          userSelect: "none"
        },
        ".title-md": {
          fontSize: "36px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "52px",
          fontStyle: "semi-bold",
          userSelect: "none"
        },
        // mobile
        ".paragraph-sm": {
          fontSize: "16px",
          fontWeight: "400",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "32px",
          fontStyle: "normal",
          userSelect: "none"
        },
        ".paragraph-light-sm": {
          fontSize: "14px",
          fontWeight: "200",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "32px",
          fontStyle: "normal",
          userSelect: "none"
        },
        ".paragraph-italic-sm": {
          fontSize: "16px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "32px",
          fontStyle: "italic",
          userSelect: "none"
        },
        ".paragraph-italic-light-sm": {
          fontSize: "16px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "32px",
          fontStyle: "italic",
          userSelect: "none"
        },
        ".title-sm": {
          fontSize: "28px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "46px",
          fontStyle: "semi-bold",
          userSelect: "none"
        },

        // window
        ".window-content": {
          display: "flex",

          flexDirection: "column",
          justifyContent: "start",
          alignItems: "center",
          textAlign: "center",
          gap: "32px",
          overflow: "scroll",
          padding: "24px 4px",
          overflowY: "scroll"
        },

        ".pan-action": {
          touchAction: "pan-x"
        },

        // Clock
        ".clock-lg": {
          fontSize: "60px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.clock"),
          userSelect: "none"
        },
        ".clock-md": {
          fontSize: "48px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.clock"),
          userSelect: "none"
        },
        ".clock-sm": {
          fontSize: "36px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.clock"),
          userSelect: "none"
        },

        // Custom Button
        ".custom-button-primary": {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "16px 24px",
          border: "2px solid",
          borderRadius: "8px",
          color: theme("colors.secondary"),
          borderColor: theme("colors.secondary"),
          backgroundColor: theme("colors.primary")
        },
        ".custom-button-secondary": {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "16px 24px",
          border: "2px solid",
          borderRadius: "8px",
          color: theme("colors.primary"),
          borderColor: theme("colors.primary"),
          backgroundColor: theme("colors.secondary")
        }
      });
    })
  ]
};
