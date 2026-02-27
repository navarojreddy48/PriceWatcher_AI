import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function StaffManagementPage() {
  const { accessToken, isAdmin } = useAuth()
  const [staffUsers, setStaffUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [newStaffPassword, setNewStaffPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const effectiveAccessToken = accessToken || localStorage.getItem('access_token') || ''

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${effectiveAccessToken}`,
    }),
    [effectiveAccessToken],
  )

  const fetchStaffUsers = async () => {
    if (!effectiveAccessToken) {
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await axios.get('http://localhost:5000/api/staff', {
        headers: authHeaders,
      })
      setStaffUsers(response.data)
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Failed to load staff list')
      setStaffUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin && effectiveAccessToken) {
      fetchStaffUsers()
    }
  }, [isAdmin, effectiveAccessToken])

  const closeModal = () => {
    setIsModalOpen(false)
    setNewStaffName('')
    setNewStaffEmail('')
    setNewStaffPassword('')
  }

  const handleAddStaff = async (event) => {
    event.preventDefault()
    setError('')

    if (!effectiveAccessToken) {
      setError('Session expired. Please login again.')
      return
    }

    if (!newStaffName || !newStaffEmail || !newStaffPassword) {
      setError('Name, email, and password are required')
      return
    }

    setIsSubmitting(true)

    try {
      await axios.post(
        'http://localhost:5000/api/create-staff',
        {
          owner_name: newStaffName,
          email: newStaffEmail,
          password: newStaffPassword,
        },
        {
          headers: authHeaders,
        },
      )

      closeModal()
      await fetchStaffUsers()
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Failed to create staff account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStaff = async (staffId) => {
    const shouldDelete = window.confirm('Delete this staff account?')

    if (!shouldDelete) {
      return
    }

    setError('')

    if (!effectiveAccessToken) {
      setError('Session expired. Please login again.')
      return
    }

    try {
      await axios.delete(`http://localhost:5000/api/staff/${staffId}`, {
        headers: authHeaders,
      })

      await fetchStaffUsers()
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Failed to delete staff account')
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-3xl">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Staff Management</h1>
            <p className="mt-2 text-slate-500">Manage staff accounts for your restaurant</p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            + Add Staff
          </button>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <section className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-10 text-slate-500">Loading staff...</div>
          ) : staffUsers.length === 0 ? (
            <div className="px-6 py-10 text-slate-500">No staff accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm text-left text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.map((staff) => (
                    <tr key={staff.id} className="border-b border-slate-100 hover:bg-blue-50/60 transition-all duration-300">
                      <td className="px-5 py-4 font-medium text-slate-900">{staff.owner_name}</td>
                      <td className="px-5 py-4">{staff.email}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {staff.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-all duration-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-800">Add Staff</h2>
            <p className="text-sm text-slate-500 mt-1">Create a new staff account for your restaurant.</p>

            <form className="mt-5 space-y-4" onSubmit={handleAddStaff}>
              <input
                type="text"
                placeholder="Name"
                value={newStaffName}
                onChange={(event) => setNewStaffName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={newStaffEmail}
                onChange={(event) => setNewStaffEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={newStaffPassword}
                onChange={(event) => setNewStaffPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffManagementPage
