import { ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../index.css";


interface RootAppProps {
  children: ReactNode;
  theme?: string;
}



function RootApp({ children }: RootAppProps) {
  return (
    <StrictMode>  
      {children}
    </StrictMode>
  );
}

export function renderApp({ children }: RootAppProps) {
  createRoot(document.getElementById("root")!).render(
    <RootApp>{children}</RootApp>
  );
}
