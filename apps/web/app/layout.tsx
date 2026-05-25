import type { Metadata } from 'next'
import { AuthProvider } from './hooks/useAuth'
import { I18nProvider } from './hooks/useI18n'
import { OfflineSyncProvider } from './hooks/useOfflineSync'
import NetworkStatusIndicator from './components/NetworkStatusIndicator'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinNbiz - Accounting & Business Management',
  description: 'GST-compliant accounting and business management for Indian SMBs',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="antialiased">
        <I18nProvider>
          <AuthProvider>
            <OfflineSyncProvider>
              {children}
              <NetworkStatusIndicator />
            </OfflineSyncProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
