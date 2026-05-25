'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

export default function TDSDashboardPage() {
  const { token, activeCompany } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  const [tdsData, setTdsData] = useState<{ records: any[], summary: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) router.push('/login')
    else if (activeCompany) fetchTDS()
  }, [token, activeCompany])

  const fetchTDS = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:3001/api/purchases/tds?companyId=${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setTdsData(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePayGovt = () => {
    alert('This will redirect to Income Tax Portal (E-Pay Tax) to file Challan ITNS 281.')
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-black text-white mb-2">TDS Dashboard</h2>
          <p className="text-sm text-slate-400">Track Tax Deducted at Source (TDS) liabilities payable to the Government.</p>
        </div>
        <button
          onClick={handlePayGovt}
          className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all"
        >
          Pay TDS via ITNS 281 &rarr;
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse">Loading TDS liabilities...</div>
      ) : !tdsData ? (
        <div className="text-slate-500">Failed to load TDS data.</div>
      ) : (
        <div className="space-y-8">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(tdsData.summary).map(([section, amount]) => (
              <div key={section} className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="text-6xl font-black">🏛️</div>
                </div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Section {section}</h4>
                <div className="text-3xl font-black text-rose-400">₹{amount.toLocaleString('en-IN')}</div>
                <div className="text-xs font-semibold text-slate-500 mt-2">Pending Liability</div>
              </div>
            ))}
            {Object.keys(tdsData.summary).length === 0 && (
              <div className="col-span-3 p-6 bg-emerald-900/10 border border-emerald-900/50 rounded-xl text-emerald-400 text-center font-bold">
                🎉 No pending TDS liabilities for the current period.
              </div>
            )}
          </div>

          {/* Ledger Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white">Recent TDS Deductions (Current Month)</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Date</th>
                  <th className="p-4">Section Code</th>
                  <th className="p-4 text-right">TDS Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {tdsData.records.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">No recent deductions.</td></tr>
                ) : (
                  tdsData.records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/20">
                      <td className="p-4 text-sm text-slate-400">{new Date(record.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-bold text-white">{record.notes || 'Unknown Section'}</td>
                      <td className="p-4 text-sm font-mono font-bold text-rose-400 text-right">₹{record.amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
