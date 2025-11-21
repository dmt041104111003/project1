import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

export const metadata: Metadata = {
  title: "Marketplace2vn",
  description: "Nền tảng freelancer phi tập trung",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Gluten:wght@100..900&subset=vietnamese,latin&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased relative">
        <WalletProvider>
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="w-full h-full" style={{ backgroundImage: `url('/images/landing/logo_full.png')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left center', backgroundSize: '80vh', backgroundAttachment: 'fixed', opacity: 0.05 }} />
          </div>
          <div className="relative min-h-screen">{children}</div>
          <Toaster />
          <SonnerToaster position="bottom-right" richColors />
        </WalletProvider>
      </body>
    </html>
  );
}