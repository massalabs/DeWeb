import React, { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { RootApp } from "../components/RootApp";

import "../index.css";


interface RootAppProps {
  children: ReactNode;
  theme?: string;
}

export function renderApp({ children }: RootAppProps) {
  createRoot(document.getElementById("root")!).render(
    <RootApp>{children}</RootApp>
  );
}
