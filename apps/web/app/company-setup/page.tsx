'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'

const STATE_CODES: { [key: string]: string } = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka',
  '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
}

export default function CompanySetupPage() {
  const { createCompany, user, token, companies, error, loading, clearError } = useAuth()
  const { t, language, setLanguage } = useI18n()
  const router = useRouter()

  const [name, setName] = useState('')
  const [gstin, setGstin] = useState('')
  const [pan, setPan] = useState('')
  const [address, setAddress] = useState('')
  const [detectedState, setDetectedState] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; gstin?: string; pan?: string }>({})

  // Protected route check
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  // Clear errors on mount
  useEffect(() => {
    clearError()
  }, [])

  // If user already has companies, allow skipping or redirect to dashboard
  useEffect(() => {
    if (companies.length > 0) {
      router.push('/dashboard')
    }
  }, [companies, router])

  // Extract PAN & State from GSTIN automatically
  useEffect(() => {
    const cleanGstin = gstin.trim().toUpperCase()
    
    // State lookup
    if (cleanGstin.length >= 2) {
      const stateCode = cleanGstin.substring(0, 2)
      if (STATE_CODES[stateCode]) {
        setDetectedState(STATE_CODES[stateCode])
      } else {
        setDetectedState('')
      }
    } else {
      setDetectedState('')
    }

    // Auto Extract PAN: GSTIN format is StateCode(2) + PAN(10) + EntityCode(1) + Z(1) + CheckDigit(1)
    if (cleanGstin.length >= 12) {
      const extractedPan = cleanGstin.substring(2, 12)
      // Check if extracted part is a valid PAN structure
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(extractedPan)) {
        setPan(extractedPan)
      }
    }
  }, [gstin])

  const validate = () => {
    const errors: { name?: string; gstin?: string; pan?: string } = {}

    if (!name.trim()) {
      errors.name = t('error.required')
    }

    if (gstin.trim()) {
      const cleanGstin = gstin.trim().toUpperCase()
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      if (!gstinRegex.test(cleanGstin)) {
        errors.gstin = t('error.invalid_gstin')
      }
    }

    if (pan.trim()) {
      const cleanPan = pan.trim().toUpperCase()
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
      if (!panRegex.test(cleanPan)) {
        errors.pan = t('error.invalid_pan')
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const success = await createCompany(
      name.trim(),
      gstin.trim().toUpperCase() || undefined,
      pan.trim().toUpperCase() || undefined,
      address.trim() || undefined
    )

    if (success) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/30 blur-[120px] pointer-events-none"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-10 flex items-center bg-slate-900/80 border border-slate-800 rounded-full p-1 shadow-2xl backdrop-blur-md">
        <button
          onClick={() => setLanguage('en')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
            language === 'en'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage('hi')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
            language === 'hi'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          हिंदी
        </button>
      </div>

      {/* Company Setup Card */}
      <div className="w-full max-w-lg p-8 m-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-[0_0_50px_-12px_rgba(59,130,246,0.2)] backdrop-blur-xl z-10 transition-all duration-500 hover:border-slate-700/80">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            {t('brand.name')}
          </h1>
          <p className="text-sm text-slate-400 mt-2">{t('brand.tagline')}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">{t('setup.title')}</h2>
          <p className="text-xs text-slate-400 mt-1">{t('setup.subtitle')}</p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>{error || t('error.company_failed')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Company Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t('field.company_name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('field.company_name.placeholder')}
              className={`w-full px-4 py-3 bg-slate-950/80 border rounded-lg text-sm placeholder-slate-500 text-slate-100 outline-none transition-all duration-300 ${
                fieldErrors.name
                  ? 'border-red-500/80 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-red-400">{fieldErrors.name}</p>
            )}
          </div>

          {/* GSTIN and PAN inline or vertical */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GSTIN */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('field.gstin')}
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
                placeholder={t('field.gstin.placeholder')}
                className={`w-full px-4 py-3 bg-slate-950/80 border rounded-lg text-sm placeholder-slate-500 text-slate-100 outline-none transition-all duration-300 ${
                  fieldErrors.gstin
                    ? 'border-red-500/80 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
                }`}
              />
              {detectedState && (
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                  <span>State: {detectedState}</span>
                </div>
              )}
              {fieldErrors.gstin && (
                <p className="text-[11px] text-red-400">{fieldErrors.gstin}</p>
              )}
            </div>

            {/* PAN */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('field.pan')}
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder={t('field.pan.placeholder')}
                className={`w-full px-4 py-3 bg-slate-950/80 border rounded-lg text-sm placeholder-slate-500 text-slate-100 outline-none transition-all duration-300 ${
                  fieldErrors.pan
                    ? 'border-red-500/80 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
                }`}
              />
              {fieldErrors.pan && (
                <p className="text-[11px] text-red-400">{fieldErrors.pan}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t('field.address')}
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('field.address.placeholder')}
              rows={3}
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-lg text-sm placeholder-slate-500 text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all duration-300 resize-none"
            />
          </div>

          {/* Setup Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <React.Fragment>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving...</span>
              </React.Fragment>
            ) : (
              <span>{t('setup.btn')}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
