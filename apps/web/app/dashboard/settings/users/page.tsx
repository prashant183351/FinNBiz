'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

export default function UsersPage() {
  const { token, activeCompany } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

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
        setCompany(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setMessage({ text: '', type: '' })
    try {
      const res = await fetch(`http://localhost:3001/api/companies/${activeCompany?.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail, roleName: inviteRole })
      })
      
      const data = await res.json()
      if (res.ok) {
        setMessage({ text: 'User invited successfully!', type: 'success' })
        setInviteModalOpen(false)
        setInviteEmail('')
        fetchCompany()
      } else {
        setMessage({ text: data.error || 'Failed to invite user.', type: 'error' })
      }
    } catch (err) {
      setMessage({ text: 'Network error.', type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return
    setActionLoading(true)
    setMessage({ text: '', type: '' })
    try {
      const res = await fetch(`http://localhost:3001/api/companies/${activeCompany?.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        setMessage({ text: 'User removed successfully!', type: 'success' })
        fetchCompany()
      } else {
        const data = await res.json()
        setMessage({ text: data.error || 'Failed to remove user.', type: 'error' })
      }
    } catch (err) {
      setMessage({ text: 'Network error.', type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(true)
    setMessage({ text: '', type: '' })
    try {
      const res = await fetch(`http://localhost:3001/api/companies/${activeCompany?.id}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roleName: newRole })
      })
      
      if (res.ok) {
        setMessage({ text: 'Role updated successfully!', type: 'success' })
        fetchCompany()
      } else {
        const data = await res.json()
        setMessage({ text: data.error || 'Failed to update role.', type: 'error' })
      }
    } catch (err) {
      setMessage({ text: 'Network error.', type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !company) {
    return <div className="text-slate-500 animate-pulse">Loading users...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-black text-white mb-2">
            {language === 'hi' ? 'उपयोगकर्ता और भूमिकाएँ' : 'Users & Roles'}
          </h2>
          <p className="text-sm text-slate-400">
            {language === 'hi' 
              ? 'अपनी टीम को प्रबंधित करें और उनकी पहुँच (Access) नियंत्रित करें।' 
              : 'Manage your team members and control their access levels.'}
          </p>
        </div>
        <button
          onClick={() => { setMessage({text:'', type:''}); setInviteModalOpen(true); }}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl tracking-wide shadow-lg shadow-emerald-500/20 transition-all"
        >
          + {language === 'hi' ? 'उपयोगकर्ता जोड़ें' : 'Invite User'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-rose-900/30 text-rose-400 border border-rose-800'}`}>
          {message.text}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {company.memberships.map((m: any) => (
              <tr key={m.user.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4">
                  <div className="text-sm font-bold text-white">{m.user.name || 'Unnamed User'}</div>
                  <div className="text-xs text-slate-400">{m.user.email}</div>
                </td>
                <td className="p-4">
                  <select
                    disabled={actionLoading}
                    value={m.role.name}
                    onChange={(e) => handleRoleChange(m.user.id, e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 uppercase tracking-wide disabled:opacity-50"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleRemove(m.user.id)}
                    disabled={actionLoading || m.role.name === 'owner'}
                    className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-30"
                  >
                    {language === 'hi' ? 'हटाएं' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-2">Invite New User</h3>
            <p className="text-xs text-slate-400 mb-6">Enter their registered email address to grant them access to this company.</p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 outline-none uppercase font-semibold"
                >
                  <option value="admin">Admin (Full Access)</option>
                  <option value="accountant">Accountant (Billing & Reports)</option>
                  <option value="member">Member (Standard)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {actionLoading ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
