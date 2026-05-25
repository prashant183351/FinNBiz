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
  joinDate: string
  active: boolean
  employeeId?: string
}

export default function EmployeesPage() {
  const { token, activeCompany } = useAuth()
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
      const res = await fetch(`http://localhost:3001/api/employees?companyId=${activeCompany?.id}`, {
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
      const res = await fetch(`http://localhost:3001/api/employees`, {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/hr" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; Back to HR
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">Employee Roster</span>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg tracking-wide transition-all"
          >
            {showForm ? 'Cancel' : '+ Add Employee'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        
        {/* ADD EMPLOYEE FORM */}
        {showForm && (
          <div className="mb-8 p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-4">Onboard New Employee</h3>
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Designation</label>
                  <input type="text" required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Department</label>
                  <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Basic Salary (₹)</label>
                  <input type="number" required value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Join Date</label>
                  <input type="date" required value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">PAN Number</label>
                  <input type="text" value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Aadhaar</label>
                  <input type="text" value={formData.aadhaarNumber} onChange={e => setFormData({...formData, aadhaarNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Bank A/C</label>
                  <input type="text" value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">IFSC Code</label>
                  <input type="text" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all">
                  Save Employee Data
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DATA TABLE */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Staff ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Designation</th>
                <th className="p-4 text-right">Basic Salary</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Loading roster...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No employees found. Click "Add Employee" to begin.</td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 text-sm font-mono text-slate-500">{emp.employeeId || emp.id.substring(0,8)}</td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-white">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.department || 'General'}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-300">{emp.role}</td>
                    <td className="p-4 text-sm text-slate-200 font-bold text-right">₹{emp.salary.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${emp.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
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
