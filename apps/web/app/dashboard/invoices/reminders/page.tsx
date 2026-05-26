'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

interface InvoiceRef {
  id: string
  invoiceNumber: string
  totalAmount: number
  createdAt: string
}

interface OutstandingCustomer {
  customerName: string
  customerGSTIN: string | null
  totalOutstanding: number
  invoiceCount: number
  creditLimit: number | null
  customerType: 'retail' | 'wholesale' | 'distributor'
  invoices: InvoiceRef[]
}

export default function OutstandingCollectionsPage() {
  const { token, activeCompany } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  // State
  const [collections, setCollections] = useState<OutstandingCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // QR Code Modal State
  const [showQrModal, setShowQrModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<OutstandingCustomer | null>(null)
  const [customAmount, setCustomAmount] = useState('')

  // Guard routing
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchCollections()
    }
  }, [activeCompany, token])

  const fetchCollections = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/reports/outstanding?companyId=${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setCollections(await res.json())
      } else {
        setError(language === 'hi' ? 'उधार सूची लोड करने में विफल।' : 'Failed to fetch outstanding ledger.')
      }
    } catch (err) {
      console.error(err)
      setError(language === 'hi' ? 'सर्वर से कनेक्ट करने में विफल।' : 'Failed to connect to outstanding API.')
    } finally {
      setLoading(false)
    }
  }

  // Generate a dynamic WhatsApp message and launch deep link sharing
  const handleWhatsAppReminder = (cust: OutstandingCustomer) => {
    const defaultUpiId = 'merchant@upi' // Placeholder fallback merchant UPI VPA
    const payAmt = cust.totalOutstanding.toFixed(2)
    const encodedUpiUrl = encodeURIComponent(`upi://pay?pa=${defaultUpiId}&pn=${encodeURIComponent(activeCompany?.name || 'FinNBiz')}&am=${payAmt}&cu=INR`)

    const text = language === 'hi'
      ? `नमस्ते ${cust.customerName},\n\n${activeCompany?.name} से आपका कुल बकाया ₹${cust.totalOutstanding.toLocaleString('en-IN')} है, जो कि ${cust.invoiceCount} इनवॉइस के लिए देय है।\n\nकृपया नीचे दिए गए UPI लिंक का उपयोग करके तुरंत भुगतान करें:\n\n${defaultUpiId}\n\nधन्यवाद!`
      : `Hello ${cust.customerName},\n\nThis is a friendly reminder from ${activeCompany?.name} regarding your outstanding balance of ₹${cust.totalOutstanding.toLocaleString('en-IN')} for ${cust.invoiceCount} invoices.\n\nPlease complete your payment directly using the UPI link below:\n\nupi://pay?pa=${defaultUpiId}&pn=${encodeURIComponent(activeCompany?.name || 'FinNBiz')}&am=${payAmt}&cu=INR\n\nThank you!`

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleOpenQrModal = (cust: OutstandingCustomer) => {
    setSelectedCustomer(cust)
    setCustomAmount(cust.totalOutstanding.toString())
    setShowQrModal(true)
  }

  // Filter list
  const filteredCollections = collections.filter(c => 
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.customerGSTIN && c.customerGSTIN.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Neon blurs */}
      <div className="absolute top-0 right-0 w-[35%] h-[35%] rounded-full bg-emerald-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[35%] h-[35%] rounded-full bg-rose-900/10 blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/invoices" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {language === 'hi' ? 'इनवॉइस' : 'Invoices'}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">
              {language === 'hi' ? 'उधारी और कलेक्शन सेंटर' : 'Outstanding Ledger & Collections'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow space-y-8">
        
        {/* Info */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            💰 {language === 'hi' ? 'स्मार्ट उधारी और रिमाइंडर्स' : 'Outstanding Udhaar & Smart Reminders'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {language === 'hi' 
              ? 'ग्राहकों की कुल उधारी, क्रेडिट सीमा (Credit Limits) देखें और व्हाट्सएप/UPI भुगतान अनुस्मारक भेजें।' 
              : 'Monitor outstanding balances, review credit limit breaches, and share automated WhatsApp/UPI collection reminders.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/60 text-red-300 px-4 py-3 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-semibold text-sm">{error}</span>
          </div>
        )}

        {/* Filter controls */}
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'hi' ? 'ग्राहक का नाम खोजें...' : 'Search by customer name...'}
            className="w-full sm:max-w-xs bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm py-2 px-3 text-white outline-none"
          />
          <div className="text-xs font-semibold text-slate-500">
            {language === 'hi' ? `कुल ${filteredCollections.length} बकाया खाते` : `Found ${filteredCollections.length} accounts`}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400 font-semibold">{language === 'hi' ? 'उधारी खाते लोड हो रहे हैं...' : 'Loading outstanding accounts...'}</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-2xl">
            <span className="text-3xl">🙌</span>
            <p className="text-sm font-semibold text-slate-400 mt-2">
              {language === 'hi' ? 'कोई बकाया उधारी नहीं है!' : 'No outstanding balances found.'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'hi' ? 'सभी भुगतान समय पर हो चुके हैं।' : 'All customer accounts are perfectly settled.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCollections.map((cust, idx) => {
              const limit = cust.creditLimit
              const isOverLimit = limit && cust.totalOutstanding > limit
              const limitPercentage = limit ? Math.min(100, (cust.totalOutstanding / limit) * 100) : 0

              return (
                <div key={idx} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-white text-lg truncate pr-2">{cust.customerName}</h3>
                        {cust.customerGSTIN && (
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{cust.customerGSTIN}</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-slate-950 text-[10px] font-bold uppercase rounded border border-slate-800 text-slate-400">
                        {cust.customerType}
                      </span>
                    </div>

                    {/* Outstanding amount */}
                    <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        {language === 'hi' ? 'कुल बकाया (Udhaar)' : 'Outstanding Balance'}
                      </span>
                      <span className="text-2xl font-black text-rose-400 mt-1 block">
                        ₹{cust.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                        📦 {cust.invoiceCount} {language === 'hi' ? 'अवैतनिक इनवॉइस' : 'unpaid invoices'}
                      </span>
                    </div>

                    {/* Credit Limit Meter */}
                    {limit ? (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500 uppercase tracking-wide">Credit Utilization</span>
                          <span className={isOverLimit ? 'text-red-400' : 'text-slate-400'}>
                            ₹{cust.totalOutstanding.toLocaleString()} / ₹{limit.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-indigo-600 to-emerald-600'}`}
                            style={{ width: `${limitPercentage}%` }}
                          ></div>
                        </div>
                        {isOverLimit && (
                          <span className="text-[9px] text-red-400 font-black uppercase tracking-wider block animate-pulse">
                            ⚠️ CREDIT LIMIT EXCEEDED
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 italic pt-2">
                        {language === 'hi' ? 'क्रेडिट सीमा निर्धारित नहीं है।' : 'No credit limit set.'}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-850 mt-6 relative z-10">
                    <button
                      onClick={() => handleWhatsAppReminder(cust)}
                      className="py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      💬 {language === 'hi' ? 'व्हाट्सएप भेजें' : 'WhatsApp'}
                    </button>
                    <button
                      onClick={() => handleOpenQrModal(cust)}
                      className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-1"
                    >
                      📲 {language === 'hi' ? 'UPI पेमेंट QR' : 'Collect UPI'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* UPI QR PAYMENT COLLECT MODAL */}
      {showQrModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                📲 {language === 'hi' ? 'त्वरित भुगतान QR' : 'UPI Payments Collector'}
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center text-center space-y-5">
              <div>
                <h4 className="font-bold text-white">{selectedCustomer.customerName}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {language === 'hi' ? `कुल बकाया: ₹${selectedCustomer.totalOutstanding}` : `Balance Outstanding: ₹${selectedCustomer.totalOutstanding}`}
                </p>
              </div>

              {/* QR Image Box */}
              <div className="p-4 bg-white rounded-2xl border border-slate-800/80 shadow-md">
                <img
                  src={`https://chart.googleapis.com/chart?cht=qr&chs=180x180&chl=${encodeURIComponent(`upi://pay?pa=merchant@upi&pn=${encodeURIComponent(activeCompany?.name || 'FinNBiz')}&am=${parseFloat(customAmount || '0').toFixed(2)}&cu=INR`)}`}
                  alt="UPI Payments QR"
                  className="w-44 h-44"
                />
              </div>

              {/* Amount adjust */}
              <div className="w-full">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  {language === 'hi' ? 'भुगतान राशि (₹)' : 'Collection Amount (₹)'}
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2 px-3 text-white text-center font-bold text-lg"
                />
              </div>

              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span>🛡️ SECURE PORTAL PAYMENTS | merchant@upi</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
