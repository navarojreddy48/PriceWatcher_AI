import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password,
      })

      login({
        accessToken: response.data.access_token,
        user: response.data.user,
      })
      navigate('/dashboard')
    } catch (apiError) {
      setError(apiError?.response?.data?.error || 'Login failed. Please try again.')
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
            Smart Pricing Intelligence for Modern Restaurants
          </p>
          <p className="mt-4 text-sm sm:text-base text-blue-100 leading-relaxed">
            Improve profitability with competitor tracking, market trend visibility, and AI-guided pricing decisions built for restaurant teams.
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

          <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
          <p className="mt-2 text-slate-600">Login to manage your restaurant pricing</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Remember me
              </label>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 transition-all duration-300">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 text-white font-semibold py-3 transition-all duration-300 hover:bg-blue-700 hover:scale-[1.01] hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing In...' : 'Login'}
            </button>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </form>

          <p className="mt-6 text-sm text-center text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:underline transition-all duration-300">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

export default Login
