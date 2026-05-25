'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
}

interface Company {
  id: string
  name: string
  gstin: string | null
  pan: string | null
  address: string | null
}

interface AuthContextProps {
  user: User | null
  token: string | null
  companies: Company[]
  activeCompany: Company | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  createCompany: (name: string, gstin?: string, pan?: string, address?: string) => Promise<boolean>
  setActiveCompany: (company: Company) => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

const API_BASE_URL = 'http://localhost:3001/api'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true)
      const savedToken = localStorage.getItem('finnbiz_token')
      const savedUser = localStorage.getItem('finnbiz_user')
      const savedActiveCompany = localStorage.getItem('finnbiz_active_company')

      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        if (savedActiveCompany) {
          setActiveCompanyState(JSON.parse(savedActiveCompany))
        }
        
        // Fetch fresh user profile and companies from API
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          })
          if (res.ok) {
            const data = await res.json()
            // Backend returns membership companies
            const freshUser = {
              id: data.id,
              email: data.email,
              name: data.name,
              createdAt: data.createdAt
            }
            setUser(freshUser)
            localStorage.setItem('finnbiz_user', JSON.stringify(freshUser))
            
            // Fetch companies
            await fetchCompanies(savedToken)
          } else {
            // Token expired or invalid
            logout()
          }
        } catch (err) {
          console.error('Error during initial auth verification:', err)
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const fetchCompanies = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/companies`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setCompanies(data)
        
        // Auto select active company if not set
        if (data.length > 0) {
          const savedActiveCompany = localStorage.getItem('finnbiz_active_company')
          if (savedActiveCompany) {
            const parsed = JSON.parse(savedActiveCompany)
            const found = data.find((c: Company) => c.id === parsed.id)
            if (found) {
              setActiveCompanyState(found)
              localStorage.setItem('finnbiz_active_company', JSON.stringify(found))
            } else {
              setActiveCompanyState(data[0])
              localStorage.setItem('finnbiz_active_company', JSON.stringify(data[0]))
            }
          } else {
            setActiveCompanyState(data[0])
            localStorage.setItem('finnbiz_active_company', JSON.stringify(data[0]))
          }
        } else {
          setActiveCompanyState(null)
          localStorage.removeItem('finnbiz_active_company')
        }
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login')
      }

      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('finnbiz_token', data.token)
      localStorage.setItem('finnbiz_user', JSON.stringify(data.user))
      
      // Fetch user's companies after successful login
      await fetchCompanies(data.token)

      setLoading(false)
      return true
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setLoading(false)
      return false
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register')
      }

      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('finnbiz_token', data.token)
      localStorage.setItem('finnbiz_user', JSON.stringify(data.user))
      
      setCompanies([])
      setActiveCompanyState(null)
      localStorage.removeItem('finnbiz_active_company')

      setLoading(false)
      return true
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      setLoading(false)
      return false
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setCompanies([])
    setActiveCompanyState(null)
    localStorage.removeItem('finnbiz_token')
    localStorage.removeItem('finnbiz_user')
    localStorage.removeItem('finnbiz_active_company')
    router.push('/login')
  }

  const createCompany = async (name: string, gstin?: string, pan?: string, address?: string): Promise<boolean> => {
    if (!token) return false
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, gstin, pan, address })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create company')
      }

      // Add to list and set as active
      setCompanies(prev => [...prev, data])
      setActiveCompanyState(data)
      localStorage.setItem('finnbiz_active_company', JSON.stringify(data))

      setLoading(false)
      return true
    } catch (err: any) {
      setError(err.message || 'Company setup failed')
      setLoading(false)
      return false
    }
  }

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company)
    localStorage.setItem('finnbiz_active_company', JSON.stringify(company))
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        companies,
        activeCompany,
        loading,
        error,
        login,
        register,
        logout,
        createCompany,
        setActiveCompany,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
