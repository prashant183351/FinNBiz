'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'
import { useOfflineSync } from '../../../hooks/useOfflineSync'

interface InvoiceItemInput {
  description: string
  hsnCode: string
  quantity: number
  rate: number
  gstRate: number
}

export default function NewInvoicePage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const { syncFetch } = useOfflineSync()
  const router = useRouter()

  const [customerName, setCustomerName] = useState('')
  const [customerGSTIN, setCustomerGSTIN] = useState('')
  const [items, setItems] = useState<InvoiceItemInput[]>([
    { description: '', hsnCode: '', quantity: 1, rate: 0, gstRate: 18 }
  ])
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Multi-Currency State variables
  const [currency, setCurrency] = useState('INR')
  const [exchangeRate, setExchangeRate] = useState(1.0)

  // Auto-save Draft feature
  useEffect(() => {
    try {
      const saved = localStorage.getItem('finnbiz_invoice_draft')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.customerName) setCustomerName(parsed.customerName)
        if (parsed.customerGSTIN) setCustomerGSTIN(parsed.customerGSTIN)
        if (parsed.items && parsed.items.length > 0) setItems(parsed.items)
        if (parsed.currency) setCurrency(parsed.currency)
      }
    } catch (e) {
      console.error('Failed to load invoice draft', e)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = { customerName, customerGSTIN, items, currency }
      localStorage.setItem('finnbiz_invoice_draft', JSON.stringify(draft))
    }, 500)
    return () => clearTimeout(timer)
  }, [customerName, customerGSTIN, items, currency])
  
  // Tax calculations
  const [taxSummary, setTaxSummary] = useState({
    subtotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    grandTotal: 0,
    isInterState: false
  })

  // Watch currency to set mock conversion exchange rates
  useEffect(() => {
    if (currency === 'USD') {
      setExchangeRate(83.5)
    } else if (currency === 'EUR') {
      setExchangeRate(90.2)
    } else {
      setExchangeRate(1.0)
    }
  }, [currency])

  // Protected route check
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  // Extract first 2 digits of GSTIN representing State Code
  const getStateCode = (gstinStr?: string | null): string => {
    if (!gstinStr || gstinStr.trim().length < 2) return ''
    const code = gstinStr.trim().substring(0, 2)
    return /^[0-9]{2}$/.test(code) ? code : ''
  }

  // Live Tax Split Engine
  useEffect(() => {
    if (!activeCompany) return

    const sellerState = getStateCode(activeCompany.gstin)
    const buyerState = getStateCode(customerGSTIN)
    
    // Inter-state check (True if both have GSTIN and they are in different states)
    const isInterState = !!(sellerState && buyerState && sellerState !== buyerState)

    let subtotal = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0

    items.forEach(item => {
      const quantity = parseFloat(item.quantity.toString()) || 0
      const rate = parseFloat(item.rate.toString()) || 0
      const gstRate = parseFloat(item.gstRate.toString()) || 0
      const amount = quantity * rate
      const taxAmount = (amount * gstRate) / 100

      subtotal += amount
      
      if (isInterState) {
        totalIgst += taxAmount
      } else {
        totalCgst += taxAmount / 2
        totalSgst += taxAmount / 2
      }
    })

    const grandTotal = subtotal + totalCgst + totalSgst + totalIgst

    setTaxSummary({
      subtotal,
      cgst: totalCgst,
      sgst: totalSgst,
      igst: totalIgst,
      grandTotal,
      isInterState
    })
  }, [customerGSTIN, items, activeCompany])

  // Dynamic currency symbol mapping
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'

  // Dynamic Translations
  const trans = {
    title: language === 'hi' ? 'नया इनवॉइस बनाएँ' : 'Create New Invoice',
    custLabel: language === 'hi' ? 'ग्राहक का नाम' : 'Customer Name',
    custPl: language === 'hi' ? 'जैसे: रमेश कुमार' : 'e.g. Ramesh Kumar',
    gstLabel: language === 'hi' ? 'ग्राहक का GSTIN (वैकल्पिक)' : 'Customer GSTIN (Optional)',
    gstPl: language === 'hi' ? 'जैसे: 27AAAAA1111A1Z1' : 'e.g. 27AAAAA1111A1Z1',
    tableDesc: language === 'hi' ? 'विवरण' : 'Description',
    tableDescPl: language === 'hi' ? 'जैसे: कंसल्टेंसी सेवाएं' : 'e.g. Consultancy Services',
    tableHsn: language === 'hi' ? 'HSN/SAC कोड' : 'HSN/SAC',
    tableHsnPl: language === 'hi' ? 'जैसे: 9983' : 'e.g. 9983',
    tableQty: language === 'hi' ? 'मात्रा' : 'Qty',
    tableRate: language === 'hi' ? `दर (${currencySymbol})` : `Rate (${currencySymbol})`,
    tableGst: language === 'hi' ? 'GST दर' : 'GST %',
    tableTotal: language === 'hi' ? 'कुल राशि' : 'Amount',
    addRow: language === 'hi' ? '+ नया आइटम जोड़ें' : '+ Add Item',
    subtotal: language === 'hi' ? 'उप-कुल (Subtotal)' : 'Subtotal',
    cgst: language === 'hi' ? 'केंद्रीय कर (CGST)' : 'Central Tax (CGST)',
    sgst: language === 'hi' ? 'राज्य कर (SGST)' : 'State Tax (SGST)',
    igst: language === 'hi' ? 'एकीकृत कर (IGST)' : 'Integrated Tax (IGST)',
    total: language === 'hi' ? 'कुल देय (Total)' : 'Total Due',
    saveBtn: language === 'hi' ? 'इनवॉइस ड्राफ्ट सहेजें' : 'Save Invoice Draft',
    back: language === 'hi' ? 'इनवॉइस सूची पर जाएँ' : 'Back to Invoices',
    stateMsg: language === 'hi' ? 'अंतरराज्यीय (Inter-State) आपूर्ति पायी गयी। IGST लगाया जाएगा।' : 'Inter-state transaction detected. IGST will be applied.'
  }

  const handleAddItem = () => {
    setItems([...items, { description: '', hsnCode: '', quantity: 1, rate: 0, gstRate: 18 }])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, idx) => idx !== index))
  }

  const handleItemChange = (index: number, field: keyof InvoiceItemInput, value: any) => {
    const updated = [...items]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setItems(updated)
  }

  const handleImportContact = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert(language === 'hi' ? 'आपकी डिवाइस में Contacts Import सपोर्ट नहीं करता है।' : 'Your device does not support importing contacts.')
      return
    }

    try {
      const props = ['name']
      const opts = { multiple: false }
      const contacts = await (navigator as any).contacts.select(props, opts)
      if (contacts && contacts.length > 0) {
        if (contacts[0].name && contacts[0].name.length > 0) {
          setCustomerName(contacts[0].name[0])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (!customerName.trim()) {
      setValidationError(language === 'hi' ? 'ग्राहक का नाम दर्ज करना अनिवार्य है।' : 'Customer Name is required.')
      return
    }

    // Verify HSN structure if present
    if (customerGSTIN.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      if (!gstinRegex.test(customerGSTIN.trim().toUpperCase())) {
        setValidationError(language === 'hi' ? 'कृपया एक वैध 15-अंकों का ग्राहक GSTIN दर्ज करें।' : 'Please enter a valid 15-character Customer GSTIN.')
        return
      }
    }

    // Validate invoice items
    const hasEmptyItem = items.some(item => !item.description.trim() || item.rate <= 0)
    if (hasEmptyItem) {
      setValidationError(language === 'hi' ? 'सभी आइटम्स में विवरण और दर (Rate > 0) होना अनिवार्य है।' : 'All line items must have descriptions and rates greater than 0.')
      return
    }

    setLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          customerName: customerName.trim(),
          customerGSTIN: customerGSTIN.trim().toUpperCase() || undefined,
          currency,
          exchangeRate: parseFloat(exchangeRate.toString()) || 1.0,
          items: items.map(item => ({
            description: item.description.trim(),
            hsnCode: item.hsnCode.trim() || undefined,
            quantity: parseFloat(item.quantity.toString()),
            rate: parseFloat(item.rate.toString()),
            gstRate: parseFloat(item.gstRate.toString())
          }))
        })
      })

      const data = await res.json()
      if (res.ok) {
        localStorage.removeItem('finnbiz_invoice_draft')
        router.push(`/dashboard/invoices/${data.id || data.invoice?.id}`)
      } else {
        setValidationError(data.error || 'Failed to save draft invoice')
      }
    } catch (err) {
      console.error('Failed to create invoice:', err)
      setValidationError('Failed to connect to API server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>

      {/* Nav Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/invoices" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {trans.back}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{trans.title}</span>
          </div>
        </div>
      </header>

      {/* Onboarding Form */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow">
        {validationError && (
          <div className="p-3 mb-6 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Metadata Card */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Customer Name */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {trans.custLabel} <span className="text-red-500">*</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={handleImportContact}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 transition-colors"
                  >
                    📱 {language === 'hi' ? 'संपर्क से चुनें' : 'Import Contacts'}
                  </button>
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={trans.custPl}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                />
              </div>

              {/* Customer GSTIN */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {trans.gstLabel}
                </label>
                <input
                  type="text"
                  value={customerGSTIN}
                  onChange={(e) => setCustomerGSTIN(e.target.value.toUpperCase())}
                  maxLength={15}
                  placeholder={trans.gstPl}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                />
              </div>

              {/* Billing Currency */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {language === 'hi' ? 'बिलिंग मुद्रा' : 'Billing Currency'}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro Zone</option>
                </select>
              </div>
            </div>

            {currency !== 'INR' && (
              <div className="mt-4 px-3 py-2 bg-emerald-950/20 border border-emerald-950/50 text-emerald-300 text-xs rounded flex items-center gap-1.5 font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
                </svg>
                <span>🌎 {language === 'hi' ? `निर्यात इनवॉइस: मुद्रा ${currency} में एक्सचेंज रेट ₹${exchangeRate} पर पुनर्गणना।` : `Export Invoice: Recalculating totals in ${currency} at exchange rate of ₹${exchangeRate}.`}</span>
              </div>
            )}

            {taxSummary.isInterState && (
              <div className="mt-4 px-3 py-2 bg-indigo-950/20 border border-indigo-950/50 text-indigo-300 text-xs rounded flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 11.518 1.353l-.144.07c-.43.208-.668.66-.668 1.13v.81c0 .414-.336.75-.75.75h-.375a.75.75 0 01-.75-.75v-.81c0-.47-.238-.922-.668-1.13l-.144-.07A.75.75 0 118.73 9.877l.04.02a.75.75 0 01.378.648v.81c0 .414.336.75.75.75h.375a.75.75 0 00.75-.75v-.81a.75.75 0 01.378-.648zM12 3v18M3 12h18" />
                </svg>
                <span>{trans.stateMsg}</span>
              </div>
            )}
          </div>

          {/* Dynamic Line Items Grid */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl overflow-hidden p-6">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Line Items (आइटम्स)</h3>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end border-b border-slate-800/60 lg:border-0 pb-4 lg:pb-0">
                  {/* Description */}
                  <div className="lg:col-span-4 space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider lg:hidden">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder={trans.tableDescPl}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                    />
                  </div>

                  {/* HSN Code */}
                  <div className="lg:col-span-2 space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider lg:hidden">HSN</label>
                    <input
                      type="text"
                      value={item.hsnCode}
                      onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                      placeholder={trans.tableHsnPl}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                    />
                  </div>

                  {/* Qty */}
                  <div className="lg:col-span-1 space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider lg:hidden">Qty</label>
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      step="any"
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                    />
                  </div>

                  {/* Rate */}
                  <div className="lg:col-span-2 space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider lg:hidden">Rate</label>
                    <input
                      type="number"
                      value={item.rate}
                      min={0}
                      step="any"
                      onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                    />
                  </div>

                  {/* GST */}
                  <div className="lg:col-span-1 space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider lg:hidden">GST</label>
                    <select
                      value={item.gstRate}
                      onChange={(e) => handleItemChange(idx, 'gstRate', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>

                  {/* Total amount per item */}
                  <div className="lg:col-span-1 text-right py-2 px-1 text-sm font-bold text-slate-300">
                    {currencySymbol}{(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1}
                      className="px-2.5 py-2.5 border border-slate-800 hover:border-red-500/40 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="mt-4 px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all duration-300"
            >
              {trans.addRow}
            </button>
          </div>

          {/* Totals & Submits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="p-6 bg-slate-900/20 border border-slate-800/80 rounded-2xl backdrop-blur-xl h-full flex flex-col justify-between">
              <p className="text-xs text-slate-500">
                GSTIN splits are calculated dynamically based on regional boundaries. All records comply with modern Indian CGST, SGST, and IGST frameworks.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <React.Fragment>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving Draft...</span>
                  </React.Fragment>
                ) : (
                  <span>{trans.saveBtn}</span>
                )}
              </button>
            </div>

            {/* Calculations Card */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl text-sm font-semibold divide-y divide-slate-800/80">
              <div className="flex items-center justify-between pb-3">
                <span className="text-slate-400">{trans.subtotal}</span>
                <span className="text-slate-200">{currencySymbol}{taxSummary.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {!taxSummary.isInterState ? (
                <React.Fragment>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400">{trans.cgst}</span>
                    <span className="text-slate-200">{currencySymbol}{taxSummary.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400">{trans.sgst}</span>
                    <span className="text-slate-200">{currencySymbol}{taxSummary.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </React.Fragment>
              ) : (
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-400">{trans.igst}</span>
                  <span className="text-slate-200">{currencySymbol}{taxSummary.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 text-lg font-black text-white">
                <span>{trans.total}</span>
                <span>{currencySymbol}{taxSummary.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {currency !== 'INR' && (
                <div className="flex items-center justify-between pt-3 text-xs font-semibold text-emerald-400 border-t border-slate-800/80">
                  <span>Base INR Value (Equivalent)</span>
                  <span>₹{(taxSummary.grandTotal * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-8">
        <p>&copy; {new Date().getFullYear()} FinNbiz. Indian GST calculations & tax split auditor.</p>
      </footer>
    </div>
  )
}
