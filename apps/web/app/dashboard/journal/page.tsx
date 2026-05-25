'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface JvEntry {
  account: string
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  debit: string
  credit: string
}

const AVAILABLE_ACCOUNTS = [
  { name: 'Cash', type: 'asset' },
  { name: 'Bank Account', type: 'asset' },
  { name: 'Accounts Receivable', type: 'asset' },
  { name: 'Sales Revenue', type: 'income' },
  { name: 'GST Payable', type: 'liability' },
  { name: 'GST Input Credit', type: 'asset' },
  { name: 'Office Supplies Expense', type: 'expense' },
  { name: 'Travel Expense', type: 'expense' },
  { name: 'Utilities Expense', type: 'expense' },
  { name: 'Salary Expense', type: 'expense' },
  { name: 'Rent Expense', type: 'expense' },
  { name: 'General Capital', type: 'equity' }
]

export default function JournalVoucherPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const { syncFetch } = useOfflineSync()
  const router = useRouter()

  // Form states
  const [voucherNo, setVoucherNo] = useState(`JV-${Date.now().toString().slice(-6)}`)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [entries, setEntries] = useState<JvEntry[]>([
    { account: 'Cash', accountType: 'asset', debit: '', credit: '' },
    { account: 'Sales Revenue', accountType: 'income', debit: '', credit: '' }
  ])

  // UI state
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Guard routing
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  // Sum calculations
  const totalDebits = entries.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0)
  const totalCredits = entries.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) <= 0.01 && totalDebits > 0

  const handleAddRow = () => {
    setEntries([
      ...entries,
      { account: 'Cash', accountType: 'asset', debit: '', credit: '' }
    ])
  }

  const handleRemoveRow = (index: number) => {
    if (entries.length <= 2) return
    const list = [...entries]
    list.splice(index, 1)
    setEntries(list)
  }

  const handleEntryChange = (index: number, field: keyof JvEntry, value: string) => {
    const list = [...entries]
    if (field === 'account') {
      list[index].account = value
      const targetAcc = AVAILABLE_ACCOUNTS.find(a => a.name === value)
      if (targetAcc) {
        list[index].accountType = targetAcc.type as any
      }
    } else {
      list[index][field] = value as any

      // Enforce exclusivity: if debit is written, credit is cleared, and vice versa
      if (field === 'debit' && value !== '') {
        list[index].credit = ''
      } else if (field === 'credit' && value !== '') {
        list[index].debit = ''
      }
    }
    setEntries(list)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!isBalanced) {
      setErrorMsg(t('journal.mismatch'))
      return
    }

    setLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/transactions/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          date,
          description: description.trim() || `Journal Voucher adjustment ${voucherNo}`,
          entries: entries.map(item => ({
            account: item.account,
            accountType: item.accountType,
            debit: parseFloat(item.debit) || 0,
            credit: parseFloat(item.credit) || 0
          }))
        })
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(language === 'hi' ? 'जर्नल वाउचर बहीखाता में सफलतापूर्वक पोस्ट हो गया!' : 'Journal Voucher posted successfully into general ledger!')
        // Reset form
        setDescription('')
        setVoucherNo(`JV-${Date.now().toString().slice(-6)}`)
        setEntries([
          { account: 'Cash', accountType: 'asset', debit: '', credit: '' },
          { account: 'Sales Revenue', accountType: 'income', debit: '', credit: '' }
        ])
      } else {
        setErrorMsg(data.error || 'Failed to save Journal Voucher.')
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Background neon blurs */}
      <div className="absolute top-0 right-0 w-[35%] h-[35%] rounded-full bg-violet-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[35%] h-[35%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      {/* Nav Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {language === 'hi' ? 'डैशबोर्ड' : 'Dashboard'}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{t('journal.title')}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{t('journal.title')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t('journal.subtitle')}</p>
        </div>

        {/* Error/Success alerts */}
        {errorMsg && (
          <div className="p-4 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dynamic Entry Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl p-6 space-y-6">
          
          {/* Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-semibold">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t('journal.voucher_no')}</label>
              <input
                type="text"
                readOnly
                value={voucherNo}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 font-mono text-sm outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t('journal.date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t('journal.desc')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Salary provisions"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm outline-none placeholder-slate-600"
              />
            </div>
          </div>

          {/* Entries Data Table */}
          <div className="border border-slate-850 bg-slate-950/40 rounded-xl overflow-hidden">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-[10px] uppercase tracking-wider">
                  <th className="p-3 w-[45%]">{t('journal.account')}</th>
                  <th className="p-3 w-[20%]">{t('journal.dr')}</th>
                  <th className="p-3 w-[20%]">{t('journal.cr')}</th>
                  <th className="p-3 w-[15%] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {entries.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/10">
                    {/* Account Selector */}
                    <td className="p-3">
                      <select
                        value={item.account}
                        onChange={(e) => handleEntryChange(idx, 'account', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-violet-500"
                      >
                        {AVAILABLE_ACCOUNTS.map(a => (
                          <option key={a.name} value={a.name}>
                            {a.name} ({a.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Debit Column */}
                    <td className="p-3">
                      <input
                        type="number"
                        placeholder="0.00"
                        step="any"
                        value={item.debit}
                        onChange={(e) => handleEntryChange(idx, 'debit', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-emerald-400 outline-none text-right font-mono font-bold"
                      />
                    </td>

                    {/* Credit Column */}
                    <td className="p-3">
                      <input
                        type="number"
                        placeholder="0.00"
                        step="any"
                        value={item.credit}
                        onChange={(e) => handleEntryChange(idx, 'credit', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-indigo-400 outline-none text-right font-mono font-bold"
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={entries.length <= 2}
                        className="text-red-500 hover:text-red-400 disabled:opacity-30"
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Footer row */}
            <div className="bg-slate-950/70 p-3 px-6 flex justify-between items-center text-sm font-bold border-t border-slate-850">
              <span className="text-slate-400">{t('journal.total')}:</span>
              <div className="flex gap-12 font-mono">
                <span className="text-emerald-400">Dr: ₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span className="text-indigo-400">Cr: ₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Add Entry Row button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="text-xs text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1"
          >
            ➕ {t('journal.add_row')}
          </button>

          {/* Validation safety banner */}
          {!isBalanced && totalDebits > 0 && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center gap-1.5 animate-pulse font-semibold">
              ⚠️ {t('journal.mismatch')}
            </div>
          )}

          {isBalanced && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-1.5 font-semibold">
              ✓ balanced bookkeeping ratios established. Ready to post!
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading || !isBalanced}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs tracking-wider transition-all disabled:opacity-30 disabled:scale-100 active:scale-[0.98] shadow-lg shadow-violet-500/20"
          >
            {loading ? 'Posting Voucher...' : t('journal.post')}
          </button>

        </form>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-8">
        <p>&copy; {new Date().getFullYear()} FinNbiz. Double-entry validation audit systems. Compliance safe.</p>
      </footer>
    </div>
  )
}
