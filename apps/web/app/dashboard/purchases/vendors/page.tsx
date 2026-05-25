'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

export default function VendorsPage() {
  const { token, activeCompany } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Form State
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [gstin, setGstin] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    if (!token) {
      router.push('/login')
    } else if (activeCompany) {
      fetchVendors()
    }
  }, [token, activeCompany])

  const fetchVendors = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:3001/api/vendors?companyId=${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setVendors(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ companyId: activeCompany?.id, name, gstin, phone, email, address })
      })
      if (res.ok) {
        setModalOpen(false)
        setName(''); setGstin(''); setPhone(''); setEmail(''); setAddress('')
        fetchVendors()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vendor?')) return
    try {
      const res = await fetch(`http://localhost:3001/api/vendors/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) fetchVendors()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-black text-white mb-2">
            {language === 'hi' ? 'वेंडर्स (आपूर्तिकर्ता)' : 'Vendors & Suppliers'}
          </h2>
          <p className="text-sm text-slate-400">
            {language === 'hi' ? 'अपने सभी सप्लायर्स और उनके GSTIN डिटेल्स मैनेज करें।' : 'Manage your suppliers, their GST details, and contact info.'}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all"
        >
          + Add Vendor
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse">Loading vendors...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Vendor Name</th>
                <th className="p-4">GSTIN</th>
                <th className="p-4">Contact</th>
                <th className="p-4 text-center">Bills</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {vendors.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No vendors found.</td></tr>
              ) : (
                vendors.map(vendor => (
                  <tr key={vendor.id} className="hover:bg-slate-800/20">
                    <td className="p-4 font-bold text-white">{vendor.name}</td>
                    <td className="p-4 text-sm font-mono text-emerald-400">{vendor.gstin || 'UNREGISTERED'}</td>
                    <td className="p-4 text-xs text-slate-400">
                      <div>{vendor.email}</div>
                      <div>{vendor.phone}</div>
                    </td>
                    <td className="p-4 text-center text-sm font-bold text-indigo-400">
                      {vendor._count?.purchaseOrders || 0}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(vendor.id)} className="text-xs font-bold text-rose-400 hover:text-rose-300">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Vendor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-black text-white mb-6">Add New Vendor</h3>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Company/Vendor Name *</label>
                  <input required value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">GSTIN</label>
                  <input value={gstin} onChange={e=>setGstin(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Phone</label>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Address</label>
                  <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-300">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
