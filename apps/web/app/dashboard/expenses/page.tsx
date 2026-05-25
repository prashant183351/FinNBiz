'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface Expense {
  id: string
  date: string
  description: string
  category: string
  amount: number
  gstAmount: number
  totalAmount: number
  paymentMethod: string
  reference: string | null
  notes: string | null
}

const CATEGORIES = ['Utilities', 'Travel', 'Office Supplies', 'Salary', 'Rent', 'General Expense']

export default function ExpensesDashboardPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const { syncFetch } = useOfflineSync()
  const router = useRouter()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modals state
  const [showManualModal, setShowManualModal] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)

  // Manual Form State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
  const [manualDesc, setManualDesc] = useState('')
  const [manualCat, setManualCat] = useState('General Expense')
  const [manualAmount, setManualAmount] = useState('')
  const [manualGst, setManualGst] = useState('')
  const [manualMethod, setManualMethod] = useState('cash')
  const [manualRef, setManualRef] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // CSV State
  const [csvText, setCsvText] = useState('')
  const [csvPreview, setCsvPreview] = useState<{ date: string; description: string; amount: number; category: string }[]>([])
  const [csvError, setCsvError] = useState('')
  const [csvLoading, setCsvLoading] = useState(false)

  // Guard routing
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  const fetchExpenses = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const res = await syncFetch(`http://localhost:3001/api/expenses?companyId=${activeCompany.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setExpenses(data)
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [activeCompany, token])

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchExpenses()
    }
    window.addEventListener('finnbiz_sync_complete', handleSyncComplete)
    return () => window.removeEventListener('finnbiz_sync_complete', handleSyncComplete)
  }, [activeCompany, token])

  // Simple localized translations
  const trans = {
    title: language === 'hi' ? 'खर्च प्रबंधन' : 'Expenses & Onboarding',
    subtitle: language === 'hi' ? 'व्यावसायिक खर्चों को AI वर्गीकरण और स्टेटमेंट अपलोड के साथ ट्रैक करें' : 'Track business expenses with AI categorization and statement uploads',
    manualBtn: language === 'hi' ? 'मैन्युअल खर्च जोड़ें' : 'Log Expense',
    csvBtn: language === 'hi' ? 'CSV स्टेटमेंट अपलोड करें' : 'Upload CSV',
    totalExp: language === 'hi' ? 'कुल व्यावसायिक व्यय' : 'Total Expense Outflow',
    gstClaimed: language === 'hi' ? 'जीएसटी इनपुट क्लेम' : 'GST Input Claims',
    averageBill: language === 'hi' ? 'औसत खर्च बिल' : 'Average Bill Value',
    tableDesc: language === 'hi' ? 'विवरण' : 'Description',
    tableCat: language === 'hi' ? 'श्रेणी (Category)' : 'Category',
    tableAmt: language === 'hi' ? 'कुल खर्च राशि' : 'Total Outflow',
    tableDate: language === 'hi' ? 'तारीख' : 'Date',
    noExpenses: language === 'hi' ? 'कोई खर्चा दर्ज नहीं मिला। आज ही पहला खर्चा जोड़ें!' : 'No expenses logged. Add your first outflow today!',
    searchPl: language === 'hi' ? 'खर्च का विवरण खोजें...' : 'Search by expense description...',
    allCat: language === 'hi' ? 'सभी श्रेणियां' : 'All Categories',
    addHeader: language === 'hi' ? 'खर्च की जानकारी दर्ज करें' : 'Log New Expense Outflow',
    csvHeader: language === 'hi' ? 'बैंक स्टेटमेंट CSV अपलोड' : 'Upload Bank Statement (CSV)',
    csvDetect: language === 'hi' ? 'पहले 3 पंक्तियों का AI प्रिव्यू:' : 'Preview of first 3 rows with AI categories:',
    dateLabel: language === 'hi' ? 'खर्च की तिथि' : 'Outflow Date',
    descLabel: language === 'hi' ? 'खर्च का विवरण (विवरण)' : 'Expense Description',
    catLabel: language === 'hi' ? 'श्रेणी' : 'Category',
    amountLabel: language === 'hi' ? 'मूल राशि (Amount)' : 'Subtotal Amount (₹)',
    gstLabel: language === 'hi' ? 'GST इनपुट राशि (Optional)' : 'GST Input Tax (₹)',
    methodLabel: language === 'hi' ? 'भुगतान विधि' : 'Payment Method',
    refLabel: language === 'hi' ? 'संदर्भ आईडी / रसीद नं.' : 'Reference ID / Receipt No',
    notesLabel: language === 'hi' ? 'अतिरिक्त टिप्पणियाँ' : 'Notes / Remarks',
    submitSave: language === 'hi' ? 'सुरक्षित सहेजें' : 'Save Expense',
    submitImport: language === 'hi' ? 'स्टेटमेंट इम्पोर्ट करें' : 'Import Statement Logs'
  }

  // Analytics compilations
  const totalExpensesVal = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0)
  const totalGstVal = expenses.reduce((sum, exp) => sum + exp.gstAmount, 0)
  const avgBillVal = expenses.length > 0 ? totalExpensesVal / expenses.length : 0

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Handlers for Manual Save
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!manualDesc.trim() || !manualAmount) {
      setFormError(language === 'hi' ? 'विवरण और राशि दर्ज करना आवश्यक है।' : 'Description and Amount are required.')
      return
    }

    setFormLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          date: new Date(manualDate),
          description: manualDesc.trim(),
          category: manualCat,
          amount: parseFloat(manualAmount),
          gstAmount: parseFloat(manualGst) || 0,
          paymentMethod: manualMethod,
          reference: manualRef.trim() || undefined,
          notes: manualNotes.trim() || undefined
        })
      })

      const data = await res.json()
      if (res.ok) {
        setExpenses(prev => [data.expense, ...prev])
        setShowManualModal(false)
        // Reset manual states
        setManualDesc('')
        setManualAmount('')
        setManualGst('')
        setManualRef('')
        setManualNotes('')
      } else {
        setFormError(data.error || 'Failed to log manual expense.')
      }
    } catch (err) {
      console.error('Failed to log expense:', err)
      setFormError('Failed to connect to API server.')
    } finally {
      setFormLoading(false)
    }
  }

  // Handlers for CSV parse preview
  const handleCsvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setCsvText(text)
    setCsvError('')

    const lines = text.split(/\n/).filter(l => l.trim().length > 0)
    if (lines.length < 2) {
      setCsvPreview([])
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    let dateIdx = -1
    let descIdx = -1
    let amountIdx = -1

    headers.forEach((h, idx) => {
      if (h.includes('date') || h.includes('दिनांक') || h.includes('time')) dateIdx = idx
      else if (h.includes('desc') || h.includes('particular') || h.includes('detail') || h.includes('विवरण')) descIdx = idx
      else if (h.includes('amount') || h.includes('debit') || h.includes('withdrawal') || h.includes('out') || h.includes('राशि')) amountIdx = idx
    })

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      setCsvError('Failed to parse columns. Headers must contain Date, Description, and Amount.')
      setCsvPreview([])
      return
    }

    const previewList = []
    const previewCount = Math.min(lines.length, 4) // Show headers + 3 rows
    
    for (let i = 1; i < previewCount; i++) {
      const row = lines[i].split(',').map(c => c.trim())
      if (row.length < 3 || !row[dateIdx] || !row[amountIdx]) continue

      const rawDesc = row[descIdx] || ''
      const rawAmount = parseFloat(row[amountIdx].replace(/[^0-9.]/g, '')) || 0

      // Client-side AI category matcher mirroring backend rules
      let category = 'General Expense'
      const desc = rawDesc.toLowerCase()
      if (desc.includes('phone') || desc.includes('mobile') || desc.includes('telecom')) category = 'Utilities'
      else if (desc.includes('office') || desc.includes('stationery') || desc.includes('supplies')) category = 'Office Supplies'
      else if (desc.includes('travel') || desc.includes('taxi') || desc.includes('fuel') || desc.includes('uber')) category = 'Travel'
      else if (desc.includes('salary') || desc.includes('payroll')) category = 'Salary'
      else if (desc.includes('rent') || desc.includes('lease')) category = 'Rent'

      previewList.push({
        date: row[dateIdx],
        description: rawDesc,
        amount: rawAmount,
        category
      })
    }

    setCsvPreview(previewList)
  }

  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCsvError('')

    if (!csvText.trim()) {
      setCsvError('Please paste or upload CSV statement contents first.')
      return
    }

    setCsvLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/expenses/upload-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          csvText: csvText.trim()
        })
      })

      const data = await res.json()
      if (res.ok) {
        setExpenses(prev => [...data.expenses, ...prev])
        setShowCsvModal(false)
        setCsvText('')
        setCsvPreview([])
      } else {
        setCsvError(data.error || 'Failed to import CSV statement.')
      }
    } catch (err) {
      console.error('CSV import error:', err)
      setCsvError('Failed to connect to API server.')
    } finally {
      setCsvLoading(false)
    }
  }

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
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
            >
              + {trans.manualBtn}
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-lg tracking-wide transition-all"
            >
              📊 {trans.csvBtn}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow">
        {/* Ribbon Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between animate-pulse">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{trans.totalExp}</span>
              <h3 className="text-2xl font-black text-white mt-1">₹{totalExpensesVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-10 h-10 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h.007v.008H3.75V4.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3 15h.008v.008H3V15Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{trans.gstClaimed}</span>
              <h3 className="text-2xl font-black text-indigo-400 mt-1">₹{totalGstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{trans.averageBill}</span>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">₹{avgBillVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filters and Table area */}
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

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
            >
              <option value="all">{trans.allCat}</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Expenses Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-xs">Fetching expenses...</span>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              {trans.noExpenses}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">{trans.tableDesc}</th>
                    <th className="px-6 py-4">{trans.tableCat}</th>
                    <th className="px-6 py-4">{trans.tableDate}</th>
                    <th className="px-6 py-4">{trans.tableAmt}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">{exp.description}</div>
                        {exp.reference && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ref: {exp.reference}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-100">₹{exp.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        {exp.gstAmount > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5">Base: ₹{exp.amount} | GST: ₹{exp.gstAmount}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MANUAL ENTRY MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{trans.addHeader}</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-500 hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg">{formError}</div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4 text-sm font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{trans.dateLabel}</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{trans.catLabel}</label>
                  <select
                    value={manualCat}
                    onChange={(e) => setManualCat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400">{trans.descLabel}</label>
                <input
                  type="text"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="e.g. Printer cartridges"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{trans.amountLabel}</label>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>

                {/* GST */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{trans.gstLabel}</label>
                  <input
                    type="number"
                    value={manualGst}
                    onChange={(e) => setManualGst(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{trans.methodLabel}</label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>

                {/* Reference */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{trans.refLabel}</label>
                  <input
                    type="text"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    placeholder="Ref or Txn ID"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400">{trans.notesLabel}</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg text-xs tracking-wider transition-all disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : trans.submitSave}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV BATCH UPLOAD MODAL WITH AI PREVIEW */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{trans.csvHeader}</h3>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-500 hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {csvError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg">{csvError}</div>
            )}

            <form onSubmit={handleCsvSubmit} className="space-y-4 text-sm font-semibold">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Paste CSV data (headers: Date, Description, Amount, Reference)</label>
                <textarea
                  value={csvText}
                  onChange={handleCsvChange}
                  rows={6}
                  placeholder="Date,Description,Amount,Reference&#13;2026-05-10,Vodafone Mobile bill,899,TXN891&#13;2026-05-12,Uber ride to Noida,450,TXN892"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs outline-none placeholder-slate-700 resize-none"
                />
              </div>

              {/* AI Preview Section */}
              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.913-6.096L18 9.877L9.813 15.904zM9 21v-5.096l3.913-2.678L9 21z" />
                    </svg>
                    <span>{trans.csvDetect}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800/50">
                    {csvPreview.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-slate-200">{item.description}</div>
                          <div className="text-slate-500 font-mono mt-0.5">{item.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">₹{item.amount}</div>
                          <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded text-[9px] font-bold inline-block mt-0.5">
                            AI: {item.category}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={csvLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg text-xs tracking-wider transition-all disabled:opacity-50"
              >
                {csvLoading ? 'Processing Batch...' : trans.submitImport}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-8">
        <p>&copy; {new Date().getFullYear()} FinNbiz. Indian tax credit & expense auditing engine.</p>
      </footer>
    </div>
  )
}
