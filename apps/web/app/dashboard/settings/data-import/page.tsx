'use client'

import React, { useState } from 'react'
import { useI18n } from '../../../hooks/useI18n'
import { useAuth } from '../../../hooks/useAuth'

type ImportType = 'customers' | 'vendors' | 'inventory'

export default function DataImportSettings() {
  const { language, t } = useI18n()
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<ImportType>('customers')
  
  const [csvText, setCsvText] = useState('')
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const templates = {
    customers: 'name,contactPerson,email,phone,address,gstin,balance\nRamesh Kumar,Ramesh,ramesh@email.com,9876543210,Delhi,07AABCU9603R1ZM,5000\nSuresh Traders,Suresh,suresh@email.com,9988776655,Mumbai,27AABCU9603R1ZM,0',
    vendors: 'name,contactPerson,email,phone,address,gstin,paymentTerms\nABC Electronics,Rahul,abc@email.com,9876543211,Pune,27AABCU9603R1ZN,net_30\nXYZ Plastics,Amit,xyz@email.com,9988776656,Noida,09AABCU9603R1ZP,net_15',
    inventory: 'name,description,sku,barcode,category,unit,costPrice,sellingPrice,minStock,stock,location\nLaptop Pro,16GB RAM 512GB SSD,LAP-001,8901234567,Electronics,pcs,45000,55000,5,20,Warehouse A\nWireless Mouse,Ergonomic Mouse,MOU-002,8901234568,Accessories,pcs,400,800,20,50,Store 1'
  }

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + templates[activeTab]
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `finnbiz_${activeTab}_template.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseCSVLine = (text: string) => {
    let result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const handleCsvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setCsvText(text)
    setErrorMsg('')
    setSuccessMsg('')
    
    if (!text.trim()) {
      setPreviewData([])
      return
    }

    try {
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      if (lines.length < 2) {
        setPreviewData([])
        return
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
      const parsed = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = values[index] || ''
        })
        return obj
      })

      setPreviewData(parsed.slice(0, 3)) // Show only 3 items in preview
    } catch (err) {
      setErrorMsg('Failed to parse CSV. Please ensure it matches the template.')
      setPreviewData([])
    }
  }

  const handleImport = async () => {
    if (!csvText.trim()) return
    setIsImporting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const lines = csvText.split('\n').filter(line => line.trim().length > 0)
      if (lines.length < 2) throw new Error('No valid data rows found in CSV')

      const headers = parseCSVLine(lines[0]).map(h => h.trim()) // Keep original case for API matching if needed, or map them safely.
      // We'll normalize headers to camelCase for our API
      const normalizedHeaders = headers.map(h => h.replace(/[^a-zA-Z0-9]/g, ''))

      const fullData = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        const obj: any = {}
        normalizedHeaders.forEach((header, index) => {
          obj[header] = values[index] || ''
        })
        return obj
      })

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/import/${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: fullData })
      })

      const result = await res.json()

      if (res.ok) {
        setSuccessMsg(result.message || 'Import successful!')
        setCsvText('')
        setPreviewData([])
      } else {
        setErrorMsg(result.error || 'Failed to import data')
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to process data')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'hi' ? 'मास्टर डेटा इम्पोर्ट (CSV)' : 'Master Data Import (CSV)'}
        </h2>
        <p className="text-slate-400">
          {language === 'hi' 
            ? 'पुराने सॉफ्टवेयर (Tally, Vyapar, Khatabook) से ग्राहकों, सप्लायर्स और आइटम्स की लिस्ट एक क्लिक में अपलोड करें।' 
            : 'Quickly migrate your Customers, Vendors, and Inventory from other software (Tally, Vyapar, Khatabook) using CSV files.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 w-fit">
        {[
          { id: 'customers', icon: '👥', label: language === 'hi' ? 'ग्राहक (Customers)' : 'Customers' },
          { id: 'vendors', icon: '🏢', label: language === 'hi' ? 'सप्लायर्स (Vendors)' : 'Vendors' },
          { id: 'inventory', icon: '📦', label: language === 'hi' ? 'आइटम्स (Inventory)' : 'Inventory' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as ImportType); setCsvText(''); setPreviewData([]); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/30 rounded-2xl p-6 md:p-8 border border-slate-700 shadow-xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row gap-8 relative z-10">
          
          {/* Left Column: Instructions & Download */}
          <div className="w-full md:w-1/3 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">
                {language === 'hi' ? 'स्टेप 1: टेम्प्लेट डाउनलोड करें' : 'Step 1: Download Template'}
              </h3>
              <p className="text-slate-400 text-sm">
                {language === 'hi' 
                  ? 'नीचे दिए गए बटन पर क्लिक करके सही CSV फॉर्मेट डाउनलोड करें और उसमें अपना डेटा भरें।' 
                  : 'Download the correct CSV format template and fill it with your data.'}
              </p>
            </div>
            
            <button 
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 py-3 rounded-xl border border-slate-600 font-semibold transition-colors"
            >
              <span>📥</span>
              {language === 'hi' ? 'CSV टेम्प्लेट डाउनलोड करें' : 'Download CSV Template'}
            </button>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">💡 Tips:</h4>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                <li>Do not change the header names in the first row.</li>
                <li>Ensure numeric values like 'balance' or 'costPrice' contain only numbers.</li>
                <li>Save the file in standard comma-separated (.csv) format.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Upload & Preview */}
          <div className="w-full md:w-2/3 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">
                {language === 'hi' ? 'स्टेप 2: CSV डेटा पेस्ट या अपलोड करें' : 'Step 2: Paste CSV Data'}
              </h3>
              
              <textarea
                value={csvText}
                onChange={handleCsvChange}
                placeholder={language === 'hi' ? 'अपनी CSV फाइल का कंटेंट यहाँ पेस्ट करें...' : 'Paste your CSV file content here...'}
                className="w-full h-40 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none shadow-inner"
              />
            </div>

            {errorMsg && (
              <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-sm font-medium flex items-center gap-2">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-sm font-medium flex items-center gap-2">
                <span>✅</span> {successMsg}
              </div>
            )}

            {previewData.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-indigo-400">
                  {language === 'hi' ? 'डेटा प्रिव्यू (पहली 3 पंक्तियां):' : 'Data Preview (first 3 rows):'}
                </h4>
                <div className="overflow-x-auto border border-slate-700 rounded-xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="px-4 py-2 font-semibold capitalize">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-800/20">
                      {previewData.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-2 text-slate-300">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={isImporting || !csvText.trim()}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
            >
              <span>{isImporting ? '⏳' : '🚀'}</span>
              {isImporting 
                ? (language === 'hi' ? 'इम्पोर्ट हो रहा है...' : 'Importing Data...')
                : (language === 'hi' ? `सभी ${activeTab} को इम्पोर्ट करें` : `Import All ${activeTab}`)
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
