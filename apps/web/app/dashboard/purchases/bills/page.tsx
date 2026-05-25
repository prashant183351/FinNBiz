'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

export default function PurchaseBillsPage() {
  const { token, activeCompany } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  const [bills, setBills] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  // New Bill Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [vendorId, setVendorId] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [tdsSection, setTdsSection] = useState('')
  const [tdsAmount, setTdsAmount] = useState(0)
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitPrice: 0 }])

  const tdsSections = [
    { code: '', label: 'No TDS Deducted' },
    { code: '194C (1%)', label: '194C - Contractor (1%)' },
    { code: '194C (2%)', label: '194C - Contractor (2%)' },
    { code: '194J (10%)', label: '194J - Professional Services (10%)' },
    { code: '194I (10%)', label: '194I - Rent for Property (10%)' },
    { code: '194H (5%)', label: '194H - Commission/Brokerage (5%)' }
  ]

  useEffect(() => {
    if (!token) router.push('/login')
    else if (activeCompany) {
      fetchData()
    }
  }, [token, activeCompany])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [billsRes, vendorsRes, productsRes] = await Promise.all([
        fetch(`http://localhost:3001/api/purchases?companyId=${activeCompany?.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`http://localhost:3001/api/vendors?companyId=${activeCompany?.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`http://localhost:3001/api/inventory?companyId=${activeCompany?.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ])
      
      if (billsRes.ok) setBills(await billsRes.json())
      if (vendorsRes.ok) setVendors(await vendorsRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }])
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index))
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          vendorId,
          orderNumber,
          tdsSection,
          tdsAmount: Number(tdsAmount),
          items: items.map(item => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }))
        })
      })
      
      if (res.ok) {
        setModalOpen(false)
        setVendorId(''); setOrderNumber(''); setTdsSection(''); setTdsAmount(0); setItems([{ productId: '', quantity: 1, unitPrice: 0 }])
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create bill')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const totalBillAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const finalPayable = totalBillAmount - tdsAmount

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-black text-white mb-2">Purchase Bills</h2>
          <p className="text-sm text-slate-400">Log incoming bills, track inventory, and calculate TDS.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all"
        >
          + Log New Bill
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse">Loading bills...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Bill No</th>
                <th className="p-4">Vendor</th>
                <th className="p-4">Date</th>
                <th className="p-4">Items</th>
                <th className="p-4 text-right">Total Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {bills.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No purchase bills found.</td></tr>
              ) : (
                bills.map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-800/20">
                    <td className="p-4 font-mono font-bold text-white">{bill.orderNumber}</td>
                    <td className="p-4 text-sm text-slate-300 font-semibold">{bill.vendor?.name}</td>
                    <td className="p-4 text-xs text-slate-400">{new Date(bill.orderDate).toLocaleDateString()}</td>
                    <td className="p-4 text-sm text-indigo-400 font-bold">{bill.items.length} items</td>
                    <td className="p-4 text-right">
                      <div className="font-bold text-emerald-400">₹{bill.totalAmount.toLocaleString('en-IN')}</div>
                      {bill.notes && bill.notes.includes('TDS Deducted') && (
                        <div className="text-[10px] text-rose-400 uppercase tracking-widest mt-1">
                          {bill.notes.split('|')[1].trim()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Bill Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 relative">
            <h3 className="text-lg font-black text-white mb-6">Log Purchase Bill</h3>
            <form onSubmit={handleCreateBill} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Vendor *</label>
                  <select required value={vendorId} onChange={e=>setVendorId(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Select Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.gstin || 'Unregistered'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Bill / Invoice Number *</label>
                  <input required value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950 border-b border-slate-800">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-400 uppercase">Item / Product (Inventory Sync)</th>
                      <th className="p-3 text-xs font-bold text-slate-400 uppercase w-24">Qty</th>
                      <th className="p-3 text-xs font-bold text-slate-400 uppercase w-32">Rate (₹)</th>
                      <th className="p-3 text-xs font-bold text-slate-400 uppercase w-32">Total</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50">
                        <td className="p-2">
                          <select required value={item.productId} onChange={e=>handleItemChange(idx, 'productId', e.target.value)} className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white">
                            <option value="">Select Item</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input type="number" min="1" required value={item.quantity} onChange={e=>handleItemChange(idx, 'quantity', e.target.value)} className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white" />
                        </td>
                        <td className="p-2">
                          <input type="number" step="0.01" min="0" required value={item.unitPrice} onChange={e=>handleItemChange(idx, 'unitPrice', e.target.value)} className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white" />
                        </td>
                        <td className="p-2 text-sm font-mono text-emerald-400 font-bold">
                          ₹{(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          {items.length > 1 && <button type="button" onClick={()=>handleRemoveItem(idx)} className="text-rose-500 font-bold hover:text-rose-400">×</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-950 p-3">
                  <button type="button" onClick={handleAddItem} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">+ Add Another Item</button>
                </div>
              </div>

              {/* TDS Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-300 mb-4">Tax Deducted at Source (TDS)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">TDS Section</label>
                    <select value={tdsSection} onChange={e=>setTdsSection(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm">
                      {tdsSections.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                  </div>
                  {tdsSection && (
                    <div>
                      <label className="block text-xs font-bold text-rose-400 mb-1">TDS Amount to Deduct (₹)</label>
                      <input type="number" step="0.01" min="0" value={tdsAmount} onChange={e=>setTdsAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-rose-950/20 border border-rose-800/50 rounded-lg text-rose-400 font-mono font-bold" />
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-between items-end bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div>
                  <div className="text-xs text-slate-400">Bill Subtotal: ₹{totalBillAmount.toFixed(2)}</div>
                  {tdsAmount > 0 && <div className="text-xs text-rose-400">Less TDS: -₹{tdsAmount.toFixed(2)}</div>}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Net Payable to Vendor</div>
                  <div className="text-3xl font-black text-emerald-400">₹{finalPayable.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-300">Cancel</button>
                <button type="submit" disabled={actionLoading || items.length === 0} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50">Log Bill & Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
