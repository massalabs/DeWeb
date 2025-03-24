import React, { ReactNode, StrictMode } from "react";

interface RootAppProps {
  children: ReactNode;
  theme?: string;
}

export function RootApp({ children }: RootAppProps) {
  return (
    <StrictMode>
      {children}
    </StrictMode>
  );
} 