import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

function normalizeUser(user) {
  if (!user) {
    return null
  }

  return {
    ...user,
    role: user.role || 'staff',
    category_level: user.category_level || 'medium',
  }
}

function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')

    if (storedToken) {
      setAccessToken(storedToken)
    }

    if (storedUser) {
      try {
        setUser(normalizeUser(JSON.parse(storedUser)))
      } catch {
        localStorage.removeItem('user')
      }
    }
  }, [])

  const login = ({ accessToken: token, user: loggedInUser }) => {
    const normalizedUser = normalizeUser(loggedInUser)
    setAccessToken(token)
    setUser(normalizedUser)
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(normalizedUser))
  }

  const updateUser = (nextUser) => {
    const normalizedUser = normalizeUser(nextUser)
    setUser(normalizedUser)
    localStorage.setItem('user', JSON.stringify(normalizedUser))
  }

  const logout = () => {
    setAccessToken('')
    setUser(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }

  const isAuthenticated = Boolean(accessToken)
  const isAdmin = user?.role === 'admin'

  const value = useMemo(
    () => ({
      isAuthenticated,
      isAdmin,
      user,
      accessToken,
      login,
      updateUser,
      logout,
    }),
    [isAuthenticated, isAdmin, user, accessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export { AuthProvider, useAuth }
