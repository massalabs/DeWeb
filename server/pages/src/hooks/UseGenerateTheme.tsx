import { useEffect, useState } from "react";
import { DEFAULT_THEME } from "../utils/consts";
import { themeNames } from "../colors/colors";

export function UseGenerateTheme() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  function generateRandomTheme() {
    const theme = themeNames[Math.floor(Math.random() * themeNames.length)];
    setTheme(theme);
  }

  useEffect(() => {
    generateRandomTheme();
  }, []);

  return theme;
}
