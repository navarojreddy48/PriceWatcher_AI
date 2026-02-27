import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function SettingsPage() {
  const { user, accessToken, updateUser } = useAuth()
  const effectiveAccessToken = accessToken || localStorage.getItem('access_token') || ''
  const [profileData, setProfileData] = useState({
    restaurantName: user?.restaurant_name || '',
    ownerName: user?.owner_name || '',
    email: user?.email || '',
    categoryLevel: user?.category_level || 'medium',
    location: 'Hyderabad, India',
  })
  const [profileMessage, setProfileMessage] = useState('')

  useEffect(() => {
    setProfileData((prev) => ({
      ...prev,
      restaurantName: user?.restaurant_name || '',
      ownerName: user?.owner_name || '',
      email: user?.email || '',
      categoryLevel: user?.category_level || 'medium',
    }))
  }, [user])

  const [pricingPreferences, setPricingPreferences] = useState({
    autoAdjustPricing: true,
    allowIncreaseAboveCompetitor: false,
    threshold: '5',
  })

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklySummary: true,
    competitorDropAlerts: false,
  })

  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileMessage('')

    try {
      const response = await axios.put(
        'http://localhost:5000/api/restaurant-profile',
        {
          restaurant_name: profileData.restaurantName,
          owner_name: profileData.ownerName,
          email: profileData.email,
          category_level: profileData.categoryLevel,
        },
        {
          headers: {
            Authorization: `Bearer ${effectiveAccessToken}`,
          },
        },
      )

      if (response?.data?.user) {
        updateUser(response.data.user)
      }

      setProfileMessage('Restaurant details updated successfully.')
    } catch (apiError) {
      setProfileMessage(apiError?.response?.data?.error || 'Failed to update restaurant details.')
    }
  }

  const handleDeleteAccount = () => {
    window.confirm('Are you sure you want to delete your account?')
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-3xl">
      <div className="max-w-5xl mx-auto space-y-8">
        <section>
          <h1 className="text-3xl font-semibold text-slate-800">Settings</h1>
          <p className="mt-2 text-slate-500">Manage your restaurant account and preferences</p>
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Restaurant Profile</h2>
          <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleProfileSubmit}>
            <input
              type="text"
              value={profileData.restaurantName}
              onChange={(event) => handleProfileChange('restaurantName', event.target.value)}
              placeholder="Restaurant Name"
              className="rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <input
              type="text"
              value={profileData.ownerName}
              onChange={(event) => handleProfileChange('ownerName', event.target.value)}
              placeholder="Owner Name"
              className="rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <input
              type="email"
              value={profileData.email}
              onChange={(event) => handleProfileChange('email', event.target.value)}
              placeholder="Email"
              className="rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <input
              type="text"
              value={profileData.location}
              onChange={(event) => handleProfileChange('location', event.target.value)}
              placeholder="Location"
              className="rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <select
              value={profileData.categoryLevel}
              onChange={(event) => handleProfileChange('categoryLevel', event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            >
              <option value="low">Low Level</option>
              <option value="medium">Medium Level</option>
              <option value="high">High Level</option>
              <option value="premium">Premium Level</option>
            </select>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="bg-blue-600 text-white rounded-xl px-6 py-2 hover:bg-blue-700 shadow-md transition-all duration-300"
              >
                Save Changes
              </button>
              {profileMessage && <p className="mt-3 text-sm text-slate-600">{profileMessage}</p>}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-800">Pricing Preferences</h2>

          <div className="flex items-center justify-between gap-4">
            <p className="text-slate-700">Auto-adjust pricing</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={pricingPreferences.autoAdjustPricing}
                onChange={(event) =>
                  setPricingPreferences((prev) => ({
                    ...prev,
                    autoAdjustPricing: event.target.checked,
                  }))
                }
              />
              <div className="w-10 h-5 rounded-full bg-slate-300 transition peer-checked:bg-blue-600" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </label>
          </div>

          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={pricingPreferences.allowIncreaseAboveCompetitor}
              onChange={(event) =>
                setPricingPreferences((prev) => ({
                  ...prev,
                  allowIncreaseAboveCompetitor: event.target.checked,
                }))
              }
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Allow price increase above competitor average
          </label>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Price difference threshold (%)</label>
            <input
              type="number"
              value={pricingPreferences.threshold}
              onChange={(event) =>
                setPricingPreferences((prev) => ({
                  ...prev,
                  threshold: event.target.value,
                }))
              }
              className="w-full sm:w-56 rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Notifications</h2>

          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={notifications.emailAlerts}
              onChange={(event) =>
                setNotifications((prev) => ({
                  ...prev,
                  emailAlerts: event.target.checked,
                }))
              }
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Email alerts for price changes
          </label>

          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={notifications.weeklySummary}
              onChange={(event) =>
                setNotifications((prev) => ({
                  ...prev,
                  weeklySummary: event.target.checked,
                }))
              }
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Weekly analytics summary
          </label>

          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={notifications.competitorDropAlerts}
              onChange={(event) =>
                setNotifications((prev) => ({
                  ...prev,
                  competitorDropAlerts: event.target.checked,
                }))
              }
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Competitor price drop alerts
          </label>
        </section>

        <section className="border border-red-200 bg-red-50 rounded-2xl p-6">
          <h2 className="text-red-600 font-semibold">Danger Zone</h2>
          <p className="mt-2 text-sm text-red-500">Permanently remove your account and all associated settings.</p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="mt-4 bg-red-600 text-white rounded-xl px-5 py-2 hover:bg-red-700 transition-all duration-300"
          >
            Delete Account
          </button>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
