import { useMemo, useState } from 'react'
import axios from 'axios'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Utensils,
  BarChart3,
  Users,
  Store,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [alerts, setAlerts] = useState([])
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [alertsError, setAlertsError] = useState('')
  const [isAlertsLoading, setIsAlertsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user, isAdmin, accessToken } = useAuth()
  const effectiveAccessToken = accessToken || localStorage.getItem('access_token') || ''

  const sidebarLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Dishes', path: '/dishes', icon: Utensils },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  ]

  if (isAdmin) {
    sidebarLinks.push({ label: 'Staff', path: '/staff', icon: Users })
    sidebarLinks.push({ label: 'Competitors', path: '/competitors', icon: Store })
    sidebarLinks.push({ label: 'Settings', path: '/settings', icon: Settings })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${effectiveAccessToken}`,
    }),
    [effectiveAccessToken],
  )

  const unreadCount = alerts.filter((alert) => !alert.is_read).length

  const fetchAlerts = async () => {
    if (!effectiveAccessToken) {
      return
    }

    setAlertsError('')
    setIsAlertsLoading(true)

    try {
      const response = await axios.get('http://localhost:5000/api/alerts', {
        headers: authHeaders,
      })
      setAlerts(response.data)
    } catch (apiError) {
      setAlertsError(apiError?.response?.data?.error || 'Failed to fetch alerts')
    } finally {
      setIsAlertsLoading(false)
    }
  }

  const handleBellClick = async () => {
    const nextOpen = !isAlertsOpen
    setIsAlertsOpen(nextOpen)

    if (nextOpen) {
      await fetchAlerts()
    }
  }

  const handleMarkAlertRead = async (alertId) => {
    if (!effectiveAccessToken) {
      setAlertsError('Session expired. Please login again.')
      return
    }

    try {
      await axios.put(
        `http://localhost:5000/api/alerts/${alertId}/read`,
        {},
        {
          headers: authHeaders,
        },
      )

      setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, is_read: true } : alert)))
    } catch (apiError) {
      setAlertsError(apiError?.response?.data?.error || 'Failed to update alert')
    }
  }

  const categoryLevel = (user?.category_level || 'medium').toLowerCase()
  const restaurantName = user?.restaurant_name || 'Restaurant'
  const profileName = user?.restaurant_name || user?.owner_name || 'User'
  const initials = profileName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'U'
  const tierLabel = categoryLevel === 'premium' ? 'Premium' : 'Local'
  const categoryLabel =
    categoryLevel === 'low'
      ? 'Low Level'
      : categoryLevel === 'high'
        ? 'High Level'
        : categoryLevel === 'premium'
          ? 'Premium Level'
          : 'Medium Level'
  const categoryClass =
    categoryLevel === 'low'
      ? 'bg-emerald-100 text-emerald-700'
      : categoryLevel === 'high'
        ? 'bg-amber-100 text-amber-700'
        : categoryLevel === 'premium'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-sky-100 text-sky-700'

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      <aside
        className={`w-full ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'} bg-white border-r border-slate-200 min-h-screen lg:h-screen lg:sticky lg:top-0 shadow-sm px-4 py-6 flex flex-col justify-between transition-all duration-300 ease-in-out overflow-hidden`}
      >
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-slate-200">
            <div className={`flex items-center gap-3 ${isSidebarOpen ? '' : 'flex-1 justify-center'}`}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-md hover:scale-105 transition-all duration-300">
                <BarChart3 size={20} className="text-white" />
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col">
                  <h1 className="text-slate-800 text-xl font-semibold whitespace-nowrap">PriceWatcher AI</h1>
                  <span className="text-xs text-slate-400">Competitor Intelligence</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-all duration-300 cursor-pointer"
              aria-label="Toggle sidebar"
            >
              <div className="space-y-1">
                <div className="w-5 h-0.5 bg-slate-600" />
                <div className="w-5 h-0.5 bg-slate-600" />
                <div className="w-5 h-0.5 bg-slate-600" />
              </div>
            </button>
          </div>

          {isSidebarOpen && (
            <div className="bg-blue-50 rounded-xl p-4 mt-6 text-sm">
              <p className="font-semibold text-slate-700">{restaurantName}</p>
              <p className="text-slate-500 mt-1">Rating: 4.5 ★</p>
              <p className="text-slate-500">Tier: {tierLabel}</p>
            </div>
          )}

          {isSidebarOpen && <p className="text-xs uppercase text-slate-400 mt-6 mb-2 px-4">Management</p>}

          <nav className="space-y-2">
            {sidebarLinks.map((link) => (
              <div key={link.label} className="relative group">
                <button
                  type="button"
                  onClick={() => link.path && navigate(link.path)}
                  className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4 justify-start text-left' : 'justify-center px-0'} py-3 rounded-xl cursor-pointer transition-all duration-300 hover:translate-x-1 ${
                    location.pathname === link.path
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <link.icon
                    size={20}
                    className={`text-slate-500 group-hover:text-blue-600 transition ${
                      location.pathname === link.path ? 'text-blue-600' : ''
                    }`}
                  />
                  {isSidebarOpen && <span>{link.label}</span>}
                </button>

                {!isSidebarOpen && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 translate-x-2 bg-slate-800 text-white text-sm px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200 z-30 pointer-events-none">
                    {link.label}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className={`group w-full flex items-center ${isSidebarOpen ? 'justify-start px-4 gap-3 text-left' : 'justify-center px-0'} text-red-500 hover:bg-red-50 rounded-xl py-3 hover:translate-x-1 transition-all duration-300`}
        >
          <LogOut size={20} className="text-slate-500 group-hover:text-blue-600 transition" />
          {isSidebarOpen && <span>Logout</span>}
        </button>
      </aside>

      <main className="flex-1 p-5 sm:p-8">
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{restaurantName}</h2>
            <p className="mt-1 text-slate-600">Welcome back 👋</p>
            <span className={`mt-2 inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${categoryClass}`}>
              {categoryLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={handleBellClick}
              className="relative h-10 w-10 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>

            {isAlertsOpen && (
              <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50">
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-800">Alerts</div>

                {alertsError && <div className="px-4 py-3 text-sm text-red-600">{alertsError}</div>}

                {!alertsError && isAlertsLoading && (
                  <div className="px-4 py-3 text-sm text-slate-500">Loading alerts...</div>
                )}

                {!alertsError && !isAlertsLoading && alerts.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-500">No alerts found.</div>
                )}

                {!alertsError && !isAlertsLoading &&
                  alerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => handleMarkAlertRead(alert.id)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-all duration-200 ${
                        alert.is_read ? 'bg-white' : 'bg-red-50/40'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-800">{alert.dish_name}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {alert.old_price} → {alert.new_price}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                    </button>
                  ))}
              </div>
            )}

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isAdmin ? 'Admin' : 'Staff'}
            </span>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-md cursor-pointer hover:scale-105 transition-all duration-300">
              {initials}
            </div>
          </div>
        </section>

        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout
