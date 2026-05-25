'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

export default function ProfilePage() {
  const { token, activeCompany } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  const [companyData, setCompanyData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [gstin, setGstin] = useState('')
  const [pan, setPan] = useState('')
  const [address, setAddress] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    if (!token) {
      router.push('/login')
    } else if (activeCompany) {
      fetchCompany()
    }
  }, [token, activeCompany])

  const fetchCompany = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:3001/api/companies/${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCompanyData(data)
        setName(data.name || '')
        setGstin(data.gstin || '')
        setPan(data.pan || '')
        setAddress(data.address || '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: '', type: '' })
    try {
      const res = await fetch(`http://localhost:3001/api/companies/${activeCompany?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, gstin, pan, address })
      })
      if (res.ok) {
        setMessage({ text: language === 'hi' ? 'प्रोफ़ाइल अपडेट हो गई!' : 'Profile updated successfully!', type: 'success' })
        fetchCompany() // refresh
      } else {
        const data = await res.json()
        setMessage({ text: data.error || 'Failed to update profile', type: 'error' })
      }
    } catch (err) {
      setMessage({ text: 'Network error. Could not save.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-slate-500 animate-pulse">Loading profile...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-2">
        {language === 'hi' ? 'कंपनी प्रोफ़ाइल' : 'Company Profile'}
      </h2>
      <p className="text-sm text-slate-400 mb-8">
        {language === 'hi' 
          ? 'अपने व्यवसाय के वैधानिक विवरण जैसे GSTIN, PAN और पता प्रबंधित करें।' 
          : 'Manage your business statutory details like GSTIN, PAN, and address.'}
      </p>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-rose-900/30 text-rose-400 border border-rose-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {language === 'hi' ? 'कंपनी का नाम' : 'Company Name'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              GSTIN
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 27AADCB2230M1Z2"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              PAN
            </label>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="e.g. AADCB2230M"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all uppercase"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {language === 'hi' ? 'पंजीकृत पता' : 'Registered Address'}
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all resize-none"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold rounded-xl tracking-wide shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
          >
            {saving 
              ? (language === 'hi' ? 'सेव हो रहा है...' : 'Saving...') 
              : (language === 'hi' ? 'बदलाव सेव करें' : 'Save Changes')
            }
          </button>
        </div>
      </form>
    </div>
  )
}
