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
  department: string
  salary: number
  joinDate: string
  active: boolean
  employeeId?: string
}

export default function EmployeesPage() {
  const { token, activeCompany } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    panNumber: '',
    aadhaarNumber: '',
    bankAccount: '',
    ifscCode: ''
  })

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
      const res = await fetch(`${API_BASE_URL}/employees?companyId=${activeCompany?.id}`, {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany) return
    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          companyId: activeCompany.id,
          salary: parseFloat(formData.salary)
        })
      })
      if (res.ok) {
        setShowForm(false)
        fetchEmployees() // Refresh
        setFormData({
          name: '', email: '', phone: '', role: '', department: '',
          salary: '', joinDate: new Date().toISOString().split('T')[0],
          panNumber: '', aadhaarNumber: '', bankAccount: '', ifscCode: ''
        })
      }
    } catch (err) {
      console.error('Failed to add employee', err)
    }
  }

  const markAttendance = async (employeeId: string, status: 'Present' | 'Absent' | 'Half') => {
    if (!activeCompany) return
    try {
      // Typically goes to POST /api/hr/attendance or similar
      // For now we simulate an optimistic UI update or call the actual endpoint if built
      alert(`${t('hr.attendance.mark')} - ${status} logged!`)
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
            <span className="text-lg font-bold text-white">{t('hr.employees.title')}</span>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg tracking-wide transition-all"
          >
            {showForm ? t('hr.employees.cancel') : t('hr.employees.add')}
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        
        {/* ADD EMPLOYEE FORM */}
        {showForm && (
          <div className="mb-8 p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-4">{t('hr.employees.onboard')}</h3>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{t('hr.employees.name')}</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{t('hr.employees.email')}</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{t('hr.employees.phone')}</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{t('hr.employees.role')}</label>
                  <input type="text" required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{t('hr.employees.dept')}</label>
                  <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{t('hr.employees.salary')}</label>
                  <input type="number" required value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{t('hr.employees.join')}</label>
                  <input type="date" required value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all">
                  {t('hr.employees.save')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DATA TABLE (Responsive Mobile Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full p-8 text-center text-slate-500">Loading roster...</div>
          ) : employees.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">{t('hr.employees.empty')}</div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800/40 transition-colors relative overflow-hidden">
                {!emp.active && (
                  <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">Inactive</div>
                )}
                
                <div className="flex items-start justify-between mb-4 mt-2">
                  <div>
                    <h4 className="text-lg font-bold text-white">{emp.name}</h4>
                    <p className="text-xs font-medium text-slate-400 mb-1">{emp.role} &bull; {emp.department || 'General'}</p>
                    <p className="text-[10px] font-mono text-slate-500">ID: {emp.employeeId || emp.id.substring(0,8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">₹{emp.salary.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-500">per month</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/60 mt-auto flex gap-2">
                  <button onClick={() => markAttendance(emp.id, 'Present')} disabled={!emp.active} className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                    {t('hr.attendance.mark')}
                  </button>
                  <button onClick={() => markAttendance(emp.id, 'Absent')} disabled={!emp.active} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                    {t('hr.attendance.absent')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
