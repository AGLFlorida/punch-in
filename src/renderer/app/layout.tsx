import '@/style.css';
import React from 'react';
import DevTPStub from '../components/DevTPStub';
import DevBadge from '../components/DevBadge';

export const metadata = { 
  title: 'Punch In',
  icon: [
    { url: '/favicon.ico', sizes: 'any' },   
    { url: '/favicon.png', type: 'image/png' },
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={
            `default-src 'self';
            script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''};
            style-src 'self' 'unsafe-inline';
            img-src 'self' data: blob:;
            font-src 'self' data:;
            connect-src 'self';
            frame-src 'none';
            object-src 'none';
            base-uri 'self';
            form-action 'self';`
          }
        />
      </head>
      <body>
        {children}
        {(process.env.DEV_UI_STUB === "1") &&
          <>
            <DevTPStub />
            <DevBadge />
          </> 
        }
      </body>
    </html>
  );
}
