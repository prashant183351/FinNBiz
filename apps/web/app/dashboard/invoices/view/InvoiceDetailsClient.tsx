'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'
import { useOfflineSync } from '../../../hooks/useOfflineSync'

interface InvoiceItem {
  id: string
  description: string
  hsnCode: string | null
  quantity: number
  rate: number
  amount: number
  gstRate: number
  cgst: number
  sgst: number
  igst: number
}

interface Company {
  name: string
  gstin: string | null
  pan: string | null
  address: string | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerGSTIN: string | null
  subtotal: number
  totalGST: number
  totalAmount: number
  status: 'draft' | 'finalized' | 'paid'
  createdAt: string
  items: InvoiceItem[]
  company: Company
  irn: string | null
  ewayBillNumber: string | null
  ewayTransporterId: string | null
  ewayVehicleNumber: string | null
  ewayDistance: number | null
  currency: string
  exchangeRate: number
  whatsappSentAt: string | null
  whatsappPhone: string | null
  ewayPartBReason: string | null
}

export default function InvoiceDetailsPage() {
  const { token } = useAuth()
  const { language } = useI18n()
  const { syncFetch } = useOfflineSync()
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('id') as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // E-Way Bill State variables
  const [ewayModalOpen, setEwayModalOpen] = useState(false)
  const [transporterId, setTransporterId] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [distance, setDistance] = useState('100')

  // Part-B Vehicle Update State variables
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false)
  const [newVehicleNumber, setNewVehicleNumber] = useState('')
  const [transshipmentReason, setTransshipmentReason] = useState('Transshipment')

  // WhatsApp Sharing State variables
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false)
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [whatsappSending, setWhatsappSending] = useState(false)
  const [whatsappSuccess, setWhatsappSuccess] = useState(false)

  // Dynamic currency symbol mapping
  const currencySymbol = invoice?.currency === 'USD' ? '$' : invoice?.currency === 'EUR' ? '€' : '₹'

  const fetchInvoiceDetails = async () => {
    setLoading(true)
    try {
      const res = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setInvoice(data)
      } else {
        setErrorMessage('Failed to retrieve invoice details.')
      }
    } catch (err) {
      console.error('Failed to fetch invoice:', err)
      setErrorMessage('Could not connect to the API server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails()
    }
  }, [invoiceId, token])

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchInvoiceDetails()
    }
    window.addEventListener('finnbiz_sync_complete', handleSyncComplete)
    return () => {
      window.removeEventListener('finnbiz_sync_complete', handleSyncComplete)
    }
  }, [invoiceId, token])

  const handleFinalize = async () => {
    if (!invoiceId) return
    setActionLoading(true)
    setErrorMessage('')
    try {
      const res = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}/finalize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        setInvoice(data)
      } else {
        setErrorMessage(data.error || 'Failed to finalize invoice')
      }
    } catch (err) {
      console.error('Finalize error:', err)
      setErrorMessage('Failed to connect to API server.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!invoiceId) return
    setActionLoading(true)
    setErrorMessage('')
    try {
      const res = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        setInvoice(data)
      } else {
        setErrorMessage(data.error || 'Failed to register payment')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setErrorMessage('Failed to connect to API server.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateEInvoice = async () => {
    if (!invoiceId) return
    setActionLoading(true)
    setErrorMessage('')
    try {
      const res = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}/e-invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        // Refresh invoice to grab the new DB details
        const refreshRes = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json()
          setInvoice(refreshedData)
        }
      } else {
        setErrorMessage(data.error || 'Failed to generate E-Invoice')
      }
    } catch (err) {
      console.error('E-Invoice error:', err)
      setErrorMessage('Failed to connect to API server.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateEWayBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceId) return
    setActionLoading(true)
    setErrorMessage('')
    try {
      const res = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}/e-waybill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transporterId,
          vehicleNumber,
          distance: parseFloat(distance)
        })
      })
      const data = await res.json()
      if (res.ok) {
        setEwayModalOpen(false)
        // Refresh invoice details
        const refreshRes = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json()
          setInvoice(refreshedData)
        }
      } else {
        setErrorMessage(data.error || 'Failed to generate E-Way Bill')
      }
    } catch (err) {
      console.error('E-Way Bill error:', err)
      setErrorMessage('Failed to connect to API server.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceId || !whatsappPhone) return
    setWhatsappSending(true)
    setErrorMessage('')
    try {
      const res = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phoneNumber: whatsappPhone })
      })
      const data = await res.json()
      if (res.ok) {
        setWhatsappSuccess(true)
        setTimeout(() => {
          setWhatsappModalOpen(false)
          setWhatsappSuccess(false)
        }, 1500)
        // Refresh details
        const refreshRes = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json()
          setInvoice(refreshedData)
        }
      } else {
        setErrorMessage(data.error || 'Failed to share on WhatsApp')
      }
    } catch (err) {
      console.error('WhatsApp share error:', err)
      setErrorMessage('Failed to connect to API server.')
    } finally {
      setWhatsappSending(false)
    }
  }

  const handleUpdateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceId || !newVehicleNumber) return
    setActionLoading(true)
    setErrorMessage('')
    try {
      const res = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}/e-waybill/vehicle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleNumber: newVehicleNumber,
          reason: transshipmentReason
        })
      })
      const data = await res.json()
      if (res.ok) {
        setVehicleModalOpen(false)
        // Refresh details
        const refreshRes = await syncFetch(`http://localhost:3001/api/invoices/${invoiceId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json()
          setInvoice(refreshedData)
        }
      } else {
        setErrorMessage(data.error || 'Failed to update vehicle details')
      }
    } catch (err) {
      console.error('Part-B Vehicle update error:', err)
      setErrorMessage('Failed to connect to API server.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Dynamic Translations
  const trans = {
    back: language === 'hi' ? 'इनवॉइस सूची पर जाएँ' : 'Back to Invoices',
    finalize: language === 'hi' ? 'सत्यापित करें (Finalize)' : 'Finalize Invoice',
    pay: language === 'hi' ? 'भुगतान दर्ज करें (Mark Paid)' : 'Mark as Paid',
    print: language === 'hi' ? 'प्रिंट करें / PDF सेव करें' : 'Print / Download PDF',
    taxInvoice: language === 'hi' ? 'कर इनवॉइस' : 'TAX INVOICE',
    draftInvoice: language === 'hi' ? 'इनवॉइस ड्राफ्ट' : 'INVOICE DRAFT',
    invoiceNo: language === 'hi' ? 'इनवॉइस नं.' : 'Invoice No',
    date: language === 'hi' ? 'दिनांक' : 'Date',
    status: language === 'hi' ? 'स्थिति' : 'Status',
    seller: language === 'hi' ? 'विक्रेता (कंपनी)' : 'Seller Details',
    buyer: language === 'hi' ? 'क्रेता (ग्राहक)' : 'Buyer Details',
    desc: language === 'hi' ? 'विवरण' : 'Description',
    hsn: language === 'hi' ? 'HSN' : 'HSN/SAC',
    qty: language === 'hi' ? 'मात्रा' : 'Qty',
    rate: language === 'hi' ? 'दर' : 'Rate',
    gstRate: language === 'hi' ? 'GST दर' : 'GST %',
    cgst: language === 'hi' ? `CGST (${currencySymbol})` : 'CGST',
    sgst: language === 'hi' ? `SGST (${currencySymbol})` : 'SGST',
    igst: language === 'hi' ? `IGST (${currencySymbol})` : 'IGST',
    total: language === 'hi' ? `कुल (${currencySymbol})` : 'Total Amount',
    subtotal: language === 'hi' ? 'उप-कुल राशि' : 'Subtotal Amount',
    totalGST: language === 'hi' ? 'कुल जीएसटी राशि' : 'Total GST Amount',
    grandTotal: language === 'hi' ? 'कुल देय राशि' : 'Grand Total Due',
    draft: language === 'hi' ? 'ड्राफ्ट' : 'Draft',
    finalized: language === 'hi' ? 'सत्यापित' : 'Finalized',
    paid: language === 'hi' ? 'भुगतान किया' : 'Paid',
    taxSummary: language === 'hi' ? 'जीएसटी कर विवरण' : 'GST Tax Summary',
    sign: language === 'hi' ? 'अधिकृत हस्ताक्षरकर्ता' : 'Authorized Signatory',
    rules: language === 'hi' ? 'नोट: यह एक कंप्यूटर जनित इनवॉइस है और इस पर हस्ताक्षर की आवश्यकता नहीं है।' : 'Note: This is a computer-generated invoice and requires no signature.'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading Invoice Details...</p>
        </div>
      </div>
    )
  }

  if (errorMessage || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 font-sans p-4">
        <div className="p-6 bg-red-950/40 border border-red-800/60 text-red-300 text-sm rounded-xl max-w-md w-full text-center">
          <p className="font-bold">{errorMessage || 'Invoice not found.'}</p>
          <Link href="/dashboard/invoices" className="mt-4 inline-block text-xs font-semibold text-blue-400 hover:underline">
            &larr; {trans.back}
          </Link>
        </div>
      </div>
    )
  }

  const isInterState = invoice.items.some(item => item.igst > 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none print:hidden"></div>
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none print:hidden"></div>

      {/* Nav Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard/invoices" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
            &larr; {trans.back}
          </Link>

          <div className="flex items-center gap-3">
            {/* Finalize Button */}
            {invoice.status === 'draft' && (
              <button
                onClick={handleFinalize}
                disabled={actionLoading}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {actionLoading ? 'Finalizing...' : trans.finalize}
              </button>
            )}

            {/* Pay Button */}
            {invoice.status === 'finalized' && (
              <button
                onClick={handleMarkAsPaid}
                disabled={actionLoading}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-emerald-500/20 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {actionLoading ? 'Recording Payment...' : trans.pay}
              </button>
            )}

            {/* E-Invoice sandbox generation */}
            {invoice.status !== 'draft' && !invoice.irn && (
              <button
                onClick={handleGenerateEInvoice}
                disabled={actionLoading}
                className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {actionLoading ? 'Generating IRN...' : language === 'hi' ? 'ई-इनवॉइस बनाएं' : 'Generate E-Invoice'}
              </button>
            )}

            {/* E-Way Bill sandbox generation */}
            {invoice.status !== 'draft' && !invoice.ewayBillNumber && (
              <button
                onClick={() => setEwayModalOpen(true)}
                disabled={actionLoading}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-violet-500/20 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {language === 'hi' ? 'ई-वे बिल बनाएं' : 'Generate E-Way Bill'}
              </button>
            )}

            {/* E-Way Bill Part-B vehicle transshipment updates */}
            {invoice.ewayBillNumber && (
              <button
                onClick={() => {
                  setNewVehicleNumber(invoice.ewayVehicleNumber || '')
                  setVehicleModalOpen(true)}
                }
                disabled={actionLoading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all"
              >
                🚚 {language === 'hi' ? 'वाहन अपडेट (Part-B)' : 'Update Vehicle (Part-B)'}
              </button>
            )}

            {/* WhatsApp invoice notification simulation dispatch */}
            {invoice.status !== 'draft' && (
              <button
                onClick={() => {
                  setWhatsappPhone(invoice.whatsappPhone || '')
                  setWhatsappModalOpen(true)
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                💬 {invoice.whatsappSentAt ? (language === 'hi' ? 'व्हाट्सएप (भेजा गया)' : 'WhatsApp (Sent)') : (language === 'hi' ? 'व्हाट्सएप शेयर' : 'Share WhatsApp')}
              </button>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-lg tracking-wide transition-all"
            >
              {trans.print}
            </button>
          </div>
        </div>
      </header>

      {/* Main Print Ready Container */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8 z-10 flex-grow print:py-0 print:px-0">
        {/* Invoice Page Sheet */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl print:bg-white print:text-slate-900 print:border-0 print:p-0 print:shadow-none transition-all">
          
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-800 print:border-slate-300">
            <div className="flex-1">
              <h1 className="text-3xl font-black tracking-tight text-white print:text-slate-900">
                {invoice.status === 'draft' ? trans.draftInvoice : trans.taxInvoice}
              </h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1 print:text-slate-500">
                {invoice.company.name}
              </p>
              {invoice.whatsappSentAt && (
                <div className="mt-3 px-3 py-1.5 bg-emerald-950/40 border border-emerald-800/50 rounded-lg inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold print:hidden">
                  <span className="text-emerald-500 animate-pulse">●</span>
                  💬 {language === 'hi' ? 'व्हाट्सएप पर साझा किया गया:' : 'Shared on WhatsApp with'} <strong className="font-mono">{invoice.whatsappPhone}</strong> {language === 'hi' ? 'को' : 'at'} {new Date(invoice.whatsappSentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {invoice.irn && (
                <div className="mt-4 max-w-xl">
                  <div className="text-[10px] text-slate-500 print:text-slate-400 uppercase font-black tracking-wider">IRP Sandbox Registered E-Invoice</div>
                  <div className="text-[9px] font-mono break-all text-slate-400 print:text-slate-700 bg-slate-950/40 print:bg-slate-50 p-2 rounded mt-1 border border-slate-800/80 print:border-slate-200">
                    <strong>IRN:</strong> {invoice.irn}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {invoice.irn && (
                <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-slate-800/80 print:border-slate-200">
                  <img
                    src={`https://chart.googleapis.com/chart?cht=qr&chs=100x100&chl=${encodeURIComponent(`irn:${invoice.irn},amt:${invoice.totalAmount},num:${invoice.invoiceNumber}`)}`}
                    alt="E-Invoice QR"
                    className="w-20 h-20"
                  />
                  <span className="text-[7px] text-slate-900 font-bold uppercase tracking-wider mt-1">Govt Portal QR</span>
                </div>
              )}

              <div className="text-sm space-y-1 text-slate-400 print:text-slate-600 font-semibold text-right sm:text-left">
                <div>
                  <span className="text-slate-500">{trans.invoiceNo}:</span>{' '}
                  <span className="font-mono text-xs font-bold text-slate-200 print:text-slate-800">{invoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">{trans.date}:</span>{' '}
                  <span className="text-slate-200 print:text-slate-800">
                    {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{trans.status}:</span>{' '}
                  <span className="uppercase text-xs font-black text-slate-300 print:text-slate-800">
                    {invoice.status === 'draft' ? trans.draft : invoice.status === 'finalized' ? trans.finalized : trans.paid}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Parties Meta Details (Seller & Buyer) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-800 print:border-slate-300">
            {/* Seller */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{trans.seller}</h3>
              <div className="text-sm font-semibold">
                <div className="text-white font-bold print:text-slate-900">{invoice.company.name}</div>
                {invoice.company.address && (
                  <div className="text-slate-400 print:text-slate-500 text-xs mt-1 leading-relaxed">{invoice.company.address}</div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 print:text-slate-500 mt-2">
                  {invoice.company.gstin && <span><strong>GSTIN:</strong> {invoice.company.gstin}</span>}
                  {invoice.company.pan && <span><strong>PAN:</strong> {invoice.company.pan}</span>}
                </div>
              </div>
            </div>

            {/* Buyer */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{trans.buyer}</h3>
              <div className="text-sm font-semibold">
                <div className="text-white font-bold print:text-slate-900">{invoice.customerName}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 print:text-slate-500 mt-2">
                  {invoice.customerGSTIN ? (
                    <span><strong>GSTIN:</strong> {invoice.customerGSTIN}</span>
                  ) : (
                    <span className="text-slate-600 print:text-slate-400 italic">Unregistered Consumer</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="py-8 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 print:border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-slate-600">
                  <th className="py-3 pr-4">{trans.desc}</th>
                  <th className="py-3 px-2 text-center">{trans.hsn}</th>
                  <th className="py-3 px-2 text-center">{trans.qty}</th>
                  <th className="py-3 px-2 text-right">{trans.rate}</th>
                  <th className="py-3 px-2 text-center">{trans.gstRate}</th>
                  {!isInterState ? (
                    <React.Fragment>
                      <th className="py-3 px-2 text-right">{trans.cgst}</th>
                      <th className="py-3 px-2 text-right">{trans.sgst}</th>
                    </React.Fragment>
                  ) : (
                    <th className="py-3 px-2 text-right">{trans.igst}</th>
                  )}
                  <th className="py-3 pl-4 text-right">{trans.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 text-xs font-medium">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="text-slate-300 print:text-slate-800">
                    <td className="py-4 pr-4 font-bold text-white print:text-slate-900">{item.description}</td>
                    <td className="py-4 px-2 text-center font-mono text-[10px] text-slate-500 print:text-slate-600">{item.hsnCode || '-'}</td>
                    <td className="py-4 px-2 text-center">{item.quantity}</td>
                    <td className="py-4 px-2 text-right">{currencySymbol}{item.rate.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-2 text-center">{item.gstRate}%</td>
                    {!isInterState ? (
                      <React.Fragment>
                        <td className="py-4 px-2 text-right text-slate-400 print:text-slate-600">{currencySymbol}{item.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-2 text-right text-slate-400 print:text-slate-600">{currencySymbol}{item.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </React.Fragment>
                    ) : (
                      <td className="py-4 px-2 text-right text-slate-400 print:text-slate-600">{currencySymbol}{item.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    )}
                    <td className="py-4 pl-4 text-right font-bold text-white print:text-slate-900">{currencySymbol}{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Calculations Sheet */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-8 border-t border-slate-800 print:border-slate-300">
            <div className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-sm print:text-slate-500">
              <p className="font-bold uppercase tracking-wider">{trans.taxSummary}:</p>
              <p className="mt-1">{isInterState ? 'Integrated Goods and Services Tax (IGST) calculated for out-of-state transaction.' : 'Central & State tax equally distributed (50:50) for intra-state supply.'}</p>
              <p className="mt-4 italic">{trans.rules}</p>

              {/* GST E-WAY BILL SYSTEM DETAILS */}
              {invoice.ewayBillNumber && (
                <div className="mt-6 p-4 bg-slate-950/40 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl max-w-md w-full font-semibold">
                  <div className="text-[10px] text-slate-500 print:text-slate-500 uppercase font-black tracking-wider flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-violet-400 print:text-violet-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.325-5.153a3.375 3.375 0 0 0-3.351-3.163H12M4.5 12h12.75M9 3v9m3-9v9" />
                    </svg>
                    GST E-WAY BILL SYSTEM (NIC)
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] mt-3 text-slate-300 print:text-slate-800">
                    <div>
                      <span className="text-slate-500 print:text-slate-500 block text-[9px] uppercase tracking-wide">E-Way Bill Number</span>
                      <span className="font-mono font-bold text-white print:text-slate-900 text-xs">{invoice.ewayBillNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 print:text-slate-500 block text-[9px] uppercase tracking-wide">Vehicle Number</span>
                      <span className="font-bold text-white print:text-slate-900">{invoice.ewayVehicleNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 print:text-slate-500 block text-[9px] uppercase tracking-wide">Transporter ID</span>
                      <span className="font-mono text-white print:text-slate-900">{invoice.ewayTransporterId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 print:text-slate-500 block text-[9px] uppercase tracking-wide">Distance Range</span>
                      <span className="text-white print:text-slate-900">{invoice.ewayDistance} km</span>
                    </div>
                    {invoice.ewayPartBReason && (
                      <div className="col-span-2 border-t border-slate-800/80 print:border-slate-300 pt-2.5 mt-1">
                        <span className="text-slate-500 print:text-slate-500 block text-[9px] uppercase tracking-wide">Part-B Transshipment Settle Details (NIC)</span>
                        <span className="text-xs text-white print:text-slate-900 font-bold block mt-0.5">
                          Active Vehicle Number: <span className="font-mono text-cyan-400 print:text-cyan-600">{invoice.ewayVehicleNumber}</span> (New)
                        </span>
                        <span className="text-[10px] text-slate-400 print:text-slate-500 block mt-0.5">
                          Update Reason: {invoice.ewayPartBReason}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full md:max-w-xs space-y-3 text-xs font-semibold text-slate-400 print:text-slate-600">
              <div className="flex items-center justify-between">
                <span>{trans.subtotal}</span>
                <span className="text-slate-200 print:text-slate-800">{currencySymbol}{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {!isInterState ? (
                <React.Fragment>
                  <div className="flex items-center justify-between">
                    <span>{trans.cgst}</span>
                    <span className="text-slate-200 print:text-slate-800">{currencySymbol}{(invoice.totalGST / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{trans.sgst}</span>
                    <span className="text-slate-200 print:text-slate-800">{currencySymbol}{(invoice.totalGST / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </React.Fragment>
              ) : (
                <div className="flex items-center justify-between">
                  <span>{trans.igst}</span>
                  <span className="text-slate-200 print:text-slate-800">{currencySymbol}{invoice.totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 print:border-slate-300 text-base font-black text-white print:text-slate-900">
                <span>{trans.grandTotal}</span>
                <span>{currencySymbol}{invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {invoice.currency !== 'INR' && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 print:border-slate-300 text-xs font-bold text-emerald-400 print:text-emerald-700">
                  <span>Base INR Value (Equivalent)</span>
                  <span>₹{(invoice.totalAmount * invoice.exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Signature Placeholder */}
          <div className="hidden print:flex flex-col items-end pt-16 mt-16 text-xs text-slate-600 font-bold">
            <div className="w-48 border-b border-slate-300 text-center pb-1"></div>
            <p className="mt-1.5 w-48 text-center uppercase tracking-wider">{trans.sign}</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-8 print:hidden">
        <p>&copy; {new Date().getFullYear()} FinNbiz. Indian GST calculations & tax split auditor.</p>
      </footer>

      {/* E-Way Bill inputs Modal */}
      {ewayModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 print:hidden animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 blur-2xl rounded-full"></div>
            
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-violet-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.325-5.153a3.375 3.375 0 0 0-3.351-3.163H12M4.5 12h12.75M9 3v9m3-9v9" />
              </svg>
              {language === 'hi' ? 'ई-वे बिल पैरामीटर दर्ज करें' : 'NIC E-Way Bill Parameters'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {language === 'hi' ? 'सामान के परिवहन के लिए राष्ट्रीय सूचना विज्ञान केंद्र (NIC) से वैध ई-वे बिल जेनरेट करें।' : 'Generate an official simulated e-way bill number from NIC portal by filing transporter logs.'}
            </p>

            <form onSubmit={handleGenerateEWayBillSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {language === 'hi' ? 'ट्रांसपोर्टर ID (Transporter ID)' : 'Transporter ID'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRANS-8844"
                  value={transporterId}
                  onChange={(e) => setTransporterId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {language === 'hi' ? 'वाहन संख्या (Vehicle Number)' : 'Vehicle Number'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-PQ-9944"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Format: State Code + RTO + Series + Digits (e.g. MH12PQ9944)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {language === 'hi' ? 'परिवहन दूरी (किमी)' : 'Distance (in km)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="4000"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setEwayModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all"
                >
                  {actionLoading ? 'Filing...' : language === 'hi' ? 'ई-वे बिल फाइल करें' : 'File E-Way Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal */}
      {whatsappModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 print:hidden animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 blur-2xl rounded-full"></div>
            
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641l-.44 1.722a.75.75 0 0 0 .981.895l1.916-.81a1.8 1.8 0 0 1 1.48.068A9.043 9.043 0 0 0 12 20.25Z" />
              </svg>
              {language === 'hi' ? 'व्हाट्सएप शेयर सिम्युलेटर' : 'WhatsApp Share Simulator'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {language === 'hi' ? 'अपने ग्राहक को पीडीएफ इनवॉइस का लिंक व्हाट्सएप बिजनेस एपीआई से साझा करें।' : 'Dispatch a high-priority simulated notification link of this Tax Invoice to your client via WhatsApp Business API.'}
            </p>

            <form onSubmit={handleSendWhatsAppSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {language === 'hi' ? 'व्हाट्सएप मोबाइल नंबर' : 'WhatsApp Mobile Number'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 9988776655"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                />
                <span className="text-[10px] text-slate-500 mt-1.5 block">Format: Country code + Number (e.g. +919988776655)</span>
              </div>

              {whatsappSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
                  <span>{language === 'hi' ? 'इनवॉइस व्हाट्सएप पर सफलतापूर्वक साझा किया गया!' : 'Tax Invoice successfully shared on WhatsApp!'}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setWhatsappModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={whatsappSending || whatsappSuccess}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  {whatsappSending ? (
                    <React.Fragment>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{language === 'hi' ? 'भेज रहा है...' : 'Sending...'}</span>
                    </React.Fragment>
                  ) : (
                    <span>{language === 'hi' ? 'साझा करें (Send)' : 'Share via WhatsApp'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Part-B Vehicle Update Modal */}
      {vehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 print:hidden animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/10 blur-2xl rounded-full"></div>
            
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.325-5.153a3.375 3.375 0 0 0-3.351-3.163H12M4.5 12h12.75M9 3v9m3-9v9" />
              </svg>
              {language === 'hi' ? 'ई-वे बिल वाहन अपडेट (Part-B)' : 'Update E-Way Bill Vehicle (Part-B)'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {language === 'hi' ? 'वाहन के टूटने या स्थानांतरण (transshipment) के कारण नए वाहन का विवरण एनआईसी पोर्टल पर अपडेट करें।' : 'Update transporter vehicle details in Part-B of NIC E-Way Bill due to vehicle breakdown or transshipment/transit changes.'}
            </p>

            <form onSubmit={handleUpdateVehicleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {language === 'hi' ? 'नया वाहन नंबर' : 'New Vehicle Number'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-RS-8877"
                  value={newVehicleNumber}
                  onChange={(e) => setNewVehicleNumber(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Format: e.g. MH12RS8877</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {language === 'hi' ? 'अपडेट का कारण' : 'Reason for Update'}
                </label>
                <select
                  value={transshipmentReason}
                  onChange={(e) => setTransshipmentReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                >
                  <option value="Transshipment">{language === 'hi' ? 'स्थानांतरण (Transshipment)' : 'Transshipment'}</option>
                  <option value="Breakdown">{language === 'hi' ? 'वाहन खराबी (Vehicle Breakdown)' : 'Vehicle Breakdown'}</option>
                  <option value="Transit Delay">{language === 'hi' ? 'पारगमन विलंब (Transit Delay)' : 'Transit Delay'}</option>
                  <option value="Other">{language === 'hi' ? 'अन्य कारण' : 'Other'}</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all"
                >
                  {actionLoading ? 'Updating NIC...' : language === 'hi' ? 'वाहन विवरण अपडेट करें' : 'Update Vehicle Logs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic CSS Print Overlay */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: #0f172a !important;
          }
          header, footer, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}
