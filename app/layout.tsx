import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BunkSafe",
  description: "Track your attendance, manage subjects, and stay on top of your academic goals",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body 
        className="antialiased min-h-screen"
        style={{ 
          fontFamily: 'var(--font-space-grotesk), -apple-system, BlinkMacSystemFont, sans-serif',
          background: 'var(--background)',
          color: 'var(--foreground)'
        }}
      >
        <div className="min-h-screen">
          <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
