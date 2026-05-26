'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerGSTIN: string | null
  subtotal: number
  totalGST: number
  totalAmount: number
  status: 'draft' | 'finalized' | 'paid'
  createdAt: string
}

export default function InvoicesListPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const { syncFetch } = useOfflineSync()
  const router = useRouter()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchInvoices = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const res = await syncFetch(`http://localhost:3001/api/invoices?companyId=${activeCompany.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setInvoices(data)
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [activeCompany, token])

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchInvoices()
    }
    window.addEventListener('finnbiz_sync_complete', handleSyncComplete)
    return () => {
      window.removeEventListener('finnbiz_sync_complete', handleSyncComplete)
    }
  }, [activeCompany, token])

  // Dynamic Translations
  const trans = {
    title: language === 'hi' ? 'इनवॉइस प्रबंधन' : 'Invoices & Billing',
    subtitle: language === 'hi' ? 'अपनी कंपनी के इनवॉइस और जीएसटी देयताओं को ट्रैक करें' : 'Track and manage your company invoices and GST payable',
    newBtn: language === 'hi' ? 'नया इनवॉइस बनाएँ' : 'Create Invoice',
    searchPl: language === 'hi' ? 'ग्राहक का नाम खोजें...' : 'Search by customer name...',
    allStatus: language === 'hi' ? 'सभी स्थितियाँ' : 'All Statuses',
    draft: language === 'hi' ? 'ड्राफ्ट' : 'Draft',
    finalized: language === 'hi' ? 'सत्यापित' : 'Finalized',
    paid: language === 'hi' ? 'भुगतान किया' : 'Paid',
    totalBilled: language === 'hi' ? 'कुल बिल राशि' : 'Total Outstanding',
    totalGST: language === 'hi' ? 'एकत्रित जीएसटी' : 'GST Payable',
    totalDrafts: language === 'hi' ? 'ड्राफ्ट इनवॉइस' : 'Draft Bills',
    noInvoices: language === 'hi' ? 'कोई इनवॉइस नहीं मिला। नया बनाएँ!' : 'No invoices found. Create one now!',
    tableNum: language === 'hi' ? 'इनवॉइस नंबर' : 'Invoice No.',
    tableCust: language === 'hi' ? 'ग्राहक' : 'Customer',
    tableDate: language === 'hi' ? 'तारीख' : 'Date',
    tableTotal: language === 'hi' ? 'कुल राशि' : 'Total Amount',
    tableStatus: language === 'hi' ? 'स्थिति' : 'Status',
    tableActions: language === 'hi' ? 'कार्रवाई' : 'Actions',
    view: language === 'hi' ? 'देखें' : 'View'
  }

  // Analytics compilations
  const totalBilledVal = invoices
    .filter(inv => inv.status !== 'draft')
    .reduce((sum, inv) => sum + inv.totalAmount, 0)

  const totalGSTVal = invoices
    .filter(inv => inv.status !== 'draft')
    .reduce((sum, inv) => sum + inv.totalGST, 0)

  const draftCount = invoices.filter(inv => inv.status === 'draft').length

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      {/* Nav Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {language === 'hi' ? 'डैशबोर्ड पर जाएँ' : 'Back to Dashboard'}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{trans.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/invoices/reminders"
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-lg tracking-wide transition-all flex items-center gap-1.5"
            >
              💰 {language === 'hi' ? 'उधारी और कलेक्शन' : 'Outstanding Ledger'}
            </Link>
            <Link
              href="/dashboard/invoices/new"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
            >
              + {trans.newBtn}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow">
        {/* Ribbon Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{trans.totalBilled}</span>
              <h3 className="text-2xl font-black text-white mt-1">₹{totalBilledVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-1.958-.659-1.071-.805-1.071-2.107 0-2.912 1.172-.879 3.07-.879 4.242 0 .284.213.504.47.659.753M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{trans.totalGST}</span>
              <h3 className="text-2xl font-black text-white mt-1">₹{totalGSTVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{trans.totalDrafts}</span>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{draftCount}</h3>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filters and Table Area */}
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/80 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={trans.searchPl}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
              />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {trans.allStatus}
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                  statusFilter === 'draft' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {trans.draft}
              </button>
              <button
                onClick={() => setStatusFilter('finalized')}
                className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                  statusFilter === 'finalized' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {trans.finalized}
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                  statusFilter === 'paid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {trans.paid}
              </button>
            </div>
          </div>

          {/* Invoices List Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-xs">Fetching invoices...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              {trans.noInvoices}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">{trans.tableNum}</th>
                    <th className="px-6 py-4">{trans.tableCust}</th>
                    <th className="px-6 py-4">{trans.tableDate}</th>
                    <th className="px-6 py-4">{trans.tableTotal}</th>
                    <th className="px-6 py-4">{trans.tableStatus}</th>
                    <th className="px-6 py-4 text-right">{trans.tableActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {inv.invoiceNumber.startsWith('DRAFT-') ? (
                          <span className="px-2 py-0.5 bg-slate-950 text-slate-500 rounded border border-slate-900">{inv.invoiceNumber}</span>
                        ) : (
                          <span className="font-semibold text-slate-200">{inv.invoiceNumber}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">{inv.customerName}</div>
                        {inv.customerGSTIN && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">GSTIN: {inv.customerGSTIN}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-100">₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Sub: ₹{inv.subtotal.toLocaleString('en-IN')} | Tax: ₹{inv.totalGST.toLocaleString('en-IN')}</div>
                      </td>
                      <td className="px-6 py-4">
                        {inv.status === 'draft' && (
                          <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[10px] font-bold tracking-wide uppercase">
                            {trans.draft}
                          </span>
                        )}
                        {inv.status === 'finalized' && (
                          <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold tracking-wide uppercase">
                            {trans.finalized}
                          </span>
                        )}
                        {inv.status === 'paid' && (
                          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold tracking-wide uppercase">
                            {trans.paid}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-md"
                        >
                          {trans.view} &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-8">
        <p>&copy; {new Date().getFullYear()} FinNbiz. Indian GST calculations & tax split auditor.</p>
      </footer>
    </div>
  )
}
