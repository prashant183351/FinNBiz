'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'

export default function GSTR1Page() {
  const { token, activeCompany } = useAuth()
  const router = useRouter()
  
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'b2b' | 'b2cs' | 'hsn'>('b2b')

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchGSTR1()
    }
  }, [activeCompany, token, month, year])

  const fetchGSTR1 = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:3001/api/reports/gstr1?companyId=${activeCompany?.id}&month=${month}&year=${year}`, {
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

  const downloadJSON = () => {
    if (!data) return
    
    // GSTR-1 Offline Utility expected format (simplified for demo)
    const gstr1Payload = {
      gstin: activeCompany?.gstin || "URP",
      fp: `${month.toString().padStart(2, '0')}${year}`,
      gt: 0,
      cur_gt: 0,
      b2b: data.b2b.map((inv: any) => ({
        ctin: inv.gstin,
        inv: [{
          inum: inv.invNo,
          idt: inv.invDate,
          val: inv.val,
          pos: "27", // Example Place of Supply
          rchrg: "N",
          inv_typ: "R",
          itms: [{ num: 1, itm_det: { txval: inv.txval, rt: 18, igst: inv.igst, cgst: inv.cgst, sgst: inv.sgst } }]
        }]
      })),
      b2cs: data.b2cs.length > 0 ? [{
        sply_ty: "INTRA",
        txval: data.b2cs.reduce((acc: number, val: any) => acc + val.txval, 0),
        typ: "OE",
        rt: 18,
        igst: data.b2cs.reduce((acc: number, val: any) => acc + val.igst, 0),
        cgst: data.b2cs.reduce((acc: number, val: any) => acc + val.cgst, 0),
        sgst: data.b2cs.reduce((acc: number, val: any) => acc + val.sgst, 0)
      }] : [],
      hsn: {
        data: data.hsn.map((h: any) => ({
          num: 1,
          hsn_sc: h.hsn,
          desc: h.desc,
          uqc: "OTH",
          qty: h.qty,
          val: h.val,
          txval: h.txval,
          igst: h.igst,
          cgst: h.cgst,
          sgst: h.sgst
        }))
      }
    }

    const blob = new Blob([JSON.stringify(gstr1Payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `GSTR1_${activeCompany?.gstin || 'URP'}_${month}_${year}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/reports" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
              &larr; Back to Reports
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">GSTR-1 Preparation</span>
          </div>
          <button 
            onClick={downloadJSON}
            disabled={!data || data.summary.totalInvoices === 0}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg tracking-wide transition-all shadow-lg shadow-emerald-500/20"
          >
            Download JSON (Offline Tool)
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        
        {/* Controls */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Outward Supplies (GSTR-1)</h2>
            <p className="text-sm text-slate-400 mt-1">Review your outward B2B and B2C supplies before filing.</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <select 
              value={month} 
              onChange={e => setMonth(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-emerald-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select 
              value={year} 
              onChange={e => setYear(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-emerald-500"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Compiling GSTR-1 data...</div>
        ) : !data ? (
          <div className="text-center py-20 text-rose-500">Failed to load data.</div>
        ) : (
          <>
            {/* Summary Widget */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Invoices</p>
                <h4 className="text-xl font-black text-white">{data.summary.totalInvoices}</h4>
              </div>
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Taxable Value (₹)</p>
                <h4 className="text-xl font-black text-emerald-400">{data.summary.totalTaxableValue.toLocaleString('en-IN', {maximumFractionDigits:2})}</h4>
              </div>
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total IGST (₹)</p>
                <h4 className="text-xl font-black text-indigo-400">{data.summary.totalIGST.toLocaleString('en-IN', {maximumFractionDigits:2})}</h4>
              </div>
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total CGST (₹)</p>
                <h4 className="text-xl font-black text-sky-400">{data.summary.totalCGST.toLocaleString('en-IN', {maximumFractionDigits:2})}</h4>
              </div>
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total SGST (₹)</p>
                <h4 className="text-xl font-black text-sky-400">{data.summary.totalSGST.toLocaleString('en-IN', {maximumFractionDigits:2})}</h4>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-800">
              <button onClick={() => setActiveTab('b2b')} className={`pb-3 text-sm font-bold tracking-wide ${activeTab === 'b2b' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>B2B Invoices (4A, 4B)</button>
              <button onClick={() => setActiveTab('b2cs')} className={`pb-3 text-sm font-bold tracking-wide ${activeTab === 'b2cs' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>B2C Small (7)</button>
              <button onClick={() => setActiveTab('hsn')} className={`pb-3 text-sm font-bold tracking-wide ${activeTab === 'hsn' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>HSN Summary (12)</button>
            </div>

            {/* Tab Content */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                {activeTab === 'b2b' && (
                  <>
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4">Customer</th>
                        <th className="p-4">GSTIN</th>
                        <th className="p-4">Invoice No.</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-right">Taxable (₹)</th>
                        <th className="p-4 text-right">IGST (₹)</th>
                        <th className="p-4 text-right">CGST (₹)</th>
                        <th className="p-4 text-right">SGST (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.b2b.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-500">No B2B invoices found for this period.</td></tr>
                      ) : data.b2b.map((inv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="p-4 text-sm font-bold text-white">{inv.customerName}</td>
                          <td className="p-4 text-sm font-mono text-emerald-400/80">{inv.gstin}</td>
                          <td className="p-4 text-sm text-slate-300">{inv.invNo}</td>
                          <td className="p-4 text-sm text-slate-400">{inv.invDate}</td>
                          <td className="p-4 text-sm text-white font-bold text-right">{inv.txval.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{inv.igst.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{inv.cgst.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{inv.sgst.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'b2cs' && (
                  <>
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4">Customer</th>
                        <th className="p-4">Invoice No.</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-right">Taxable (₹)</th>
                        <th className="p-4 text-right">IGST (₹)</th>
                        <th className="p-4 text-right">CGST (₹)</th>
                        <th className="p-4 text-right">SGST (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.b2cs.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">No B2C invoices found for this period.</td></tr>
                      ) : data.b2cs.map((inv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="p-4 text-sm font-bold text-white">{inv.customerName}</td>
                          <td className="p-4 text-sm text-slate-300">{inv.invNo}</td>
                          <td className="p-4 text-sm text-slate-400">{inv.invDate}</td>
                          <td className="p-4 text-sm text-white font-bold text-right">{inv.txval.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{inv.igst.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{inv.cgst.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{inv.sgst.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'hsn' && (
                  <>
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4">HSN Code</th>
                        <th className="p-4">Description</th>
                        <th className="p-4 text-right">Total Qty</th>
                        <th className="p-4 text-right">Total Value (₹)</th>
                        <th className="p-4 text-right">Taxable Value (₹)</th>
                        <th className="p-4 text-right">IGST (₹)</th>
                        <th className="p-4 text-right">CGST (₹)</th>
                        <th className="p-4 text-right">SGST (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.hsn.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-500">No HSN records found for this period.</td></tr>
                      ) : data.hsn.map((h: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="p-4 text-sm font-bold text-emerald-400/80">{h.hsn}</td>
                          <td className="p-4 text-sm text-slate-300">{h.desc}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{h.qty}</td>
                          <td className="p-4 text-sm text-white font-bold text-right">{h.val.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{h.txval.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{h.igst.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{h.cgst.toFixed(2)}</td>
                          <td className="p-4 text-sm text-slate-400 text-right">{h.sgst.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
