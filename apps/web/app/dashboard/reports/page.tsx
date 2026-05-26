'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'

interface ProfitLossData {
  totalIncome: number
  totalExpenses: number
  netProfit: number
}

interface BalanceSheetAsset {
  account: string
  balance: number
}

interface BalanceSheetData {
  assets: BalanceSheetAsset[]
  liabilities: BalanceSheetAsset[]
  equity: BalanceSheetAsset[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
}

interface CashFlowData {
  cashInflows: number
  cashOutflows: number
  netCashFlow: number
}

interface GstTdsData {
  gstOutput: number
  gstInput: number
  netGstPayable: number
  totalTds: number
}

export default function ReportsDashboardPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'pl' | 'bs' | 'cf' | 'tax'>('pl')

  // Date states (defaulting to current month range)
  const getStartOfMonth = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }

  const getEndOfMonth = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  }

  const [startDate, setStartDate] = useState(getStartOfMonth())
  const [endDate, setEndDate] = useState(getEndOfMonth())

  // Report states
  const [plReport, setPlReport] = useState<ProfitLossData | null>(null)
  const [bsReport, setBsReport] = useState<BalanceSheetData | null>(null)
  const [cfReport, setCfReport] = useState<CashFlowData | null>(null)
  const [taxReport, setTaxReport] = useState<GstTdsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Protected route check
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  const fetchReports = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      // 1. Fetch Profit & Loss
      const plRes = await fetch(
        `http://localhost:3001/api/reports/profit-loss?companyId=${activeCompany.id}&startDate=${startDate}&endDate=${endDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (plRes.ok) setPlReport(await plRes.json())

      // 2. Fetch Balance Sheet (as of endDate)
      const bsRes = await fetch(
        `http://localhost:3001/api/reports/balance-sheet?companyId=${activeCompany.id}&asOfDate=${endDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (bsRes.ok) setBsReport(await bsRes.json())

      // 3. Fetch Cash Flow
      const cfRes = await fetch(
        `http://localhost:3001/api/reports/cash-flow?companyId=${activeCompany.id}&startDate=${startDate}&endDate=${endDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (cfRes.ok) setCfReport(await cfRes.json())

      // 4. Fetch GST/TDS Summary
      const taxRes = await fetch(
        `http://localhost:3001/api/reports/gst-tds-summary?companyId=${activeCompany.id}&startDate=${startDate}&endDate=${endDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (taxRes.ok) setTaxReport(await taxRes.json())

    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [activeCompany, token, startDate, endDate])

  // Simple localized translations
  const trans = {
    title: language === 'hi' ? 'वित्तीय रिपोर्ट' : 'Financial Statements',
    subtitle: language === 'hi' ? 'अपनी कंपनी के पी एंड एल, तुलन पत्र और टैक्स देयताओं की समीक्षा करें' : 'Review P&L statements, balance sheets, and tax summaries',
    back: language === 'hi' ? 'डैशबोर्ड पर जाएँ' : 'Back to Dashboard',
    print: language === 'hi' ? 'रिपोर्ट प्रिंट करें' : 'Print Statement',
    dateStart: language === 'hi' ? 'आरंभ तिथि' : 'Start Date',
    dateEnd: language === 'hi' ? 'समाप्ति तिथि' : 'End Date',
    plTab: language === 'hi' ? 'लाभ और हानि (P&L)' : 'Profit & Loss (P&L)',
    bsTab: language === 'hi' ? 'तुलन पत्र (Balance Sheet)' : 'Balance Sheet',
    cfTab: language === 'hi' ? 'कैश फ्लो (Cash Flow)' : 'Cash Flow',
    taxTab: language === 'hi' ? 'टैक्स ऑडिट (GST/TDS)' : 'Tax Audit (GST/TDS)',
    
    // P&L
    revenue: language === 'hi' ? 'राजस्व (Revenues)' : 'Sales & Revenues',
    sales: language === 'hi' ? 'बिक्री से आय (Sales Revenue)' : 'Sales Revenue',
    expenses: language === 'hi' ? 'व्यावसायिक व्यय (Expenses)' : 'Operational Expenses',
    netProfit: language === 'hi' ? 'शुद्ध लाभ (Net Profit)' : 'Net Income / Profit',
    netLoss: language === 'hi' ? 'शुद्ध हानि (Net Loss)' : 'Net Outflow / Loss',
    
    // Balance Sheet
    assets: language === 'hi' ? 'संपत्तियां (Assets)' : 'Assets',
    liabilities: language === 'hi' ? 'देनदारियां (Liabilities)' : 'Liabilities',
    equity: language === 'hi' ? 'इक्विटी (Equity)' : 'Equity',
    totalAssets: language === 'hi' ? 'कुल संपत्तियां' : 'Total Assets',
    totalLiab: language === 'hi' ? 'कुल देनदारियां' : 'Total Liabilities',
    totalEq: language === 'hi' ? 'कुल इक्विटी' : 'Total Equity',
    totalLiabEq: language === 'hi' ? 'देनदारियां + इक्विटी' : 'Total Liabilities & Equity',
    
    // Cash flow
    inflows: language === 'hi' ? 'कैश इनफ्लो (Inflows)' : 'Operating Inflows',
    outflows: language === 'hi' ? 'कैश आउटफ्लो (Outflows)' : 'Operating Outflows',
    netCash: language === 'hi' ? 'शुद्ध कैश फ्लो (Net Cashflow)' : 'Net Period Cashflow',
    
    // GST/TDS
    gstOutput: language === 'hi' ? 'एकत्रित आउटपुट टैक्स (GST Output)' : 'GST Output Liability',
    gstInput: language === 'hi' ? 'क्लेम किया इनपुट टैक्स (GST Input)' : 'GST Input Credit Claim',
    gstPayable: language === 'hi' ? 'शुद्ध देय जीएसटी (GST Payable)' : 'Net GST Payable',
    tdsLiab: language === 'hi' ? 'कुल टीडीएस कटौती (TDS)' : 'Employee TDS Liability',
    gstInfo: language === 'hi' ? 'इनपुट जीएसटी को आउटपुट जीएसटी से घटाकर शुद्ध जीएसटी देयता निकाली गई है।' : 'Input tax credit subtracted from output liability yields net payable.'
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none print:hidden"></div>
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none print:hidden"></div>

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {trans.back}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{trans.title}</span>
          </div>

          <div className="flex gap-2">
            <Link 
              href="/dashboard/reports/gstr1"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg tracking-wide transition-all flex items-center gap-1"
            >
              📄 GSTR-1
            </Link>
            <Link 
              href="/dashboard/reports/gstr2b"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg tracking-wide transition-all flex items-center gap-1"
            >
              🔄 GSTR-2B Match
            </Link>
            <Link 
              href="/dashboard/reports/gstr3b"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg tracking-wide transition-all flex items-center gap-1"
            >
              📊 GSTR-3B
            </Link>
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-lg tracking-wide transition-all"
            >
              🖨️ {trans.print}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow print:py-0 print:px-0">
        
        {/* Date Selectors Ribbon */}
        <div className="p-6 mb-8 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl print:hidden flex flex-col md:flex-row gap-6 items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">{activeCompany?.name}</h2>
            <p className="text-xs text-slate-400 mt-1">{trans.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            {/* Start Date */}
            <div className="flex flex-col gap-1">
              <span className="text-slate-500">{trans.dateStart}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1">
              <span className="text-slate-500">{trans.dateEnd}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tab Selectors */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-900 rounded-xl mb-8 print:hidden">
          <button
            onClick={() => setActiveTab('pl')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
              activeTab === 'pl' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {trans.plTab}
          </button>
          <button
            onClick={() => setActiveTab('bs')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
              activeTab === 'bs' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {trans.bsTab}
          </button>
          <button
            onClick={() => setActiveTab('cf')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
              activeTab === 'cf' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {trans.cfTab}
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
              activeTab === 'tax' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {trans.taxTab}
          </button>
        </div>

        {/* Report Display Sheets */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl print:bg-white print:text-slate-900 print:border-0 print:p-0 print:shadow-none">
          {loading ? (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-sm">Calculating reports...</span>
            </div>
          ) : (
            <React.Fragment>
              {/* Header inside printing sheets */}
              <div className="hidden print:flex flex-col items-start pb-6 border-b border-slate-300 mb-8">
                <h1 className="text-2xl font-black text-slate-900 uppercase">
                  {activeTab === 'pl' ? trans.plTab : activeTab === 'bs' ? trans.bsTab : activeTab === 'cf' ? trans.cfTab : trans.taxTab}
                </h1>
                <p className="text-sm text-slate-600 font-bold mt-1">{activeCompany?.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </p>
              </div>

              {/* 1. PROFIT & LOSS */}
              {activeTab === 'pl' && plReport && (
                <div className="space-y-8 font-semibold text-sm">
                  {/* Revenue Segment */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider print:text-blue-600 pb-2 border-b border-slate-800 print:border-slate-200">
                      {trans.revenue}
                    </h3>
                    <div className="flex items-center justify-between text-slate-300 print:text-slate-800">
                      <span>{trans.sales}</span>
                      <span>₹{plReport.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Expenses Segment */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider print:text-indigo-600 pb-2 border-b border-slate-800 print:border-slate-200">
                      {trans.expenses}
                    </h3>
                    <div className="flex items-center justify-between text-slate-300 print:text-slate-800">
                      <span>General Operating Expenses</span>
                      <span>₹{plReport.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Bottom Line */}
                  <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-lg font-black">
                    <span className="text-white print:text-slate-900">{plReport.netProfit >= 0 ? trans.netProfit : trans.netLoss}</span>
                    <span className={plReport.netProfit >= 0 ? 'text-emerald-400 print:text-emerald-600' : 'text-red-400 print:text-red-600'}>
                      ₹{plReport.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. BALANCE SHEET */}
              {activeTab === 'bs' && bsReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm font-semibold divide-x-0 md:divide-x divide-slate-800 print:divide-slate-200">
                  {/* Left Column: Assets */}
                  <div className="space-y-6 pr-0 md:pr-6">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider print:text-blue-600 pb-2 border-b border-slate-800 print:border-slate-200">
                      {trans.assets}
                    </h3>
                    <div className="space-y-3">
                      {bsReport.assets.map((asset, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-300 print:text-slate-800">
                          <span>{asset.account}</span>
                          <span>₹{asset.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-slate-800/80 print:border-slate-200 flex items-center justify-between font-black text-white print:text-slate-900">
                      <span>{trans.totalAssets}</span>
                      <span>₹{bsReport.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Right Column: Liabilities & Equity */}
                  <div className="space-y-8 pl-0 md:pl-6 pt-8 md:pt-0">
                    {/* Liabilities */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider print:text-red-600 pb-2 border-b border-slate-800 print:border-slate-200">
                        {trans.liabilities}
                      </h3>
                      <div className="space-y-3">
                        {bsReport.liabilities.map((liab, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-300 print:text-slate-800">
                            <span>{liab.account}</span>
                            <span>₹{liab.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-slate-800/80 print:border-slate-200 flex items-center justify-between font-black text-white print:text-slate-900">
                        <span>{trans.totalLiab}</span>
                        <span>₹{bsReport.totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider print:text-indigo-600 pb-2 border-b border-slate-800 print:border-slate-200">
                        {trans.equity}
                      </h3>
                      <div className="space-y-3">
                        {bsReport.equity.map((eq, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-300 print:text-slate-800">
                            <span>{eq.account}</span>
                            <span>₹{eq.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-slate-800/80 print:border-slate-200 flex items-center justify-between font-black text-white print:text-slate-900">
                        <span>{trans.totalEq}</span>
                        <span>₹{bsReport.totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Total Liab & Equity check */}
                    <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-base font-black text-white print:text-slate-900">
                      <span>{trans.totalLiabEq}</span>
                      <span>₹{(bsReport.totalLiabilities + bsReport.totalEquity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. CASH FLOW */}
              {activeTab === 'cf' && cfReport && (
                <div className="space-y-8 font-semibold text-sm">
                  {/* Inflows */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider print:text-emerald-600 pb-2 border-b border-slate-800 print:border-slate-200">
                      {trans.inflows}
                    </h3>
                    <div className="flex items-center justify-between text-slate-300 print:text-slate-800">
                      <span>Operational Inflows (Revenues)</span>
                      <span>₹{cfReport.cashInflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Outflows */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider print:text-red-600 pb-2 border-b border-slate-800 print:border-slate-200">
                      {trans.outflows}
                    </h3>
                    <div className="flex items-center justify-between text-slate-300 print:text-slate-800">
                      <span>Operational Outflows (Expenses)</span>
                      <span>₹{cfReport.cashOutflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Net Cash */}
                  <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-lg font-black">
                    <span className="text-white print:text-slate-900">{trans.netCash}</span>
                    <span className={cfReport.netCashFlow >= 0 ? 'text-emerald-400 print:text-emerald-600' : 'text-red-400 print:text-red-600'}>
                      ₹{cfReport.netCashFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* 4. TAX AUDIT (GST/TDS) */}
              {activeTab === 'tax' && taxReport && (
                <div className="space-y-8 font-semibold text-sm">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider print:text-indigo-600 pb-2 border-b border-slate-800 print:border-slate-200">
                      Indian Compliance Output vs Input Credits
                    </h3>
                    {/* GST Output */}
                    <div className="flex items-center justify-between text-slate-300 print:text-slate-800">
                      <span>{trans.gstOutput}</span>
                      <span>₹{taxReport.gstOutput.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* GST Input */}
                    <div className="flex items-center justify-between text-slate-300 print:text-slate-800">
                      <span>{trans.gstInput}</span>
                      <span>₹{taxReport.gstInput.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* TDS deductions */}
                    <div className="flex items-center justify-between text-slate-300 print:text-slate-800 pt-2">
                      <span>{trans.tdsLiab}</span>
                      <span className="font-bold text-slate-200 print:text-slate-800">₹{taxReport.totalTds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Net GST Payable */}
                  <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-[11px] text-slate-500 max-w-sm">
                      <strong>Tax Audit Info:</strong> {trans.gstInfo}
                    </div>

                    <div className="text-right flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{trans.gstPayable}</span>
                      <h2 className="text-2xl font-black text-emerald-400 print:text-emerald-600">
                        ₹{taxReport.netGstPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </h2>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-8 print:hidden">
        <p>&copy; {new Date().getFullYear()} FinNbiz. Indian tax credit & financial analytics auditor.</p>
      </footer>

      {/* Dynamic Printing CSS */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: #0f172a !important;
          }
          header, footer, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
