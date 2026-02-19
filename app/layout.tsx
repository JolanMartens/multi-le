import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider"; // 1. Import it

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Multi-le",
  description: "Speedrun Wordle with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 2. Wrap children with the provider */}
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
