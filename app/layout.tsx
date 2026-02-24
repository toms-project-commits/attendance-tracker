import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BunkSafe",
  description: "Track your attendance, manage subjects, and stay on top of your academic goals",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover', // Enable safe-area-inset support for notched devices
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Load Space Grotesk font via Google Fonts CDN for static export compatibility */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body 
        className="antialiased min-h-screen safe-area-padding"
        style={{ 
          fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
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
