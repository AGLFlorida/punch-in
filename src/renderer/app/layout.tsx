import '@/style.css';
import React from 'react';
import DevTPStub from '../components/DevTPStub';
import DevBadge from '../components/DevBadge';
import Sidebar from '../components/Sidebar';
import { NavigationGuardProvider } from '../components/NavigationGuard';

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
            // Note: 'unsafe-eval' is required for React Fast Refresh in development.
            // This will trigger an Electron security warning in dev, but it's expected
            // and the warning will not appear in packaged builds (production CSP excludes it).
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
        <NavigationGuardProvider>
          <Sidebar>
            {children}
          </Sidebar>
          {(process.env.DEV_UI_STUB === "1") &&
            <>
              <DevTPStub />
              <DevBadge />
            </> 
          }
        </NavigationGuardProvider>
      </body>
    </html>
  );
}
