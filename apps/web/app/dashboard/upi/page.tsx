'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface UpiTransaction {
  id: string
  companyId: string
  type: string
  amount: number
  description: string
  category: string | null
  paymentMethod: string
  reference: string | null
  vendor: string | null
  date: string
  source: string
  createdAt: string
  ledgerEntries?: Array<{
    id: string
    account: string
    accountType: string
    debit: number
    credit: number
    description: string
  }>
}

export default function UpiDashboardPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const { syncFetch } = useOfflineSync()
  const router = useRouter()

  // Configuration State (Local persistence)
  const [upiId, setUpiId] = useState('merchant@upi')
  const [payeeName, setPayeeName] = useState('')
  const [paymentNote, setPaymentNote] = useState('FinNbiz Business Payment')

  // Dynamic QR Code Builder State
  const [qrAmount, setQrAmount] = useState('100')
  const [generatedQrUrl, setGeneratedQrUrl] = useState('')

  // Simulator Webhook State
  const [simPayer, setSimPayer] = useState('customer@okaxis')
  const [simAmount, setSimAmount] = useState('500')
  const [simRef, setSimRef] = useState('')
  const [simDesc, setSimDesc] = useState('Payment for invoice #182')

  // UI Table lists
  const [transactions, setTransactions] = useState<UpiTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  // Guard routing
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  // Load configuration from local storage
  useEffect(() => {
    if (activeCompany) {
      const savedVpa = localStorage.getItem(`finnbiz_vpa_${activeCompany.id}`)
      const savedName = localStorage.getItem(`finnbiz_payee_${activeCompany.id}`)
      const savedNote = localStorage.getItem(`finnbiz_note_${activeCompany.id}`)

      if (savedVpa) setUpiId(savedVpa)
      if (savedName) setPayeeName(savedName)
      else setPayeeName(activeCompany.name)
      if (savedNote) setPaymentNote(savedNote)

      // Initial ref transaction ID
      setSimRef(`TXN${Date.now()}`)
    }
  }, [activeCompany])

  // QR Code URL generator
  const regenerateQr = () => {
    if (!upiId) return
    const encodedVpa = encodeURIComponent(upiId)
    const encodedName = encodeURIComponent(payeeName || activeCompany?.name || 'FinNbiz Payee')
    const encodedNote = encodeURIComponent(paymentNote)
    const amountVal = parseFloat(qrAmount) || 0

    // Construct standard Indian UPI deep linking schema
    const upiLink = `upi://pay?pa=${encodedVpa}&pn=${encodedName}&am=${amountVal}&tn=${encodedNote}&cu=INR`
    const qrApiUrl = `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(upiLink)}`
    
    setGeneratedQrUrl(qrApiUrl)
  }

  // Auto regenerate QR whenever VPA, payee, notes or qrAmount changes
  useEffect(() => {
    regenerateQr()
  }, [upiId, payeeName, paymentNote, qrAmount, activeCompany])

  const fetchTransactions = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const res = await syncFetch(`http://localhost:3001/api/upi/transactions?companyId=${activeCompany.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setTransactions(data)
      }
    } catch (err) {
      console.error('Failed to fetch UPI transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [activeCompany, token])

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchTransactions()
    }
    window.addEventListener('finnbiz_sync_complete', handleSyncComplete)
    return () => window.removeEventListener('finnbiz_sync_complete', handleSyncComplete)
  }, [activeCompany, token])

  // Save VPA Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany) return
    localStorage.setItem(`finnbiz_vpa_${activeCompany.id}`, upiId)
    localStorage.setItem(`finnbiz_payee_${activeCompany.id}`, payeeName)
    localStorage.setItem(`finnbiz_note_${activeCompany.id}`, paymentNote)

    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 3000)
  }

  // Trigger simulated incoming webhook notification
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany) return
    if (!simAmount || !simRef) {
      alert(language === 'hi' ? 'राशि और संदर्भ आईडी दर्ज करना आवश्यक है।' : 'Amount and Transaction ID are required.')
      return
    }

    setActionLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/upi/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: activeCompany.id,
          upiId: simPayer,
          amount: simAmount,
          description: simDesc,
          transactionId: simRef,
          paymentMethod: 'upi',
          timestamp: new Date().toISOString(),
          status: 'success',
          metadata: {
            merchantVpa: upiId,
            payeeName
          }
        })
      })

      if (res.ok) {
        alert(language === 'hi' ? 'सफल! मर्चेंट नोटिफिकेशन प्राप्त हुआ और डबल-एंट्री लेजर में पोस्ट किया गया।' : 'Success! Webhook processed and double-entry transaction posted in ledger.')
        fetchTransactions()
        // Generate new txn ID for next simulation
        setSimRef(`TXN${Date.now()}`)
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to simulate webhook.')
      }
    } catch (err) {
      console.error(err)
      alert('Network failure.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Background blurs */}
      <div className="absolute top-0 right-0 w-[35%] h-[35%] rounded-full bg-violet-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[35%] h-[35%] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {language === 'hi' ? 'डैशबोर्ड' : 'Dashboard'}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{t('upi.title')}</span>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow space-y-8">
        
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{t('upi.title')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t('upi.subtitle')}</p>
        </div>

        {/* 2-Column layout: Config/QR & Webhook Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: Config & QR (Left - 7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Config Box */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                ⚙️ {t('upi.config.title')}
              </h2>
              
              {configSaved && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs rounded-lg font-semibold">
                  ✓ Configuration saved to browser storage!
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-4 text-sm font-semibold">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{t('upi.config.vpa')} *</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="merchant@vpa"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-mono text-xs focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t('upi.config.name')}</label>
                    <input
                      type="text"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t('upi.config.note')}</label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-lg text-xs tracking-wider transition-all"
                >
                  {t('upi.config.save')}
                </button>
              </form>
            </div>

            {/* Settled Transactions Ledger Table */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                🏛️ {t('upi.ledger.title')}
              </h2>

              {loading ? (
                <p className="text-slate-500 text-center py-10 text-xs">Fetching completed payments...</p>
              ) : transactions.length === 0 ? (
                <p className="text-slate-500 text-center py-10 text-xs">{t('upi.ledger.empty')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3">Txn Reference</th>
                        <th className="px-4 py-3">Payer VPA</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Double-Entry Accounting</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs font-semibold">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-white font-mono">{tx.reference}</div>
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">{tx.description}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-mono">
                            {tx.vendor || 'customer@upi'}
                          </td>
                          <td className="px-4 py-3 font-black text-emerald-400 text-sm">
                            ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5 text-[9px]">
                              <span className="text-emerald-400">Dr: Bank Account (+₹{tx.amount})</span>
                              <span className="text-indigo-400">Cr: {tx.category || 'Sales Revenue'} (+₹{tx.amount})</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Column 2: QR display & Webhook simulator (Right - 5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Dynamic QR Box */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex flex-col items-center space-y-4 group hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.1)] transition-all">
              <h2 className="text-lg font-bold text-white self-start flex items-center gap-1.5 w-full border-b border-slate-800 pb-2">
                📲 {t('upi.qr.title')}
              </h2>

              <div className="space-y-1 w-full text-sm font-semibold">
                <label className="text-xs text-slate-400">{t('upi.qr.amount')}</label>
                <input
                  type="number"
                  value={qrAmount}
                  onChange={(e) => setQrAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none text-center font-bold text-emerald-400 focus:border-violet-500"
                />
              </div>

              {generatedQrUrl ? (
                <div className="p-3 bg-white rounded-xl shadow-lg border-2 border-violet-500/20 group-hover:scale-105 transition-transform duration-500 relative">
                  <img src={generatedQrUrl} alt="UPI Payment QR" className="w-48 h-48 block" />
                </div>
              ) : (
                <p className="text-xs text-slate-500">Provide VPA configuration first.</p>
              )}

              <p className="text-[10px] text-slate-500 text-center font-semibold">
                Scan this dynamic Bharat-compliant QR with any UPI App (PhonePe, GPay, Paytm) to check.
              </p>
            </div>

            {/* Webhook notification simulator */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl space-y-4 hover:border-violet-500/30 transition-all">
              <h2 className="text-lg font-bold text-violet-400 flex items-center gap-1.5">
                ⚡ {t('upi.sim.title')}
              </h2>
              <p className="text-xs text-slate-400">
                Simulate instant callback notifications from banking nodes (e.g. UPI incoming webhook test) to verify double-entry automation.
              </p>

              <form onSubmit={handleSimulateWebhook} className="space-y-4 text-sm font-semibold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t('upi.sim.payer')} *</label>
                    <input
                      type="text"
                      value={simPayer}
                      onChange={(e) => setSimPayer(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t('upi.sim.amount')} *</label>
                    <input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none text-xs font-bold text-emerald-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{t('upi.sim.ref')} *</label>
                  <input
                    type="text"
                    value={simRef}
                    onChange={(e) => setSimRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none text-xs font-mono text-violet-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{t('upi.sim.desc')}</label>
                  <input
                    type="text"
                    value={simDesc}
                    onChange={(e) => setSimDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-lg text-xs tracking-wider transition-all shadow-md shadow-violet-500/20 active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Simulating Notification...' : t('upi.sim.btn')}
                </button>
              </form>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-8">
        <p>&copy; {new Date().getFullYear()} FinNbiz. Indian payment compliance & double-entry automation node.</p>
      </footer>
    </div>
  )
}
