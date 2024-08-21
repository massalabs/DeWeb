import React, { ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "@massalabs/react-ui-kit/src/global.css";

interface RootAppProps {
  children: ReactNode;
  theme?: string;
}

const RootApp: React.FC<RootAppProps> = ({ theme = "light", children }) => {
  return (
    <StrictMode>
      <div className={`theme-${theme} bg-secondary`}>{children}</div>
    </StrictMode>
  );
};

export function renderApp({ theme = "light", children }: RootAppProps) {
  createRoot(document.getElementById("root")!).render(
    <RootApp theme={theme}>{children}</RootApp>
  );
}
