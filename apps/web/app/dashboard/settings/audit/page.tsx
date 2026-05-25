'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

export default function AuditLogsPage() {
  const { token, activeCompany } = useAuth()
  const { language } = useI18n()
  const router = useRouter()

  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => {
    if (!token) {
      router.push('/login')
    } else if (activeCompany) {
      fetchAuditLogs()
    }
  }, [token, activeCompany, filterAction])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      let url = `http://localhost:3001/api/admin/audit?limit=100`
      if (filterAction) url += `&action=${filterAction}`
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setLogs(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-black text-white mb-2">
            {language === 'hi' ? 'ऑडिट लॉग' : 'Audit Logs'}
          </h2>
          <p className="text-sm text-slate-400">
            {language === 'hi' 
              ? 'अपनी कंपनी के सभी उपयोगकर्ताओं की गतिविधियों को ट्रैक करें।' 
              : 'Track and monitor all user activities within your company.'}
          </p>
        </div>
        <div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-sm font-semibold rounded-xl px-4 py-2 outline-none focus:border-indigo-500"
          >
            <option value="">All Actions</option>
            <option value="create_invoice">Create Invoice</option>
            <option value="update_company">Update Company</option>
            <option value="invite_user">Invite User</option>
            <option value="delete_record">Deletions</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse">Loading logs...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Timestamp</th>
                <th className="p-4">User</th>
                <th className="p-4">Action</th>
                <th className="p-4">Resource</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 text-xs text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-bold text-white">
                      {log.user?.name || log.user?.email || 'System'}
                    </td>
                    <td className="p-4 text-sm text-slate-300 font-semibold">
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td className="p-4 text-xs font-mono text-indigo-400">
                      {log.resource} ({log.resourceId})
                    </td>
                    <td className="p-4 text-center">
                      {log.success ? (
                        <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800 rounded text-[10px] font-black uppercase">
                          Success
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-rose-900/30 text-rose-400 border border-rose-800 rounded text-[10px] font-black uppercase">
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
