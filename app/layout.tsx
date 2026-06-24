import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import React from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liga Copa do Mundo",
  description: "Acompanhamento oficial da liga Cartola da Copa do Mundo"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
