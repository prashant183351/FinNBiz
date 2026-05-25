'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'

export default function GSTR3BPage() {
  const { token, activeCompany } = useAuth()
  const router = useRouter()
  
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchGSTR3B()
    }
  }, [activeCompany, token, month, year])

  const fetchGSTR3B = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:3001/api/reports/gstr3b?companyId=${activeCompany?.id}&month=${month}&year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center print:bg-white print:text-black">
      <header className="w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 print:hidden">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/reports" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
              &larr; Back to Reports
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">GSTR-3B Summary</span>
          </div>
          <button 
            onClick={handlePrint}
            disabled={!data}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg tracking-wide transition-all shadow-lg shadow-indigo-500/20"
          >
            🖨️ Print GSTR-3B
          </button>
        </div>
      </header>

      <main className="w-full max-w-4xl px-4 py-8 flex-grow">
        
        {/* Controls */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">GSTR-3B Filing Summary</h2>
            <p className="text-sm text-slate-400 mt-1">Review your Net GST Liability after offsetting Input Tax Credit.</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <select 
              value={month} 
              onChange={e => setMonth(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select 
              value={year} 
              onChange={e => setYear(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-black uppercase">FORM GSTR-3B</h1>
          <p className="text-sm mt-1">See Rule 61(5)</p>
          <div className="mt-4 flex justify-between text-left font-bold text-sm">
            <div>
              <p>GSTIN: {activeCompany?.gstin || 'URP'}</p>
              <p>Legal Name: {activeCompany?.name}</p>
            </div>
            <div>
              <p>Year: {year}</p>
              <p>Month: {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Compiling GSTR-3B data...</div>
        ) : !data ? (
          <div className="text-center py-20 text-rose-500">Failed to load data.</div>
        ) : (
          <div className="space-y-8">
            
            {/* Table 3.1: Outward Supplies */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl print:border-black print:rounded-none overflow-hidden">
              <div className="p-4 bg-slate-900 border-b border-slate-800 print:bg-gray-100 print:border-black">
                <h3 className="text-sm font-bold text-white print:text-black">3.1 Details of Outward Supplies and inward supplies liable to reverse charge</h3>
              </div>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 print:bg-white print:text-black font-semibold">
                    <th className="p-3 border-b border-r border-slate-800 print:border-black">Nature of Supplies</th>
                    <th className="p-3 border-b border-r border-slate-800 print:border-black text-right">Total Taxable Value (₹)</th>
                    <th className="p-3 border-b border-r border-slate-800 print:border-black text-right">Integrated Tax (₹)</th>
                    <th className="p-3 border-b border-r border-slate-800 print:border-black text-right">Central Tax (₹)</th>
                    <th className="p-3 border-b border-slate-800 print:border-black text-right">State/UT Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 print:text-black">
                  <tr className="border-b border-slate-800 print:border-black">
                    <td className="p-3 border-r border-slate-800 print:border-black">(a) Outward taxable supplies</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">{data.table3.outwardTaxable.toFixed(2)}</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">{data.table3.outwardIgst.toFixed(2)}</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">{data.table3.outwardCgst.toFixed(2)}</td>
                    <td className="p-3 text-right">{data.table3.outwardSgst.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 4: Eligible ITC */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl print:border-black print:rounded-none overflow-hidden">
              <div className="p-4 bg-slate-900 border-b border-slate-800 print:bg-gray-100 print:border-black">
                <h3 className="text-sm font-bold text-white print:text-black">4. Eligible ITC (Input Tax Credit)</h3>
              </div>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 print:bg-white print:text-black font-semibold">
                    <th className="p-3 border-b border-r border-slate-800 print:border-black">Details</th>
                    <th className="p-3 border-b border-r border-slate-800 print:border-black text-right">Integrated Tax (₹)</th>
                    <th className="p-3 border-b border-r border-slate-800 print:border-black text-right">Central Tax (₹)</th>
                    <th className="p-3 border-b border-slate-800 print:border-black text-right">State/UT Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 print:text-black">
                  <tr className="border-b border-slate-800 print:border-black font-semibold text-white print:text-black bg-slate-900 print:bg-transparent">
                    <td className="p-3 border-r border-slate-800 print:border-black">(A) ITC Available (whether in full or part)</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">{data.table4.itcIgst.toFixed(2)}</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">{data.table4.itcCgst.toFixed(2)}</td>
                    <td className="p-3 text-right">{data.table4.itcSgst.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-slate-800 print:border-black">
                    <td className="p-3 border-r border-slate-800 print:border-black">(B) ITC Reversed</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">0.00</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">0.00</td>
                    <td className="p-3 text-right">0.00</td>
                  </tr>
                  <tr className="font-bold text-emerald-400 print:text-black bg-emerald-900/10 print:bg-transparent">
                    <td className="p-3 border-r border-slate-800 print:border-black">(C) Net ITC Available (A) - (B)</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">{data.table4.itcIgst.toFixed(2)}</td>
                    <td className="p-3 border-r border-slate-800 print:border-black text-right">{data.table4.itcCgst.toFixed(2)}</td>
                    <td className="p-3 text-right">{data.table4.itcSgst.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment of Tax / Net Payable */}
            <div className="bg-slate-900 text-white p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center print:border-2 print:border-black print:bg-white print:text-black print:rounded-none gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400 print:text-black">Net Tax Payable (Cash Ledger)</p>
                <h2 className="text-4xl font-black mt-2 text-indigo-400 print:text-black">
                  ₹{data.payment.totalPayable.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </h2>
                <p className="text-xs mt-2 text-slate-400 print:text-black">Output Tax minus Eligible ITC</p>
              </div>
              
              <div className="flex gap-8 text-right bg-slate-950 p-4 rounded-xl border border-slate-800 print:bg-transparent print:border-none">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider print:text-black">IGST</p>
                  <p className="font-mono mt-1 text-sm font-semibold">₹{data.payment.payableIgst.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider print:text-black">CGST</p>
                  <p className="font-mono mt-1 text-sm font-semibold">₹{data.payment.payableCgst.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider print:text-black">SGST</p>
                  <p className="font-mono mt-1 text-sm font-semibold">₹{data.payment.payableSgst.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="hidden print:flex justify-between items-end mt-20 pt-10">
              <div className="text-left w-1/2">
                <p className="text-xs">Date: ........................</p>
                <p className="text-xs mt-2">Place: ........................</p>
              </div>
              <div className="text-center w-1/2">
                <div className="w-48 mx-auto border-b border-black mb-2"></div>
                <p className="text-xs font-bold">Authorized Signatory</p>
              </div>
            </div>

          </div>
        )}
      </main>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
          }
          @page {
            margin: 10mm;
            size: A4 portrait;
          }
        }
      `}</style>
    </div>
  )
}
