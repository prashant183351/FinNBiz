'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

interface Employee {
  id: string
  name: string
  role: string
  active: boolean
  employeeId?: string
}

export default function AttendancePage() {
  const { token, activeCompany } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchEmployees()
    }
  }, [activeCompany, token])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/employees?companyId=${activeCompany?.id}&active=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setEmployees(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const markAttendance = async (employeeId: string, status: 'Present' | 'Absent' | 'Half') => {
    if (!activeCompany) return
    try {
      // Typically goes to POST /api/hr/attendance or similar
      alert(`${status} logged for ${date}!`)
      // Optimistic UI update could go here
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/hr" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; Back
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{t('hr.attendance.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{t('hr.attendance.title')}</h2>
          <p className="text-sm text-slate-400">{t('hr.attendance.desc')}</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-1/4">Staff ID</th>
                <th className="p-4 w-1/3">Name</th>
                <th className="p-4 text-center w-5/12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">Loading roster...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500 bg-slate-900/40 border border-slate-800">{t('hr.employees.empty')}</td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 text-sm font-mono text-slate-500">{emp.employeeId || emp.id.substring(0,8)}</td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-white">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.role}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => markAttendance(emp.id, 'Present')} className="flex-1 max-w-[120px] py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg transition-colors">
                          {t('hr.attendance.mark')}
                        </button>
                        <button onClick={() => markAttendance(emp.id, 'Half')} className="flex-1 max-w-[120px] py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-lg transition-colors">
                          Half-Day
                        </button>
                        <button onClick={() => markAttendance(emp.id, 'Absent')} className="flex-1 max-w-[120px] py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-lg transition-colors">
                          {t('hr.attendance.absent')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
