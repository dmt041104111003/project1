import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { Toaster } from "@/components/ui/toaster";
import AuthSessionProvider from "../components/providers/SessionProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Marketplace2vn",
  description: "Nền tảng freelancer phi tập trung",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}>
        <AuthSessionProvider>
          <WalletProvider>
              <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="w-full h-full" style={{ backgroundImage: `url('/images/landing/logo_full.png')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left center', backgroundSize: '80vh', backgroundAttachment: 'fixed', opacity: 0.05 }} />
              </div>
              <div className="relative min-h-screen">{children}</div>
              <Toaster />
          </WalletProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}