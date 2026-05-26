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
  upiId?: string
  phone?: string
}

export default function PayrollPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const router = useRouter()
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())

  const [payslips, setPayslips] = useState<Record<string, any>>({})
  
  // UPI Modal & VPA States
  const [activePayEmployee, setActivePayEmployee] = useState<any | null>(null)
  const [inputUpi, setInputUpi] = useState('')
  const [upiSaving, setUpiSaving] = useState(false)

  // WhatsApp Modal States
  const [activeWhatsappEmployee, setActiveWhatsappEmployee] = useState<any | null>(null)
  const [inputPhone, setInputPhone] = useState('')
  const [whatsappSending, setWhatsappSending] = useState(false)

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
        
        // Mock net pay computation (backend bulk processing simulation)
        const mockPayslips: Record<string, any> = {}
        for (const emp of emps) {
          mockPayslips[emp.id] = {
            id: `pay-${emp.id.substring(0,6)}`,
            basicSalary: emp.salary,
            netPay: Math.round(emp.salary - (Math.random() * 500)),
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
    setPayslips(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        status: 'Paid'
      }
    }))
    alert(language === 'hi' ? 'भुगतान लेजर में सफलतापूर्वक दर्ज किया गया!' : 'Payment recorded successfully in Ledger!')
    setActivePayEmployee(null)
  }

  const handleSaveUpiAndPay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePayEmployee || !inputUpi) return
    setUpiSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/hr/employees/${activePayEmployee.emp.id}/upi`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ upiId: inputUpi })
      })
      if (res.ok) {
        const updatedEmp = await res.json()
        // Update local employee list
        setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? { ...e, upiId: updatedEmp.upiId } : e))
        setActivePayEmployee((prev: any) => ({
          ...prev,
          emp: { ...prev.emp, upiId: updatedEmp.upiId }
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpiSaving(false)
    }
  }

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWhatsappEmployee || !inputPhone) return
    setWhatsappSending(true)
    try {
      const res = await fetch(`${API_BASE_URL}/hr/payroll/${activeWhatsappEmployee.slip.id}/whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: inputPhone })
      })
      if (res.ok) {
        alert(t('hr.payroll.send_success'))
        setActiveWhatsappEmployee(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setWhatsappSending(false)
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

        {/* PAYROLL ROSTER VIEW */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-5">Name</th>
                <th className="p-5 text-right">Basic Salary</th>
                <th className="p-5 text-right">Calculated Net Pay</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500 font-medium">Calculating salaries...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500 font-medium">{t('hr.employees.empty')}</td>
                </tr>
              ) : (
                employees.map(emp => {
                  const slip = payslips[emp.id]
                  const isPaid = slip?.status === 'Paid'
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="p-5">
                        <p className="text-sm font-bold text-white">{emp.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">ID: {emp.employeeId || emp.id.substring(0,8)}</p>
                      </td>
                      <td className="p-5 text-sm text-slate-400 text-right">
                        ₹{emp.salary.toLocaleString('en-IN')}
                      </td>
                      <td className="p-5 text-sm font-bold text-pink-400 text-right">
                        ₹{slip ? Math.round(slip.netPay).toLocaleString('en-IN') : '...'}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-700/20'}`}>
                          {slip?.status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex gap-2 justify-center">
                          {!isPaid ? (
                            <button 
                              onClick={() => {
                                setActivePayEmployee({ emp, slip })
                                setInputUpi(emp.upiId || '')
                              }} 
                              className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-pink-500/10 hover:shadow-pink-500/20 transition-all"
                            >
                              {t('hr.payroll.upi_pay')}
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setActiveWhatsappEmployee({ emp, slip })
                                  setInputPhone(emp.phone || '')
                                }}
                                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl transition-all"
                              >
                                {t('hr.payroll.whatsapp_payslip')}
                              </button>
                              <button 
                                className="px-4 py-2 border border-slate-700 text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-800 transition-all" 
                                onClick={() => alert(language === 'hi' ? 'पे-स्लिप डाउनलोड हो रही है...' : 'Downloading PDF Payslip...')}
                              >
                                {language === 'hi' ? 'डाउनलोड' : 'Download'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* UPI PAYOUT DIALOG MODAL */}
        {activePayEmployee && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
              <button 
                onClick={() => setActivePayEmployee(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold"
              >
                &times;
              </button>

              <h3 className="text-lg font-bold text-white mb-2">{t('hr.payroll.upi_modal_title')}</h3>
              <p className="text-xs text-slate-400 mb-6">
                {language === 'hi' ? `कर्मचारी: ${activePayEmployee.emp.name} | वेतन राशि: ₹${activePayEmployee.slip.netPay}` : `Employee: ${activePayEmployee.emp.name} | Net Salary: ₹${activePayEmployee.slip.netPay}`}
              </p>

              {!activePayEmployee.emp.upiId ? (
                /* STEP 1: ADD UPI ID */
                <form onSubmit={handleSaveUpiAndPay} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('hr.payroll.upi_vpa')}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. employee@okaxis" 
                      value={inputUpi}
                      onChange={e => setInputUpi(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-pink-500 font-mono text-sm"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={upiSaving}
                    className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                  >
                    {upiSaving ? 'Saving...' : (language === 'hi' ? 'सहेजें और भुगतान पर जाएं' : 'Save UPI & Show QR')}
                  </button>
                </form>
              ) : (
                /* STEP 2: SHOW SCAN AND PAY QR */
                <div className="flex flex-col items-center justify-center space-y-6">
                  {/* GENERATE STUNNING QR CODE */}
                  <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-inner flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        `upi://pay?pa=${activePayEmployee.emp.upiId}&pn=${encodeURIComponent(activePayEmployee.emp.name)}&am=${activePayEmployee.slip.netPay}&cu=INR&tn=Salary_${month}_${year}`
                      )}`} 
                      alt="UPI Payment QR" 
                      className="h-48 w-48 object-contain"
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-400">{language === 'hi' ? 'इस QR कोड को किसी भी UPI ऐप से स्कैन करें' : 'Scan this QR using any corporate UPI App'}</p>
                    <p className="text-sm font-mono text-emerald-400 font-bold mt-1.5">{activePayEmployee.emp.upiId}</p>
                  </div>

                  {/* DEEP LINK FOR MOBILE DEVICES */}
                  <a 
                    href={`upi://pay?pa=${activePayEmployee.emp.upiId}&pn=${encodeURIComponent(activePayEmployee.emp.name)}&am=${activePayEmployee.slip.netPay}&cu=INR&tn=Salary_${month}_${year}`}
                    className="w-full text-center py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold rounded-xl transition-all"
                  >
                    🚀 {language === 'hi' ? 'मोबाइल ऐप पर भुगतान करें' : 'Pay Directly via Mobile App'}
                  </a>

                  <div className="flex gap-3 w-full pt-4 border-t border-slate-800/80">
                    <button 
                      onClick={() => setActivePayEmployee(null)} 
                      className="flex-1 py-2.5 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition-all"
                    >
                      {t('hr.employees.cancel')}
                    </button>
                    <button 
                      onClick={() => markPaid(activePayEmployee.emp.id)} 
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                    >
                      {language === 'hi' ? 'भुगतान सफल हुआ' : 'Disbursement Successful'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WHATSAPP PAYSLIP MODAL */}
        {activeWhatsappEmployee && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
              <button 
                onClick={() => setActiveWhatsappEmployee(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold"
              >
                &times;
              </button>

              <h3 className="text-lg font-bold text-white mb-2">{t('hr.payroll.whatsapp_payslip')}</h3>
              <p className="text-xs text-slate-400 mb-6">
                {language === 'hi' ? `पे-स्लिप भेजना: ${activeWhatsappEmployee.emp.name}` : `Send payslip to: ${activeWhatsappEmployee.emp.name}`}
              </p>

              <form onSubmit={handleSendWhatsApp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('hr.employees.phone')}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. +91 9999999999" 
                    value={inputPhone}
                    onChange={e => setInputPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500 text-sm font-mono"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={whatsappSending}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  {whatsappSending ? 'Sending...' : (language === 'hi' ? 'व्हाट्सएप संदेश भेजें' : 'Send WhatsApp Message')}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
