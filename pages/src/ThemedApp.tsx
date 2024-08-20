import React, { ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import "./index.css";
import "@massalabs/react-ui-kit/src/global.css";

interface ThemedAppProps {
  theme: string;
  children: ReactNode;
}

const ThemedApp: React.FC<ThemedAppProps> = ({ theme, children }) => {
  return (
    <StrictMode>
      <div className={`theme-${theme} bg-secondary`}>
        {children}
      </div>
    </StrictMode>
  );
};

export function renderApp(theme: string, children: ReactNode) {
  createRoot(document.getElementById("root")!).render(
    <ThemedApp theme={theme}>
      {children}
    </ThemedApp>
  );
}