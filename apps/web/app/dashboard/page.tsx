'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'

export default function DashboardPage() {
  const { user, token, activeCompany, logout } = useAuth()
  const { t, language, setLanguage } = useI18n()
  const router = useRouter()

  // Guard dashboard page
  useEffect(() => {
    const savedToken = localStorage.getItem('finnbiz_token')
    if (!token && !savedToken) {
      router.push('/login')
    }
  }, [token, router])

  // Redirect to company setup if no active company found
  useEffect(() => {
    const savedActiveCompany = localStorage.getItem('finnbiz_active_company')
    if (user && !activeCompany && !savedActiveCompany) {
      router.push('/company-setup')
    }
  }, [user, activeCompany, router])

  if (!user || !activeCompany) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans flex flex-col">
      {/* Dynamic Background Blurs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-900/5 blur-[100px] pointer-events-none"></div>

      {/* Premium Navigation Header */}
      <header className="border-b border-slate-900 bg-black/80 backdrop-blur-md sticky top-0 z-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-black text-white">
              {t('brand.name')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switch */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-full p-0.5">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 ${
                  language === 'en'
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 ${
                  language === 'hi'
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 text-slate-300 hover:text-white rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              <span>{t('dash.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {t('dash.welcome')} {user.name || user.email}!
          </h1>
          <p className="text-sm text-slate-400 mt-1">{t('brand.tagline')}</p>
        </div>

        {/* Company Overview Card */}
        <div className="p-6 mb-8 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-extrabold tracking-wider uppercase">
                {t('dash.company')}
              </span>
              <h2 className="text-2xl font-bold text-white mt-2">{activeCompany.name}</h2>
              {activeCompany.address && (
                <p className="text-xs text-slate-400 mt-1">{activeCompany.address}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              {activeCompany.gstin && (
                <div className="px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">GSTIN</span>
                  <span className="text-slate-200">{activeCompany.gstin}</span>
                </div>
              )}
              {activeCompany.pan && (
                <div className="px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">PAN</span>
                  <span className="text-slate-200">{activeCompany.pan}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration/Additional Modules Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link 
            href="/dashboard/reports" 
            className="group p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.2)] hover:border-brand-500/40"
          >
            <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">📊</div>
            <h3 className="text-lg font-bold text-white mb-2">GST & Reports</h3>
            <p className="text-sm text-slate-400 font-medium">GSTR-1, GSTR-3B, P&L.</p>
          </Link>

          <Link 
            href="/dashboard/purchases/vendors" 
            className="group p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.2)] hover:border-brand-500/40"
          >
            <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">🏢</div>
            <h3 className="text-lg font-bold text-white mb-2">Purchases & TDS</h3>
            <p className="text-sm text-slate-400 font-medium">Vendors, Bills & TDS.</p>
          </Link>

          <Link 
            href="/dashboard/settings/profile" 
            className="group p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.2)] hover:border-brand-500/40"
          >
            <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">⚙️</div>
            <h3 className="text-lg font-bold text-white mb-2">Settings & Access</h3>
            <p className="text-sm text-slate-400 font-medium">Company, Users, Audit logs.</p>
          </Link>
        </div>

        {/* Quick Action Navigation Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight text-white">{t('dash.quick_actions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dynamic Banner Card */}
            <div className="md:col-span-1 p-6 bg-gradient-to-br from-brand-900/40 to-black border border-brand-500/20 rounded-3xl flex flex-col justify-between relative overflow-hidden shadow-[0_0_40px_-10px_rgba(141,198,63,0.15)] group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32 text-brand-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
              </div>
              <div>
                <span className="px-3 py-1 bg-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-500/30">Business Health</span>
                <h2 className="text-2xl font-black text-white mt-4 leading-tight">Your business is growing steadily!</h2>
                <p className="text-sm text-brand-100/70 mt-2">Generate this month's reports to file your GST returns on time.</p>
              </div>
              <button 
                onClick={() => router.push('/dashboard/reports')}
                className="mt-6 w-max px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-black text-sm font-extrabold rounded-xl shadow-[0_0_20px_-5px_rgba(141,198,63,0.5)] transition-all flex items-center gap-2"
              >
                {t('dash.view_reports')} &rarr;
              </button>
            </div>

            {/* Invoices Card */}
            <div 
              onClick={() => router.push('/dashboard/invoices')}
              className="p-6 bg-slate-900/30 border border-slate-800 hover:border-brand-500/40 rounded-2xl group transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-white mt-4">{t('dash.view_invoices')}</h4>
                <p className="text-xs text-slate-400 mt-1">Manage, design and track GST compliant client invoices.</p>
              </div>
              <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 mt-6 inline-flex items-center gap-1">
                Go to Invoices &rarr;
              </span>
            </div>

            {/* Expenses Card */}
            <div 
              onClick={() => router.push('/dashboard/expenses')}
              className="p-6 bg-slate-900/30 border border-slate-800 hover:border-brand-500/40 rounded-2xl group transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h.007v.008H3.75V4.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3 15h.008v.008H3V15Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-white mt-4">{t('dash.view_expenses')}</h4>
                <p className="text-xs text-slate-400 mt-1">Log business expenses, upload statements, and run AI categorization.</p>
              </div>
              <span className="text-xs font-semibold text-brand-400 group-hover:text-brand-300 mt-6 inline-flex items-center gap-1">
                Go to Expenses &rarr;
              </span>
            </div>

            {/* Inventory Card */}
            <div 
              onClick={() => router.push('/dashboard/inventory')}
              className="p-6 bg-slate-900/30 border border-slate-800 hover:border-brand-500/40 rounded-2xl group transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-white mt-4">{t('dash.view_inventory')}</h4>
                <p className="text-xs text-slate-400 mt-1">Track stock levels, monitor low-stock alerts, and manage supplier purchase orders.</p>
              </div>
              <span className="text-xs font-semibold text-brand-400 group-hover:text-brand-300 mt-6 inline-flex items-center gap-1">
                Go to Inventory &rarr;
              </span>
            </div>

            {/* UPI Card */}
            <div 
              onClick={() => router.push('/dashboard/upi')}
              className="p-6 bg-slate-900/30 border border-slate-800 hover:border-brand-500/40 rounded-2xl group transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-white mt-4">{t('dash.view_upi')}</h4>
                <p className="text-xs text-slate-400 mt-1">Configure UPI merchant codes, generate dynamic QR codes, and simulate instant payment notifications.</p>
              </div>
              <span className="text-xs font-semibold text-brand-400 group-hover:text-brand-300 mt-6 inline-flex items-center gap-1">
                Go to UPI Payments &rarr;
              </span>
            </div>

            {/* Journal Voucher Card */}
            <div 
              onClick={() => router.push('/dashboard/journal')}
              className="p-6 bg-slate-900/30 border border-slate-800 hover:border-brand-500/40 rounded-2xl group transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-white mt-4">{t('dash.view_journal')}</h4>
                <p className="text-xs text-slate-400 mt-1">Log manual double-entry adjustments, depreciation parameters, and non-cash settlements.</p>
              </div>
              <span className="text-xs font-semibold text-brand-400 group-hover:text-brand-300 mt-6 inline-flex items-center gap-1">
                Go to Journal Book &rarr;
              </span>
            </div>

            {/* HR & Payroll Card */}
            <div 
              onClick={() => router.push('/dashboard/hr')}
              className="p-6 bg-slate-900/30 border border-slate-800 hover:border-brand-500/40 rounded-2xl group transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(141,198,63,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-white mt-4">{t('dash.view_hr')}</h4>
                <p className="text-xs text-slate-400 mt-1">Manage employee directory, calculate salaries, process payrolls, and track TDS/PF/ESI compliances.</p>
              </div>
              <span className="text-xs font-semibold text-brand-400 group-hover:text-brand-300 mt-6 inline-flex items-center gap-1">
                Go to HR & Payroll &rarr;
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} FinNbiz. All rights reserved. Indian compliance & automated tax engine.</p>
      </footer>
    </div>
  )
}
