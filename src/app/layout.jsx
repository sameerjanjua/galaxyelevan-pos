import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Providers from "./Providers";
import "../assets/css/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "POS Shop",
  description: "Point of Sale System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        cz-shortcut-listen="true"
      >
        <Providers>
          {children}
        </Providers>
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}

