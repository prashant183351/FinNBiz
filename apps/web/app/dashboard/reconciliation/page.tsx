'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'

interface SystemExpense {
  id: string
  date: string
  description: string
  totalAmount: number
  reference: string | null
  reconciled?: boolean
}

interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  matchedExpenseId?: string
  status: 'Unmatched' | 'Matched' | 'Reconciled'
}

export default function ReconciliationPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const router = useRouter()

  const [systemExpenses, setSystemExpenses] = useState<SystemExpense[]>([])
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchSystemExpenses()
    }
  }, [activeCompany, token])

  const fetchSystemExpenses = async () => {
    setLoading(true)
    try {
      // Mocking fetch of unmatched expenses for demo
      const res = await fetch(`${API_BASE_URL}/expenses?companyId=${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSystemExpenses(data.map((e: any) => ({ ...e, reconciled: false })))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleParseCSV = () => {
    const lines = csvText.split(/\n/).filter(l => l.trim().length > 0)
    if (lines.length < 2) return

    const parsed: BankTransaction[] = []
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      if (parts.length >= 3) {
        parsed.push({
          id: `bank-txn-${Date.now()}-${i}`,
          date: parts[0].trim(),
          description: parts[1].trim(),
          amount: parseFloat(parts[2].replace(/[^0-9.-]/g, '')),
          status: 'Unmatched'
        })
      }
    }
    setBankTransactions(parsed)
  }

  const runAutoMatch = () => {
    const updatedBank = [...bankTransactions]
    const updatedSys = [...systemExpenses]

    updatedBank.forEach((bankTxn) => {
      if (bankTxn.status === 'Unmatched') {
        const matchIdx = updatedSys.findIndex(sys => 
          !sys.reconciled && 
          Math.abs(sys.totalAmount - bankTxn.amount) < 1 // Match amount within 1 INR tolerance
        )

        if (matchIdx !== -1) {
          bankTxn.status = 'Matched'
          bankTxn.matchedExpenseId = updatedSys[matchIdx].id
        }
      }
    })

    setBankTransactions(updatedBank)
    alert(language === 'hi' ? 'AI द्वारा ऑटो-मैचिंग पूरी हुई!' : 'AI Auto-Matching Complete!')
  }

  const confirmMatch = (bankId: string, sysId: string) => {
    setBankTransactions(prev => prev.map(b => b.id === bankId ? { ...b, status: 'Reconciled' } : b))
    setSystemExpenses(prev => prev.map(s => s.id === sysId ? { ...s, reconciled: true } : s))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-teal-900/10 blur-[100px] pointer-events-none"></div>

      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; Back
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{t('recon.title')}</span>
          </div>
          <button 
            onClick={runAutoMatch}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-teal-500/20 transition-all"
          >
            ✨ {t('recon.match_btn')}
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white">{t('recon.title')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('recon.subtitle')}</p>
        </div>

        {/* Upload Section */}
        {bankTransactions.length === 0 && (
          <div className="mb-8 p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-2">{t('recon.upload')}</h3>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="Date, Description, Amount (e.g. 2026-05-20, Vendor Payout, 1500)"
              className="w-full h-32 px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-xs outline-none focus:border-teal-500 mb-4"
            />
            <button onClick={handleParseCSV} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
              Parse Statement
            </button>
          </div>
        )}

        {/* Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Bank Statement */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-300">{t('recon.unmatched_bank')}</h3>
              <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-[10px] font-bold">
                {bankTransactions.filter(b => b.status !== 'Reconciled').length} Items
              </span>
            </div>
            <div className="divide-y divide-slate-800/50 p-4 space-y-4">
              {bankTransactions.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-8">No statement uploaded.</div>
              )}
              {bankTransactions.filter(b => b.status !== 'Reconciled').map(txn => (
                <div key={txn.id} className={`p-4 rounded-xl border ${txn.status === 'Matched' ? 'border-teal-500/50 bg-teal-500/5' : 'border-slate-800 bg-slate-950'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-white">{txn.description}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{txn.date}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-200">₹{txn.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${txn.status === 'Matched' ? 'bg-teal-500/20 text-teal-400' : 'bg-amber-500/10 text-amber-500'}`}>
                      {txn.status}
                    </span>
                    {txn.status === 'Matched' && txn.matchedExpenseId && (
                      <button 
                        onClick={() => confirmMatch(txn.id, txn.matchedExpenseId!)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold rounded transition-colors"
                      >
                        {t('recon.confirm')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: System Expenses */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-300">{t('recon.unmatched_sys')}</h3>
              <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-[10px] font-bold">
                {systemExpenses.filter(s => !s.reconciled).length} Items
              </span>
            </div>
            <div className="divide-y divide-slate-800/50 p-4 space-y-4">
              {loading && <div className="text-sm text-slate-500 text-center py-8">Loading expenses...</div>}
              {systemExpenses.filter(s => !s.reconciled).map(exp => (
                <div key={exp.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-white">{exp.description}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{new Date(exp.date).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-200">₹{exp.totalAmount.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
