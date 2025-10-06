import '@/style.css';
import React from 'react';

export const metadata = { title: 'Time Punch' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="
            default-src 'self';
            script-src 'self' 'unsafe-inline';
            style-src 'self' 'unsafe-inline';
            img-src 'self' data: blob:;
            font-src 'self' data:;
            connect-src 'self';
            frame-src 'none';
            object-src 'none';
            base-uri 'self';
            form-action 'self';
          "
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
