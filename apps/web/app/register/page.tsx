'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'

export default function RegisterPage() {
  const { register, user, error, loading, clearError } = useAuth()
  const { t, language, setLanguage } = useI18n()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({})

  useEffect(() => {
    clearError()
  }, [])

  // If user registered successfully, take them to company setup
  useEffect(() => {
    if (user) {
      router.push('/company-setup')
    }
  }, [user, router])

  const validate = () => {
    const errors: { name?: string; email?: string; password?: string } = {}
    
    if (!name) {
      errors.name = t('error.required')
    }

    if (!email) {
      errors.email = t('error.required')
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = t('error.invalid_email')
    }

    if (!password) {
      errors.password = t('error.required')
    } else if (password.length < 6) {
      errors.password = t('error.password_length')
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const success = await register(name, email, password)
    if (success) {
      // Redirection logic is handled by the useEffect above
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* Dynamic Background Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/30 blur-[120px] pointer-events-none animate-pulse"></div>

      {/* Language Toggle in Header */}
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

      {/* Register Form Card */}
      <div className="w-full max-w-md p-8 m-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-[0_0_50px_-12px_rgba(59,130,246,0.2)] backdrop-blur-xl z-10 transition-all duration-500 hover:border-slate-700/80">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            {t('brand.name')}
          </h1>
          <p className="text-sm text-slate-400 mt-2">{t('brand.tagline')}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">{t('auth.register.title')}</h2>
          <p className="text-xs text-slate-400 mt-1">{t('auth.register.subtitle')}</p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg flex items-center gap-2 animate-shake">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>{t('error.register_failed')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t('field.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('field.name.placeholder')}
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

          {/* Email Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t('field.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('field.email.placeholder')}
              className={`w-full px-4 py-3 bg-slate-950/80 border rounded-lg text-sm placeholder-slate-500 text-slate-100 outline-none transition-all duration-300 ${
                fieldErrors.email
                  ? 'border-red-500/80 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-[11px] text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t('field.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('field.password.placeholder')}
                className={`w-full px-4 py-3 pr-10 bg-slate-950/80 border rounded-lg text-sm placeholder-slate-500 text-slate-100 outline-none transition-all duration-300 ${
                  fieldErrors.password
                    ? 'border-red-500/80 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <React.Fragment>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Loading...</span>
              </React.Fragment>
            ) : (
              <span>{t('auth.register.btn')}</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          <span>{t('auth.register.have_account')} </span>
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline decoration-dotted transition-colors">
            {t('auth.register.login_link')}
          </Link>
        </div>
      </div>
    </div>
  )
}
