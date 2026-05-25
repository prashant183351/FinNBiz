'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'

interface Employee {
  id: string
  name: string
  role: string
  department: string
  salary: number
  employeeId?: string
  bankAccount?: string
  ifscCode?: string
  panNumber?: string
  aadhaarNumber?: string
}

function PayslipClient() {
  const { token, activeCompany } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const employeeId = searchParams.get('employeeId')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token && employeeId) {
      fetchEmployee()
    }
  }, [activeCompany, token, employeeId])

  const fetchEmployee = async () => {
    setLoading(true)
    try {
      // In a real app we would fetch the single employee or single payroll record.
      // We will fetch all and filter for now since we don't have a specific GET /api/employees/:id exposed in routes right now.
      const res = await fetch(`http://localhost:3001/api/employees?companyId=${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const emp = data.find((e: Employee) => e.id === employeeId)
        if (emp) setEmployee(emp)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Payslip...</div>
  }

  if (!employee) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-500">Employee not found.</div>
  }

  // Calculate Payslip
  const basic = employee.salary * 0.5
  const hra = basic * 0.4
  const conveyance = employee.salary - (basic + hra)
  const pf = basic * 0.12
  const esi = employee.salary <= 21000 ? employee.salary * 0.0075 : 0
  let tds = 0
  if (employee.salary > 50000) tds = (employee.salary - 50000) * 0.1
  const netPay = employee.salary - (pf + esi + tds)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center py-10 print:py-0 print:bg-white">
      
      {/* Top Action Bar (Hidden on Print) */}
      <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center print:hidden px-4">
        <Link href="/dashboard/hr/payroll" className="text-sm text-slate-400 hover:text-white transition-colors">
          &larr; Back to Payroll
        </Link>
        <button 
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20"
        >
          Print PDF
        </button>
      </div>

      {/* A4 PAPER CONTAINER */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-10 shadow-2xl rounded-sm print:shadow-none print:rounded-none print:p-0 relative">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{activeCompany?.name}</h1>
            <p className="text-sm font-semibold text-slate-600 mt-1">{activeCompany?.address || 'India'}</p>
            {activeCompany?.gstin && <p className="text-xs text-slate-500 mt-0.5">GSTIN: {activeCompany.gstin}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-300 uppercase tracking-wider">Payslip</h2>
            <p className="text-sm font-bold text-slate-800 mt-1">Salary Month: {currentMonth}</p>
            <p className="text-xs text-slate-500 mt-0.5">Generated On: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Employee Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-10 text-sm">
          <div className="space-y-3">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-500">Employee Name</span>
              <span className="font-bold text-slate-900">{employee.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-500">Employee ID</span>
              <span className="font-bold text-slate-900 uppercase">{employee.employeeId || employee.id.substring(0,8)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-500">Designation</span>
              <span className="font-bold text-slate-900">{employee.role}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-500">Department</span>
              <span className="font-bold text-slate-900">{employee.department || 'General'}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-500">Bank Account</span>
              <span className="font-bold text-slate-900">{employee.bankAccount || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-500">IFSC Code</span>
              <span className="font-bold text-slate-900">{employee.ifscCode || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-500">PAN</span>
              <span className="font-bold text-slate-900">{employee.panNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-500">Total Working Days</span>
              <span className="font-bold text-slate-900">30</span>
            </div>
          </div>
        </div>

        {/* Salary Tables */}
        <div className="grid grid-cols-2 gap-0 border-2 border-slate-900 mb-8 rounded">
          {/* Earnings */}
          <div className="border-r-2 border-slate-900">
            <div className="bg-slate-100 p-3 border-b-2 border-slate-900">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">Earnings</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-600">Basic Salary</span>
                <span className="text-slate-900">₹{basic.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-600">House Rent Allowance (HRA)</span>
                <span className="text-slate-900">₹{hra.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-600">Conveyance / Special</span>
                <span className="text-slate-900">₹{conveyance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
            <div className="p-4 border-t-2 border-slate-900 bg-slate-50 flex justify-between">
              <span className="font-black text-slate-900 text-sm uppercase">Total Earnings (A)</span>
              <span className="font-black text-slate-900 text-sm">₹{employee.salary.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="bg-slate-100 p-3 border-b-2 border-slate-900">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">Deductions</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-600">Provident Fund (PF)</span>
                <span className="text-slate-900">₹{pf.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-600">Employee State Insurance (ESI)</span>
                <span className="text-slate-900">₹{esi.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-600">Tax Deducted at Source (TDS)</span>
                <span className="text-slate-900">₹{tds.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
            <div className="p-4 border-t-2 border-slate-900 bg-slate-50 flex justify-between h-[54px]">
              <span className="font-black text-slate-900 text-sm uppercase">Total Deductions (B)</span>
              <span className="font-black text-slate-900 text-sm">₹{(pf + esi + tds).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* Net Salary Summary */}
        <div className="bg-slate-900 text-white p-6 rounded flex justify-between items-center print:border-2 print:border-slate-900 print:bg-white print:text-black">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 print:text-slate-500">Net Payable Salary (A - B)</p>
            <h2 className="text-3xl font-black mt-1">₹{netPay.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h2>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold opacity-80">Transferred via {employee.bankAccount ? 'NEFT/RTGS' : 'UPI'}</p>
            <p className="text-xs opacity-60 mt-1">Subject to realization</p>
          </div>
        </div>

        {/* Signature Area */}
        <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end mt-20 pt-10">
          <div className="text-center">
            <div className="w-40 border-b border-slate-400 mb-2"></div>
            <p className="text-xs font-semibold text-slate-500">Employee Signature</p>
          </div>
          <div className="text-center">
            <div className="w-40 border-b border-slate-400 mb-2"></div>
            <p className="text-xs font-semibold text-slate-500">Authorized Signatory</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">{activeCompany?.name}</p>
          </div>
        </div>

        {/* Watermark / Seal */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <h1 className="text-[150px] font-black uppercase text-center leading-none tracking-tighter transform -rotate-12">
            FINNBIZ<br/>PAYROLL
          </h1>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}

export default function PayslipPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Payslip...</div>}>
      <PayslipClient />
    </Suspense>
  )
}
