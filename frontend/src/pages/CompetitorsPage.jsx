import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const statusBadgeClasses = {
  Active: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  Disabled: 'bg-slate-100 text-slate-600 border border-slate-200',
}

function CompetitorsPage() {
  const { isAdmin, accessToken } = useAuth()
  const { fetchDishes } = useData()
  const [competitors, setCompetitors] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [newPlatform, setNewPlatform] = useState('Website')
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('')
  const [newStatus, setNewStatus] = useState('Active')

  const effectiveAccessToken = accessToken || localStorage.getItem('access_token') || ''

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${effectiveAccessToken}`,
    }),
    [effectiveAccessToken],
  )

  const normalizeCompetitor = (item) => ({
    id: item.id,
    restaurantName: item.restaurant_name,
    platform: item.platform,
    websiteUrl: item.website_url,
    dishesTracked: item.dishes_tracked || 0,
    status: item.status || 'Active',
    scrapedTitle: item.scraped_title || '',
    lastUpdated: item.last_updated ? new Date(item.last_updated).toLocaleString() : 'Never',
  })

  const fetchCompetitors = async () => {
    if (!effectiveAccessToken) {
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await axios.get('http://localhost:5000/api/competitors', {
        headers: authHeaders,
      })
      setCompetitors(response.data.map(normalizeCompetitor))
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Failed to load competitors')
      setCompetitors([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompetitors()
  }, [effectiveAccessToken])

  const filteredCompetitors = useMemo(() => {
    return competitors.filter((item) => {
      const matchesSearch = item.restaurantName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = statusFilter === 'All' || item.status === statusFilter
      return matchesSearch && matchesFilter
    })
  }, [competitors, searchQuery, statusFilter])

  const closeModal = () => {
    setIsModalOpen(false)
    setNewRestaurantName('')
    setNewPlatform('Website')
    setNewWebsiteUrl('')
    setNewStatus('Active')
  }

  const handleSaveCompetitor = async () => {
    if (!newRestaurantName || !newWebsiteUrl) return

    setError('')

    try {
      await axios.post(
        'http://localhost:5000/api/competitors',
        {
          restaurant_name: newRestaurantName,
          platform: newPlatform,
          website_url: newWebsiteUrl,
          status: newStatus,
        },
        {
          headers: authHeaders,
        },
      )

      closeModal()
      await fetchCompetitors()
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Failed to add competitor')
    }
  }

  const handleToggleStatus = async (id, currentStatus) => {
    setError('')

    try {
      await axios.put(
        `http://localhost:5000/api/competitors/${id}`,
        {
          status: currentStatus === 'Active' ? 'Disabled' : 'Active',
        },
        {
          headers: authHeaders,
        },
      )

      await fetchCompetitors()
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Failed to update competitor')
    }
  }

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm('Delete this competitor?')
    if (!shouldDelete) return

    setError('')

    try {
      await axios.delete(`http://localhost:5000/api/competitors/${id}`, {
        headers: authHeaders,
      })

      await fetchCompetitors()
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Failed to delete competitor')
    }
  }

  const handleScrape = async (id) => {
    setError('')

    try {
      await axios.post(
        `http://localhost:5000/api/scrape/${id}`,
        {},
        {
          headers: authHeaders,
        },
      )

      setToastMessage('Scraping completed successfully')
      setTimeout(() => setToastMessage(''), 2500)
      await fetchDishes()
      await fetchCompetitors()
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Failed to scrape competitor')
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-3xl">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Competitor Monitoring</h1>
            <p className="mt-2 text-slate-500">Track and monitor competitor restaurant pricing</p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            hidden={!isAdmin}
          >
            + Add Competitor
          </button>
        </section>

        <section className="bg-white rounded-2xl shadow-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <input
            type="text"
            placeholder="Search competitors..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 w-full sm:w-72"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 bg-white text-slate-700"
          >
            <option>All</option>
            <option>Active</option>
            <option>Disabled</option>
          </select>
        </section>

        <section className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {error && <div className="px-5 py-3 text-sm text-red-600">{error}</div>}

          {isLoading ? (
            <div className="px-5 py-10 text-slate-500">Loading competitors...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm text-left text-slate-700">
                <thead className="bg-slate-50 uppercase text-xs tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Restaurant Name</th>
                    <th className="px-5 py-4 font-semibold">Platform</th>
                    <th className="px-5 py-4 font-semibold">Website URL</th>
                    <th className="px-5 py-4 font-semibold text-center">Dishes Tracked</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Last Updated</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompetitors.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-blue-50/60 transition-all duration-300"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900">{item.restaurantName}</td>
                      <td className="px-5 py-4">{item.platform}</td>
                      <td className="px-5 py-4 text-blue-600">{item.websiteUrl}</td>
                      <td className="px-5 py-4 text-center">{item.dishesTracked}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClasses[item.status]}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{item.lastUpdated}</td>
                      <td className="px-5 py-4">
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item.id, item.status)}
                              className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                                item.status === 'Active' ? 'bg-blue-600' : 'bg-slate-300'
                              }`}
                              aria-label="Toggle status"
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300 ${
                                  item.status === 'Active' ? 'left-5' : 'left-0.5'
                                }`}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleScrape(item.id)}
                              className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all duration-300"
                            >
                              Scrape Now
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-all duration-300"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-lg bg-emerald-600 text-white px-4 py-2 shadow-lg">
          {toastMessage}
        </div>
      )}

      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-800">Add Competitor</h2>
            <p className="text-sm text-slate-500 mt-1">Add a new source to monitor competitor pricing.</p>

            <div className="mt-5 space-y-4">
              <input
                type="text"
                placeholder="Restaurant Name"
                value={newRestaurantName}
                onChange={(event) => setNewRestaurantName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={newPlatform}
                onChange={(event) => setNewPlatform(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white"
              >
                <option>Website</option>
                <option>Zomato</option>
                <option>Swiggy</option>
                <option>Local Directory</option>
              </select>

              <input
                type="url"
                placeholder="Website URL"
                value={newWebsiteUrl}
                onChange={(event) => setNewWebsiteUrl(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white"
              >
                <option>Active</option>
                <option>Disabled</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCompetitor}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompetitorsPage
