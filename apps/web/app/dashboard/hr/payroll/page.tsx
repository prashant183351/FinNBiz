'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'

interface Employee {
  id: string
  name: string
  role: string
  department: string
  salary: number
  active: boolean
  employeeId?: string
}

interface PayrollCalculations {
  basic: number
  hra: number
  conveyance: number
  pf: number
  esi: number
  tds: number
  netPay: number
}

export default function PayrollPage() {
  const { token, activeCompany } = useAuth()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

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
      const res = await fetch(`http://localhost:3001/api/employees?companyId=${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.filter((e: Employee) => e.active))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Basic Indian Payroll Logic
  const calculatePayroll = (grossSalary: number): PayrollCalculations => {
    const basic = grossSalary * 0.5 // 50% Basic
    const hra = basic * 0.4 // 40% of Basic HRA
    const conveyance = grossSalary - (basic + hra) // Rest is allowances

    const pf = basic * 0.12 // 12% of Basic PF
    const esi = grossSalary <= 21000 ? grossSalary * 0.0075 : 0 // 0.75% ESI if salary <= 21k
    
    // Simplified TDS (0% if gross < 50k/mo, else flat 10% on excess)
    let tds = 0
    if (grossSalary > 50000) {
      tds = (grossSalary - 50000) * 0.1
    }

    const netPay = grossSalary - (pf + esi + tds)
    
    return { basic, hra, conveyance, pf, esi, tds, netPay }
  }

  const handleProcessPayroll = () => {
    setProcessing(true)
    // Simulate API delay
    setTimeout(() => {
      setProcessing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    }, 2000)
  }

  const totals = employees.reduce((acc, emp) => {
    const calc = calculatePayroll(emp.salary)
    return {
      gross: acc.gross + emp.salary,
      pf: acc.pf + calc.pf,
      tds: acc.tds + calc.tds,
      net: acc.net + calc.netPay
    }
  }, { gross: 0, pf: 0, tds: 0, net: 0 })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/hr" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; Back to HR
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">Payroll Processing</span>
          </div>
          
          <button 
            onClick={handleProcessPayroll}
            disabled={processing || employees.length === 0}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg tracking-wide transition-all shadow-lg shadow-pink-500/20"
          >
            {processing ? 'Processing...' : 'Run Payroll'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-white">Salary Run: {currentMonth}</h2>
            <p className="text-sm text-slate-400 mt-1">Review standard deductions and confirm net payouts before transferring.</p>
          </div>
        </div>

        {success && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="font-bold text-sm">Payroll successfully processed for {employees.length} employees! Payslips have been generated.</span>
          </div>
        )}

        {/* PAYROLL SUMMARY WIDGET */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Gross Salary</p>
            <h4 className="text-xl font-black text-white">₹{totals.gross.toLocaleString('en-IN', {maximumFractionDigits:0})}</h4>
          </div>
          <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total PF Payable</p>
            <h4 className="text-xl font-black text-indigo-400">₹{totals.pf.toLocaleString('en-IN', {maximumFractionDigits:0})}</h4>
          </div>
          <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total TDS Deducted</p>
            <h4 className="text-xl font-black text-rose-400">₹{totals.tds.toLocaleString('en-IN', {maximumFractionDigits:0})}</h4>
          </div>
          <div className="p-5 bg-gradient-to-br from-pink-500/20 to-purple-500/10 border border-pink-500/30 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-pink-300 font-bold mb-1">Net Bank Transfer</p>
            <h4 className="text-xl font-black text-pink-400">₹{totals.net.toLocaleString('en-IN', {maximumFractionDigits:0})}</h4>
          </div>
        </div>

        {/* PAYROLL TABLE */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4 text-right">Gross (₹)</th>
                <th className="p-4 text-right">Basic</th>
                <th className="p-4 text-right">HRA</th>
                <th className="p-4 text-right text-indigo-400/70">PF (12%)</th>
                <th className="p-4 text-right text-indigo-400/70">ESI</th>
                <th className="p-4 text-right text-rose-400/70">TDS</th>
                <th className="p-4 text-right text-pink-400">Net Pay</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">Loading payroll data...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">No active employees found to process.</td>
                </tr>
              ) : (
                employees.map(emp => {
                  const calc = calculatePayroll(emp.salary)
                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-bold text-white">{emp.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">{emp.employeeId || emp.id.substring(0,8)}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-300 font-bold text-right">{emp.salary.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-sm text-slate-400 text-right">{calc.basic.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-sm text-slate-400 text-right">{calc.hra.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-sm text-indigo-400/80 text-right">-{calc.pf.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                      <td className="p-4 text-sm text-indigo-400/80 text-right">-{calc.esi.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                      <td className="p-4 text-sm text-rose-400/80 text-right">-{calc.tds.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                      <td className="p-4 text-sm text-pink-400 font-black text-right">{calc.netPay.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                      <td className="p-4 text-center">
                        <Link 
                          href={`/dashboard/hr/payslip?employeeId=${emp.id}`}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold rounded tracking-wider uppercase transition-colors"
                        >
                          Payslip
                        </Link>
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
