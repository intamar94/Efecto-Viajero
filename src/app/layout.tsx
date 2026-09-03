import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DataProvider } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Efecto Viajero",
  description: "La plataforma que entiende al viajero y hace que todo el viaje encaje.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
