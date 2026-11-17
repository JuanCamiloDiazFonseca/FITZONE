import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FITZONE",
  description: "Sistema web de gesti\u00f3n y control para un gimnasio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
