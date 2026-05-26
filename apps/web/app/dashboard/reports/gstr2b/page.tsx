'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

interface ReconcileResult {
  id: string | null
  customerName: string
  gstin: string
  invoiceNumber: string
  portalTaxable: number
  booksTaxable: number
  status: 'MATCHED' | 'TAX_MISMATCH' | 'MISSING_IN_BOOKS' | 'MISSING_IN_PORTAL'
  message: string
}

interface ReconcileSummary {
  matchedCount: number
  taxMismatchCount: number
  missingBooksCount: number
  missingPortalCount: number
  totalMatchedITC: number
  totalUnclaimedITC: number
}

export default function Gstr2bPage() {
  const { token, activeCompany } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  // State
  const [results, setResults] = useState<ReconcileResult[]>([])
  const [summary, setSummary] = useState<ReconcileSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'matched' | 'mismatch' | 'missing_books' | 'missing_portal'>('all')

  // Guard routing
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  // Generate sample GSTR-2B file for instant user testing
  const handleDownloadSampleJSON = () => {
    const sampleData = [
      {
        gstin: "27AAAAA1111A1Z1",
        supplierName: "Acme Steel Distributors",
        invoiceNumber: "PUR-2026-001",
        taxableValue: "15000",
        taxAmount: "2700"
      },
      {
        gstin: "27BBBBB2222B2Z2",
        supplierName: "Global Tech Raw Materials",
        invoiceNumber: "INV-RIL-884",
        taxableValue: "42000",
        taxAmount: "7560"
      },
      {
        gstin: "27CCCCC3333C3Z3",
        supplierName: "Universal Packaging Co",
        invoiceNumber: "UPC-993",
        taxableValue: "8500",
        taxAmount: "1530"
      }
    ]

    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Sample_GSTR2B_Portal_Data.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Handle uploaded JSON GSTR-2B file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess('')

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (!Array.isArray(json)) {
          throw new Error(language === 'hi' ? 'गलत फ़ाइल प्रारूप। JSON एक सरणी (Array) होना चाहिए।' : 'Invalid format. JSON must be an array of invoices.')
        }

        // Reconcile via API
        const res = await fetch(`${API_BASE_URL}/reports/gstr2b?companyId=${activeCompany?.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ portalInvoices: json })
        })

        const data = await res.json()
        if (res.ok) {
          setResults(data.results)
          setSummary(data.summary)
          setSuccess(language === 'hi' ? 'GSTR-2B मिलान सफलतापूर्वक पूरा हुआ!' : 'GSTR-2B Reconciliation completed successfully!')
        } else {
          setError(data.error || 'Reconciliation failed.')
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || (language === 'hi' ? 'फ़ाइल पढ़ने या प्रोसेस करने में त्रुटि।' : 'Error parsing or reconciling file.'))
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  // Filter list
  const filteredResults = results.filter(r => {
    if (activeTab === 'matched') return r.status === 'MATCHED'
    if (activeTab === 'mismatch') return r.status === 'TAX_MISMATCH'
    if (activeTab === 'missing_books') return r.status === 'MISSING_IN_BOOKS'
    if (activeTab === 'missing_portal') return r.status === 'MISSING_IN_PORTAL'
    return true
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background neon blurs */}
      <div className="absolute top-0 right-0 w-[35%] h-[35%] rounded-full bg-emerald-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[35%] h-[35%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/reports" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {language === 'hi' ? 'रिपोर्ट्स' : 'Reports'}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">
              GSTR-2B Input Tax Credit Reconciliation
            </span>
          </div>

          <button
            onClick={handleDownloadSampleJSON}
            className="px-4 py-2 border border-slate-850 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-lg tracking-wide transition-all"
          >
            📥 {language === 'hi' ? 'सैंपल GSTR-2B डाउनलोड करें' : 'Download Sample GSTR-2B'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow space-y-8">
        
        {/* Info */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            📊 GSTR-2B Input Tax Credit (ITC) Matching
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {language === 'hi' 
              ? 'जीएसटी पोर्टल GSTR-2B डेटा अपलोड करें और अपनी खरीद बही (Purchase Ledger) के साथ इनपुट टैक्स क्रेडिट का सटीक मिलान करें।' 
              : 'Upload GST Portal GSTR-2B ledger to reconcile Eligible Input Tax Credit against purchase invoices.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/60 text-red-300 px-4 py-3 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-semibold text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span className="font-semibold text-sm">{success}</span>
          </div>
        )}

        {/* File Uploader Dashboard */}
        {!summary ? (
          <div className="max-w-xl mx-auto p-10 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto">
              📁
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{language === 'hi' ? 'GSTR-2B पोर्टल फ़ाइल अपलोड करें' : 'Upload GSTR-2B Ledger'}</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {language === 'hi'
                  ? 'जीएसटी पोर्टल (GST Portal) से डाउनलोड की गई JSON फ़ाइल यहाँ ड्रैग या सेलेक्ट करें ताकि परचेस बिलों का ऑटो-मैच किया जा सके।'
                  : 'Select or drag-and-drop the portal JSON invoice log sheet here to automatically match eligible tax returns.'}
              </p>
            </div>

            <div className="relative pt-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="gstr2b-uploader"
                disabled={loading}
              />
              <label
                htmlFor="gstr2b-uploader"
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl tracking-wide shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {language === 'hi' ? 'प्रोसेसिंग...' : 'Matching Invoices...'}
                  </>
                ) : (
                  <>🔍 {language === 'hi' ? 'फ़ाइल चुनें (.json)' : 'Select JSON File'}</>
                )}
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Reconciliation Overview Widget Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{language === 'hi' ? 'सत्यापित (Fully Matched)' : 'Fully Matched'}</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{summary.matchedCount} bills</span>
              </div>
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{language === 'hi' ? 'मूल्य विसंगति (Mismatch)' : 'Tax Mismatch'}</span>
                <span className={`text-2xl font-black mt-1 block ${summary.taxMismatchCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{summary.taxMismatchCount} bills</span>
              </div>
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{language === 'hi' ? 'बही में छूटे (Missing Books)' : 'Missing in Books'}</span>
                <span className={`text-2xl font-black mt-1 block ${summary.missingBooksCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{summary.missingBooksCount} bills</span>
              </div>
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{language === 'hi' ? 'पोर्टल पर छूटे (Missing Portal)' : 'Missing in Portal'}</span>
                <span className={`text-2xl font-black mt-1 block ${summary.missingPortalCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>{summary.missingPortalCount} bills</span>
              </div>
            </div>

            {/* eligible ITC stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{language === 'hi' ? 'सत्यापित दावा योग्य ITC' : 'Eligible Matched ITC'}</span>
                  <span className="text-3xl font-black text-emerald-400 mt-1 block">₹{summary.totalMatchedITC.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">🛡️ Reconciled and safe to claim in GSTR-3B.</span>
                </div>
                <span className="text-3xl">✅</span>
              </div>

              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{language === 'hi' ? 'दावा न किया गया ITC (पोर्टल पर छूटा)' : 'Unclaimed ITC (Missing Portal)'}</span>
                  <span className="text-3xl font-black text-red-400 mt-1 block">₹{summary.totalUnclaimedITC.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">⚠️ Vendor hasn't uploaded. Ask them to file immediately!</span>
                </div>
                <span className="text-3xl">🚨</span>
              </div>
            </div>

            {/* Reconciliation Control Tabs and Table */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                >
                  {language === 'hi' ? 'सभी' : 'All Result Logs'}
                </button>
                <button
                  onClick={() => setActiveTab('matched')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'matched' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'text-slate-500'}`}
                >
                  {language === 'hi' ? 'सत्यापित' : 'Matched'}
                </button>
                <button
                  onClick={() => setActiveTab('mismatch')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'mismatch' ? 'bg-amber-950 text-amber-400 border border-amber-900' : 'text-slate-500'}`}
                >
                  {language === 'hi' ? 'कर विसंगति' : 'Tax Mismatch'}
                </button>
                <button
                  onClick={() => setActiveTab('missing_books')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'missing_books' ? 'bg-rose-950 text-rose-450 border border-rose-900' : 'text-slate-500'}`}
                >
                  {language === 'hi' ? 'बही में छूटे' : 'Missing in Books'}
                </button>
                <button
                  onClick={() => setActiveTab('missing_portal')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'missing_portal' ? 'bg-red-950 text-red-400 border border-red-900' : 'text-slate-500'}`}
                >
                  {language === 'hi' ? 'पोर्टल पर छूटे' : 'Missing in Portal'}
                </button>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-850 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-4">{language === 'hi' ? 'सप्लायर / GSTIN' : 'Supplier / GSTIN'}</th>
                        <th className="p-4">{language === 'hi' ? 'इनवॉइस नं.' : 'Invoice Number'}</th>
                        <th className="p-4 text-right">{language === 'hi' ? 'बही मूल्य (₹)' : 'Books Value (₹)'}</th>
                        <th className="p-4 text-right">{language === 'hi' ? 'पोर्टल मूल्य (₹)' : 'Portal Value (₹)'}</th>
                        <th className="p-4">{language === 'hi' ? 'स्थिति' : 'Match Status'}</th>
                        <th className="p-4">{language === 'hi' ? 'ऑडिट टिप्पणी' : 'Audit Message'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {filteredResults.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-200">{r.customerName}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.gstin}</div>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-300">{r.invoiceNumber}</td>
                          <td className="p-4 text-right text-slate-200">₹{r.booksTaxable.toLocaleString()}</td>
                          <td className="p-4 text-right text-slate-200">₹{r.portalTaxable.toLocaleString()}</td>
                          <td className="p-4">
                            {r.status === 'MATCHED' && (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded uppercase">MATCHED</span>
                            )}
                            {r.status === 'TAX_MISMATCH' && (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold rounded uppercase">MISMATCH</span>
                            )}
                            {r.status === 'MISSING_IN_BOOKS' && (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-450 border border-rose-500/20 text-[9px] font-bold rounded uppercase">MISSING BOOKS</span>
                            )}
                            {r.status === 'MISSING_IN_PORTAL' && (
                              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold rounded uppercase">MISSING PORTAL</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400 leading-normal">{r.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => {
                    setSummary(null)
                    setResults([])
                    setSuccess('')
                  }}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  {language === 'hi' ? 'अन्य फ़ाइल रिकॉन्सिल करें' : 'Reconcile Another File'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
