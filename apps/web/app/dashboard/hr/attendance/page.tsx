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
  const { t, language } = useI18n()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  // Custom states for GPS attendance logs & company geofence settings
  const [attendanceLogs, setAttendanceLogs] = useState<Record<string, any>>({})
  const [gpsLoadingId, setGpsLoadingId] = useState<string | null>(null)
  const [companyGeofence, setCompanyGeofence] = useState<any>(null)
  const [geofenceConfiguring, setGeofenceConfiguring] = useState(false)

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchEmployees()
      fetchCompanyGeofence()
    }
  }, [activeCompany, token, date])

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

  const fetchCompanyGeofence = async () => {
    if (!activeCompany || !token) return
    try {
      const res = await fetch(`${API_BASE_URL}/hr/company/geofence`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCompanyGeofence(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const configureGeofenceCenter = () => {
    if (!navigator.geolocation) {
      alert(t('hr.attendance.gps_unsupported'))
      return
    }
    setGeofenceConfiguring(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API_BASE_URL}/hr/company/geofence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              geofenceRadius: 200 // 200 Meters Geofence default
            })
          })
          if (res.ok) {
            const data = await res.json()
            setCompanyGeofence(data)
            alert(language === 'hi' ? 'सफलतापूर्वक जियोफेंस केंद्र कॉन्फ़िगर किया गया!' : 'Geofence center successfully configured!')
          }
        } catch (err) {
          console.error(err)
        } finally {
          setGeofenceConfiguring(false)
        }
      },
      (err) => {
        console.error(err)
        alert(t('hr.attendance.gps_unsupported'))
        setGeofenceConfiguring(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const markAttendance = async (employeeId: string, status: 'Present' | 'Absent' | 'Half') => {
    if (!activeCompany || !token) return

    if (status === 'Absent') {
      setGpsLoadingId(employeeId)
      try {
        const res = await fetch(`${API_BASE_URL}/hr/attendance/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            employeeId,
            date,
            status
          })
        })
        if (res.ok) {
          const data = await res.json()
          setAttendanceLogs(prev => ({ ...prev, [employeeId]: data }))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setGpsLoadingId(null)
      }
      return
    }

    if (!navigator.geolocation) {
      alert(t('hr.attendance.gps_unsupported'))
      return
    }

    setGpsLoadingId(employeeId)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API_BASE_URL}/hr/attendance/log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              employeeId,
              date,
              status,
              checkInLat: pos.coords.latitude,
              checkInLng: pos.coords.longitude
            })
          })
          if (res.ok) {
            const data = await res.json()
            setAttendanceLogs(prev => ({ ...prev, [employeeId]: data }))
          }
        } catch (err) {
          console.error(err)
        } finally {
          setGpsLoadingId(null)
        }
      },
      async (err) => {
        console.error('GPS error, falling back to manual entry:', err)
        try {
          const res = await fetch(`${API_BASE_URL}/hr/attendance/log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              employeeId,
              date,
              status
            })
          })
          if (res.ok) {
            const data = await res.json()
            setAttendanceLogs(prev => ({ ...prev, [employeeId]: data }))
          }
        } catch (fallbackErr) {
          console.error(fallbackErr)
        } finally {
          setGpsLoadingId(null)
        }
      },
      { enableHighAccuracy: true }
    )
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
        
        {/* PREMIUM GEOFENCING CONFIGURATION PANEL */}
        <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 via-slate-900/60 to-slate-900 border border-slate-800 rounded-3xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              📍 {language === 'hi' ? 'जियोफेंस कॉन्फ़िगरेशन सेंटर' : 'GPS Geofencing Boundary Center'}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xl">
              {language === 'hi' 
                ? 'कर्मचारी की हाजिरी सुनिश्चित करने के लिए कार्यालय का भू-स्थानिक केंद्र सेट करें। हाजिरी के समय उनकी स्थिति मापी जाएगी।'
                : 'Secure on-site employee presence check-in. Coordinates will be validated against the corporate geofence center using the Haversine mathematical metric.'
              }
            </p>
            {companyGeofence?.lat ? (
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
                <span className="bg-slate-800/40 px-3 py-1.5 border border-slate-700/50 rounded-xl">
                  {t('hr.attendance.lat')}: <span className="text-emerald-400 font-bold">{Number(companyGeofence.lat).toFixed(6)}</span>
                </span>
                <span className="bg-slate-800/40 px-3 py-1.5 border border-slate-700/50 rounded-xl">
                  {t('hr.attendance.lng')}: <span className="text-emerald-400 font-bold">{Number(companyGeofence.lng).toFixed(6)}</span>
                </span>
                <span className="bg-slate-800/40 px-3 py-1.5 border border-slate-700/50 rounded-xl">
                  {language === 'hi' ? 'सीमा व्यास' : 'Radius'}: <span className="text-emerald-400 font-bold">{companyGeofence.geofenceRadius || 200}m</span>
                </span>
              </div>
            ) : (
              <p className="text-xs text-amber-400/90 font-medium mt-3">
                ⚠️ {language === 'hi' ? 'कंपनी का जियोफेंस केंद्र सेट नहीं है। डिफ़ॉल्ट रूप से सत्यापन स्वीकृत रहेगा।' : 'Company geofence center is not set yet. Submissions will fall back to default auto-verified.'}
              </p>
            )}
          </div>
          <button 
            onClick={configureGeofenceCenter}
            disabled={geofenceConfiguring}
            className="self-start md:self-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl tracking-wide shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {geofenceConfiguring 
              ? t('hr.attendance.gps_locating')
              : (language === 'hi' ? '📍 वर्तमान स्थान को जियोफेंस केंद्र बनाएं' : '📍 Set Current Location as Geofence Center')
            }
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{t('hr.attendance.title')}</h2>
          <p className="text-sm text-slate-400">{t('hr.attendance.desc')}</p>
        </div>

        {/* ATTENDANCE ROSTER TABLE */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-5 w-1/4">Staff ID</th>
                <th className="p-5 w-1/3">Name</th>
                <th className="p-5 text-center w-5/12">Action / GPS Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-slate-500 font-medium">Loading roster...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-slate-500 font-medium">{t('hr.employees.empty')}</td>
                </tr>
              ) : (
                employees.map(emp => {
                  const log = attendanceLogs[emp.id]
                  const isLoading = gpsLoadingId === emp.id

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="p-5 text-sm font-mono text-slate-500">{emp.employeeId || emp.id.substring(0,8)}</td>
                      <td className="p-5">
                        <p className="text-sm font-bold text-white">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.role}</p>
                      </td>
                      <td className="p-5">
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span className="text-xs text-slate-400 font-medium animate-pulse">{t('hr.attendance.gps_locating')}</span>
                          </div>
                        ) : log ? (
                          <div className="flex flex-col gap-2 items-center justify-center">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                log.status === 'Present' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : log.status === 'Half' 
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {log.status}
                              </span>
                              
                              {log.status !== 'Absent' && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  log.isGeofenced 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {log.isGeofenced ? t('hr.attendance.gps_inside') : t('hr.attendance.gps_outside')}
                                </span>
                              )}
                            </div>
                            {log.checkInLat && (
                              <p className="text-[10px] font-mono text-slate-500 mt-1">
                                {t('hr.attendance.lat')}: {Number(log.checkInLat).toFixed(6)} | {t('hr.attendance.lng')}: {Number(log.checkInLng).toFixed(6)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={() => markAttendance(emp.id, 'Present')} 
                              className="flex-1 max-w-[120px] py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl active:scale-[0.97] transition-all"
                            >
                              {t('hr.attendance.mark')}
                            </button>
                            <button 
                              onClick={() => markAttendance(emp.id, 'Half')} 
                              className="flex-1 max-w-[120px] py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-xl active:scale-[0.97] transition-all"
                            >
                              Half-Day
                            </button>
                            <button 
                              onClick={() => markAttendance(emp.id, 'Absent')} 
                              className="flex-1 max-w-[120px] py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl active:scale-[0.97] transition-all"
                            >
                              {t('hr.attendance.absent')}
                            </button>
                          </div>
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
