'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'

interface Employee {
  id: string
  name: string
  role: string
  department: string
  active: boolean
}

export default function HRDashboardPage() {
  const { token, activeCompany } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

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

  const activeCount = employees.filter(e => e.active).length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-pink-900/10 blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; Back
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{t('hr.dashboard.title')}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white">{t('hr.dashboard.title')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('hr.dashboard.desc')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col items-start justify-center backdrop-blur-xl">
            <span className="text-sm font-semibold text-slate-400">{t('hr.dashboard.active')}</span>
            <h3 className="text-4xl font-black text-white mt-2">{loading ? '...' : activeCount}</h3>
          </div>
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col items-start justify-center backdrop-blur-xl">
            <span className="text-sm font-semibold text-slate-400">{t('hr.dashboard.cycle')}</span>
            <h3 className="text-4xl font-black text-white mt-2">{new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}</h3>
          </div>
        </div>

        {/* Action Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employee Directory */}
          <div 
            onClick={() => router.push('/dashboard/hr/employees')}
            className="p-8 bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 rounded-3xl group cursor-pointer transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">{t('hr.dashboard.dir')}</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed line-clamp-3">
              {t('hr.dashboard.dir_desc')}
            </p>
          </div>

          {/* Daily Attendance */}
          <div 
            onClick={() => router.push('/dashboard/hr/attendance')}
            className="p-8 bg-slate-900/40 border border-slate-800 hover:border-emerald-500/50 rounded-3xl group cursor-pointer transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">{t('hr.attendance.title')}</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed line-clamp-3">
              {t('hr.attendance.desc')}
            </p>
          </div>

          {/* Payroll Engine */}
          <div 
            onClick={() => router.push('/dashboard/hr/payroll')}
            className="p-8 bg-slate-900/40 border border-slate-800 hover:border-pink-500/50 rounded-3xl group cursor-pointer transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">{t('hr.dashboard.run')}</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed line-clamp-3">
              {t('hr.dashboard.run_desc')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
