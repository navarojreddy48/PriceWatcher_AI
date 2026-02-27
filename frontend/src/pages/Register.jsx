import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

function Register() {
  const navigate = useNavigate()
  const [restaurantName, setRestaurantName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await axios.post('http://localhost:5000/api/register', {
        restaurant_name: restaurantName,
        owner_name: ownerName,
        email,
        password,
      })

      setSuccessMessage('Account created successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 sm:px-10 py-16 flex items-center justify-center">
        <div className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-indigo-300/30 blur-3xl" />

        <div className="relative z-10 max-w-lg text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">PriceWatcher AI</h1>
          <p className="mt-6 text-xl sm:text-2xl font-semibold leading-tight">
            Start Optimizing Your Restaurant Pricing Today
          </p>
          <p className="mt-4 text-sm sm:text-base text-blue-100 leading-relaxed">
            Unlock AI-driven pricing insights to monitor competitors, identify trends, and improve your profitability with confidence.
          </p>
        </div>
      </section>

      <section className="bg-white px-6 sm:px-10 py-16 flex items-center justify-center">
        <div className="w-full max-w-[400px]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-all duration-300 mb-6"
          >
            ← Back to Home
          </Link>

          <h2 className="text-3xl font-bold text-slate-900">Create Your Account</h2>
          <p className="mt-2 text-slate-600">Set up your workspace to start smarter pricing decisions</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="restaurantName" className="block text-sm font-medium text-slate-700 mb-1.5">
                Restaurant Name
              </label>
              <input
                id="restaurantName"
                type="text"
                value={restaurantName}
                onChange={(event) => setRestaurantName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter restaurant name"
                required
              />
            </div>

            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-slate-700 mb-1.5">
                Owner Name
              </label>
              <input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter owner name"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@restaurant.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 text-white font-semibold py-3 transition-all duration-300 hover:bg-blue-700 hover:scale-[1.01] hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            {successMessage && <p className="text-sm text-emerald-600 mt-3">{successMessage}</p>}
          </form>

          <p className="mt-6 text-sm text-center text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:underline transition-all duration-300">
              Login
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

export default Register
