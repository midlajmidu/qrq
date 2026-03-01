import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { config } from "@/lib/config";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: config.appName,
  description: "Real-time Queue Management SaaS for clinics and service counters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
