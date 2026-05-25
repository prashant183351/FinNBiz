'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '../../hooks/useI18n'

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { language } = useI18n()

  const tabs = [
    { name: language === 'hi' ? 'वेंडर्स' : 'Vendors', href: '/dashboard/purchases/vendors', icon: '🏢' },
    { name: language === 'hi' ? 'परचेस बिल' : 'Purchase Bills', href: '/dashboard/purchases/bills', icon: '🧾' },
    { name: language === 'hi' ? 'TDS डैशबोर्ड' : 'TDS Dashboard', href: '/dashboard/purchases/tds', icon: '🛡️' }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-white tracking-tight">
              {language === 'hi' ? 'परचेस और TDS' : 'Purchases & TDS'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    isActive 
                      ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-900/20' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.name}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          {children}
        </div>
      </main>
    </div>
  )
}
