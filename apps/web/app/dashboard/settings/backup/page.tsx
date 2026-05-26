'use client'

import React, { useState, useEffect } from 'react'
import { useI18n } from '../../../hooks/useI18n'
import { useAuth } from '../../../hooks/useAuth'

export default function BackupSyncSettings() {
  const { language, t } = useI18n()
  const { token } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  
  // Backup configurations
  const [cloudEnabled, setCloudEnabled] = useState(false)
  const [encryptionEnabled, setEncryptionEnabled] = useState(true)

  useEffect(() => {
    fetchBackupData()
  }, [token])

  const fetchBackupData = async () => {
    try {
      if (!token) return
      
      const headers = { 'Authorization': `Bearer ${token}` }
      
      // Fetch stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backups/stats`, { headers })
      if (statsRes.ok) setStats(await statsRes.json())
        
      // Fetch history
      const historyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backups?limit=5`, { headers })
      if (historyRes.ok) setHistory(await historyRes.json())
        
    } catch (error) {
      console.error('Failed to fetch backup data', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async (uploadToCloud: boolean) => {
    setCreating(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'full',
          encrypt: encryptionEnabled,
          uploadToCloud
        })
      })
      
      if (res.ok) {
        alert(language === 'hi' ? 'बैकअप सफलतापूर्वक बन गया!' : 'Backup created successfully!')
        fetchBackupData()
      } else {
        const errorData = await res.json()
        alert((language === 'hi' ? 'त्रुटि: ' : 'Error: ') + (errorData.error || 'Failed to create backup'))
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      alert(language === 'hi' ? 'बैकअप बनाने में विफल' : 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (id: string) => {
    const confirmMsg = language === 'hi' 
      ? 'क्या आप सुनिश्चित हैं? मौजूदा डेटा इस बैकअप से बदल जाएगा।'
      : 'Are you sure? Current data will be replaced by this backup.'
      
    if (!window.confirm(confirmMsg)) return
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backups/${id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        alert(language === 'hi' ? 'डेटा सफलतापूर्वक पुनर्स्थापित (Restore) हो गया!' : 'Data restored successfully!')
        window.location.reload()
      } else {
        const errorData = await res.json()
        alert((language === 'hi' ? 'त्रुटि: ' : 'Error: ') + (errorData.error || 'Failed to restore backup'))
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      alert(language === 'hi' ? 'डेटा पुनर्स्थापित करने में विफल' : 'Failed to restore data')
    }
  }
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'hi' ? 'डेटा बैकअप और सिंक' : 'Data Backup & Sync'}
        </h2>
        <p className="text-slate-400">
          {language === 'hi' 
            ? 'अपने व्यवसाय के डेटा को सुरक्षित रखें। हार्ड ड्राइव खराब होने पर नुकसान से बचने के लिए क्लाउड सिंक सेट करें या मैनुअल बैकअप लें।' 
            : 'Secure your business data. Setup cloud sync or take manual backups to prevent data loss in case of hardware failure.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">☁️</div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">
            {language === 'hi' ? 'कुल बैकअप्स' : 'Total Backups'}
          </h3>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats?.successful || 0}
          </p>
        </div>
        
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">💾</div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">
            {language === 'hi' ? 'कुल डेटा साइज़' : 'Total Data Size'}
          </h3>
          <p className="text-3xl font-bold text-indigo-400">
            {loading ? '...' : formatBytes(stats?.totalSize || 0)}
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">⏱️</div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">
            {language === 'hi' ? 'आखिरी बैकअप' : 'Last Backup'}
          </h3>
          <p className="text-xl font-bold text-emerald-400 mt-2">
            {loading ? '...' : stats?.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Actions Panel */}
        <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            {language === 'hi' ? 'बैकअप टूल्स' : 'Backup Tools'}
          </h3>
          
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleCreateBackup(false)}
                disabled={creating}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>💾</span>
                {creating ? (language === 'hi' ? 'बन रहा है...' : 'Creating...') : (language === 'hi' ? 'लोकल बैकअप बनाएं' : 'Create Local Backup')}
              </button>
              
              <button
                onClick={() => handleCreateBackup(true)}
                disabled={creating || !cloudEnabled}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  cloudEnabled 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <span>☁️</span>
                {language === 'hi' ? 'क्लाउड पर सिंक करें' : 'Sync to Cloud'}
              </button>
            </div>
            
            <div className="pt-6 border-t border-slate-700/50">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={encryptionEnabled} onChange={(e) => setEncryptionEnabled(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${encryptionEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${encryptionEnabled ? 'translate-x-4' : ''}`}></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                    {language === 'hi' ? 'बैकअप एन्क्रिप्ट करें (सुरक्षा)' : 'Encrypt Backup (Security)'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'hi' ? 'बैकअप फाइल को पासवर्ड से सुरक्षित करें' : 'Secure backup file with a password'}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Cloud Setup Panel */}
        <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              {language === 'hi' ? 'क्लाउड सेटिंग्स (AWS S3)' : 'Cloud Settings (AWS S3)'}
            </h3>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={cloudEnabled} onChange={(e) => setCloudEnabled(e.target.checked)} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${cloudEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${cloudEnabled ? 'translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          
          <div className={`space-y-4 transition-opacity ${cloudEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">AWS Access Key</label>
              <input type="text" placeholder="AKIAIOSFODNN7EXAMPLE" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">AWS Secret Key</label>
              <input type="password" placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Bucket Name</label>
                <input type="text" placeholder="finnbiz-backups" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Region</label>
                <input type="text" defaultValue="ap-south-1" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
            </div>
            <button className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {language === 'hi' ? 'सेटिंग्स सेव करें' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            {language === 'hi' ? 'पिछला बैकअप इतिहास' : 'Recent Backup History'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">{language === 'hi' ? 'तारीख' : 'Date'}</th>
                <th className="px-6 py-4 font-medium">{language === 'hi' ? 'प्रकार' : 'Type'}</th>
                <th className="px-6 py-4 font-medium">{language === 'hi' ? 'साइज़' : 'Size'}</th>
                <th className="px-6 py-4 font-medium">{language === 'hi' ? 'स्थिति' : 'Status'}</th>
                <th className="px-6 py-4 font-medium text-right">{language === 'hi' ? 'एक्शन' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {language === 'hi' ? 'कोई बैकअप नहीं मिला' : 'No backups found'}
                  </td>
                </tr>
              ) : (
                history.map((backup: any) => (
                  <tr key={backup.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(backup.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md text-xs border border-indigo-500/20">
                        {backup.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                      {formatBytes(Number(backup.size))}
                    </td>
                    <td className="px-6 py-4">
                      {backup.status === 'completed' ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {backup.status === 'completed' && (
                        <button 
                          onClick={() => handleRestore(backup.id)}
                          className="text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg transition-colors border border-amber-400/20"
                        >
                          {language === 'hi' ? 'रिस्टोर' : 'Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
