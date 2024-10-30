/** @type {import('tailwindcss').Config} */
import plugin from "tailwindcss/plugin";
import { colors } from "./colors";

 
const { createThemes } = require("tw-colors");

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      plex: ["IBM Plex Mono", "monospace"],
      clock: ["E1234", "sans-serif"],
    },
  },
  plugins: [
    createThemes({
      neon_green_forest: {
        primary: colors.greenNeon,
        secondary: colors.darkForestGreen,
      },
      bright_blue_navy: {
        primary: colors.blueBright,
        secondary: colors.deepNavyBlue,
      },
      sunny_magenta: {
        primary: colors.yellowBright,
        secondary: colors.magentaBright,
      },
      magenta_sunny: {
        primary: colors.magentaBright,
        secondary: colors.yellowBright,
      },
      olive_sunshine: {
        primary: colors.darkOliveGreen,
        secondary: colors.yellowBright,
      },
      magenta_midnight: {
        primary: colors.magentaBright,
        secondary: colors.darkPurple,
      },
      red_cyan: {
        primary: colors.redBright,
        secondary: colors.cyanBright,
      },
      cyan_red: {
        primary: colors.cyanBright,
        secondary: colors.redBright,
      },
      maroon_red: {
        primary: colors.darkMaroon,
        secondary: colors.redBright,
      },
      teal_cyan: {
        primary: colors.darkTeal,
        secondary: colors.cyanBright,
      },
      sunset_purple: {
        primary: colors.orangeBright,
        secondary: colors.purpleRoyal,
      },
      purple_sunset: {
        primary: colors.purpleRoyal,
        secondary: colors.orangeBright,
      },
      brown_sunset: {
        primary: colors.darkBrown,
        secondary: colors.orangeBright,
      },
      midnight_purple: {
        primary: colors.midnightBlue,
        secondary: colors.purpleRoyal,
      },
      charcoal_neon_pink: {
        primary: colors.charcoal,
        secondary: colors.pinkNeon,
      },
      neon_pink_charcoal: {
        primary: colors.pinkNeon,
        secondary: colors.charcoal,
      },
      plum_neon_pink: {
        primary: colors.plum,
        secondary: colors.pinkNeon,
      },
      pastel_neon_pink: {
        primary: colors.pastelPink,
        secondary: colors.pinkNeon,
      },
      light_gray_blue: {
        primary: colors.CelestialMist,
        secondary: colors.DeepBlue,
      },
      deep_blue_gray: {
        primary: colors.DeepBlue,
        secondary: colors.CelestialMist,
      },
    }),
    plugin(function ({ addComponents, theme }) {
      addComponents({
        ".paragraph-lg": {
          fontSize: "30px",
          fontWeight: "400",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "42px",
          fontStyle: "normal",
          userSelect: "none",
        },
        ".paragraph-light-lg": {
          fontSize: "28px",
          fontWeight: "200",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "42px",
          fontStyle: "normal",
          userSelect: "none",
        },
        ".paragraph-italic-lg": {
          fontSize: "30px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "42px",
          fontStyle: "italic",
          userSelect: "none",
        },
        ".paragraph-italic-light-lg": {
          fontSize: "30px",
          fontWeight: "300",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "42px",
          fontStyle: "italic",
          userSelect: "none",
        },
        ".title-lg": {
          fontSize: "46px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "62px",
          fontStyle: "semi-bold",
          userSelect: "none",
        },

        // medium
        ".paragraph-md": {
          fontSize: "24px",
          fontWeight: "400",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "36px",
          fontStyle: "normal",
          userSelect: "none",
        },
        ".paragraph-light-md": {
          fontSize: "22px",
          fontWeight: "200",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "36px",
          fontStyle: "normal",
          userSelect: "none",
        },
        ".paragraph-italic-md": {
          fontSize: "24px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "36px",
          fontStyle: "italic",
          userSelect: "none",
        },
        ".paragraph-italic-light-md": {
          fontSize: "24px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "36px",
          fontStyle: "italic",
          userSelect: "none",
        },
        ".title-md": {
          fontSize: "36px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "52px",
          fontStyle: "semi-bold",
          userSelect: "none",
        },
        // mobile
        ".paragraph-sm": {
          fontSize: "16px",
          fontWeight: "400",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "32px",
          fontStyle: "normal",
          userSelect: "none",
        },
        ".paragraph-light-sm": {
          fontSize: "14px",
          fontWeight: "200",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "32px",
          fontStyle: "normal",
          userSelect: "none",
        },
        ".paragraph-italic-sm": {
          fontSize: "16px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "32px",
          fontStyle: "italic",
          userSelect: "none",
        },
        ".paragraph-italic-light-sm": {
          fontSize: "16px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "32px",
          fontStyle: "italic",
          userSelect: "none",
        },
        ".title-sm": {
          fontSize: "28px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.plex"),
          lineHeight: "46px",
          fontStyle: "semi-bold",
          userSelect: "none",
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
          overflowY: "scroll",
        },

        ".pan-action": {
          touchAction: "pan-x",
        },

        // Clock
        ".clock-lg": {
          fontSize: "60px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.clock"),
          userSelect: "none",
        },
        ".clock-md": {
          fontSize: "48px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.clock"),
          userSelect: "none",
        },
        ".clock-sm": {
          fontSize: "36px",
          fontWeight: "500",
          fontFamily: theme("fontFamily.clock"),
          userSelect: "none",
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
          backgroundColor: theme("colors.primary"),
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
          backgroundColor: theme("colors.secondary"),
        },
      });
    }),
  ],
};
