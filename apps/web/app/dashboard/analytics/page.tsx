'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'

export default function AnalyticsPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'overview' | 'pl' | 'bs' | 'cash'>('overview')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [topExpenses, setTopExpenses] = useState<any[]>([])

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchAnalytics()
    }
  }, [activeCompany, token])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // 1. Fetch Dashboard Summary
      const resSummary = await fetch(`${API_BASE_URL}/reports/dashboard-summary?companyId=${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (resSummary.ok) {
        setSummary(await resSummary.json())
      }

      // 2. Fetch Top Expenses for AI Trends
      const resTop = await fetch(`${API_BASE_URL}/reports/top-expenses?companyId=${activeCompany?.id}&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (resTop.ok) {
        setTopExpenses(await resTop.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Helper to safely display currency
  const fmt = (val: number) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // For the bar chart scaling
  const maxExpense = Math.max(...topExpenses.map(e => e.amount), 1)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>

      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; Back
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{t('analytics.title')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white">{t('analytics.title')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('analytics.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl mb-8 w-max border border-slate-800">
          {[
            { id: 'overview', label: t('analytics.tab_overview') },
            { id: 'pl', label: t('analytics.tab_pl') },
            { id: 'bs', label: t('analytics.tab_bs') },
            { id: 'cash', label: t('analytics.tab_cash') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse">Running Financial Analysis...</div>
        ) : summary ? (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
                    <span className="text-xs text-slate-500 font-semibold uppercase">{t('analytics.income')} (MTD)</span>
                    <h3 className="text-3xl font-black text-emerald-400 mt-2">{fmt(summary.currentMonth.income)}</h3>
                  </div>
                  <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
                    <span className="text-xs text-slate-500 font-semibold uppercase">{t('analytics.expense')} (MTD)</span>
                    <h3 className="text-3xl font-black text-rose-400 mt-2">{fmt(summary.currentMonth.expenses)}</h3>
                  </div>
                  <div className="p-6 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl backdrop-blur-xl">
                    <span className="text-xs text-indigo-400/80 font-semibold uppercase">{t('analytics.profit')}</span>
                    <h3 className="text-3xl font-black text-white mt-2">{fmt(summary.currentMonth.netProfit)}</h3>
                  </div>
                </div>

                {/* AI Expense Trends Chart */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">✨</div>
                    <h3 className="text-lg font-bold text-white">{t('analytics.ai_insights')}</h3>
                  </div>

                  {topExpenses.length === 0 ? (
                    <p className="text-sm text-slate-500">No expense data available to generate AI insights.</p>
                  ) : (
                    <div className="space-y-4">
                      {topExpenses.map((exp, idx) => {
                        const pct = Math.max((exp.amount / maxExpense) * 100, 2)
                        return (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-32 text-sm text-slate-400 truncate">{exp.category}</div>
                            <div className="flex-grow bg-slate-800 rounded-full h-4 overflow-hidden relative">
                              <div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <div className="w-24 text-right text-sm font-bold text-slate-200">{fmt(exp.amount)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <p className="text-sm text-indigo-200">
                      <strong>AI Tip:</strong> Based on current trends, <span className="text-indigo-400 font-bold">{topExpenses[0]?.category || 'your top category'}</span> is your highest outflow. Consider negotiating vendor contracts to optimize cash flow this quarter.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* P&L TAB */}
            {activeTab === 'pl' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl max-w-4xl">
                <div className="text-center mb-8 border-b border-slate-800 pb-8">
                  <h3 className="text-2xl font-black text-white">Profit & Loss Statement</h3>
                  <p className="text-sm text-slate-400">Year to Date Summary</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-3 border-b border-slate-800 font-bold text-slate-300">
                    <span>Operating Income</span>
                    <span className="text-emerald-400">{fmt(summary.yearToDate.income)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-800 font-bold text-slate-300">
                    <span>Operating Expenses</span>
                    <span className="text-rose-400">{fmt(summary.yearToDate.expenses)}</span>
                  </div>
                  <div className="flex justify-between py-4 mt-4 bg-indigo-900/30 rounded-lg px-4 font-black text-lg text-white">
                    <span>Net Profit Before Tax</span>
                    <span>{fmt(summary.yearToDate.netProfit)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* BALANCE SHEET TAB */}
            {activeTab === 'bs' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl max-w-4xl">
                <div className="text-center mb-8 border-b border-slate-800 pb-8">
                  <h3 className="text-2xl font-black text-white">Balance Sheet</h3>
                  <p className="text-sm text-slate-400">As of {new Date().toLocaleDateString()}</p>
                </div>
                
                <div className="space-y-6 text-sm">
                  <div>
                    <h4 className="font-black text-slate-200 mb-2 border-b border-slate-800 pb-2">Assets</h4>
                    <div className="flex justify-between py-2 text-slate-400">
                      <span>Total Current & Fixed Assets</span>
                      <span>{fmt(summary.balanceSheet.totalAssets)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-200 mb-2 border-b border-slate-800 pb-2">Liabilities</h4>
                    <div className="flex justify-between py-2 text-slate-400">
                      <span>Total Liabilities</span>
                      <span>{fmt(summary.balanceSheet.totalLiabilities)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-4 mt-4 bg-teal-900/30 rounded-lg px-4 font-black text-lg text-teal-400">
                    <span>Total Equity (Net Worth)</span>
                    <span>{fmt(summary.balanceSheet.totalEquity)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* CASH FLOW TAB */}
            {activeTab === 'cash' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl max-w-4xl text-center">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-white">Net Cash Flow (MTD)</h3>
                <p className="text-sm text-slate-400 mt-2">Cash Generated from Operating Activities</p>
                <div className="mt-8 text-5xl font-black text-white">
                  {fmt(summary.currentMonth.cashFlow)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-red-400">Failed to load reports. Check API connection.</div>
        )}
      </main>
    </div>
  )
}
