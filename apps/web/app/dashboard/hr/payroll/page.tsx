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
  salary: number
  active: boolean
  employeeId?: string
}

export default function PayrollPage() {
  const { token, activeCompany } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())

  // Mock Payslip Data Map (In a real app, this would be fetched from /api/hr/payslip/...)
  const [payslips, setPayslips] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchEmployeesAndPayroll()
    }
  }, [activeCompany, token, month, year])

  const fetchEmployeesAndPayroll = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/employees?companyId=${activeCompany?.id}&active=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const emps: Employee[] = await res.json()
        setEmployees(emps)
        
        // Fetch payroll for each employee (Mocking the response for now, ideally backend has a bulk route)
        const mockPayslips: Record<string, any> = {}
        for (const emp of emps) {
          // Simulated net pay calculation based on attendance (dummy logic)
          mockPayslips[emp.id] = {
            basicSalary: emp.salary,
            netPay: emp.salary - (Math.random() * 500), // Random deductions for display
            status: 'Pending'
          }
        }
        setPayslips(mockPayslips)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const markPaid = (employeeId: string) => {
    // Optimistic Update
    setPayslips(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        status: 'Paid'
      }
    }))
    alert('Payment recorded in Ledger!')
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
            <span className="text-lg font-bold text-white">{t('hr.payroll.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={month} 
              onChange={e => setMonth(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-pink-500"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', {month: 'long'})}</option>
              ))}
            </select>
            <select 
              value={year} 
              onChange={e => setYear(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-pink-500"
            >
              {[year - 1, year, year + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{t('hr.payroll.title')}</h2>
          <p className="text-sm text-slate-400">{t('hr.payroll.desc')}</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Name</th>
                <th className="p-4 text-right">Basic Salary</th>
                <th className="p-4 text-right">Calculated Net Pay</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Calculating salaries...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 bg-slate-900/40 border border-slate-800">{t('hr.employees.empty')}</td>
                </tr>
              ) : (
                employees.map(emp => {
                  const slip = payslips[emp.id]
                  const isPaid = slip?.status === 'Paid'
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-bold text-white">{emp.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">ID: {emp.employeeId || emp.id.substring(0,8)}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-400 text-right">
                        ₹{emp.salary.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-sm font-bold text-pink-400 text-right">
                        ₹{slip ? Math.round(slip.netPay).toLocaleString('en-IN') : '...'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                          {slip?.status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {!isPaid && (
                          <button onClick={() => markPaid(emp.id)} className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition-all">
                            Mark Paid
                          </button>
                        )}
                        {isPaid && (
                          <button className="px-4 py-1.5 border border-slate-700 text-slate-400 text-xs font-bold rounded-lg transition-all hover:bg-slate-800" onClick={() => alert('Downloading PDF Payslip...')}>
                            Download Payslip
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
