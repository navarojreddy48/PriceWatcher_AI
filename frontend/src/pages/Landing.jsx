import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp, Sparkles } from 'lucide-react'

function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-xl font-bold text-blue-600">PriceWatcher AI</div>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-all duration-300">
              Features
            </a>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-900">
              Optimize Your Restaurant Pricing with AI Intelligence
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Make confident pricing decisions with real-time competitor monitoring, trend analytics, and AI-powered recommendations designed for growing restaurant businesses.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="px-7 py-3 rounded-lg bg-blue-600 text-white font-semibold text-center shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-blue-700"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-7 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold text-center bg-white transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-slate-700">Dashboard Preview</h2>
              <span className="text-xs text-slate-500 inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Analytics
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs text-slate-500">Avg Difference</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">6.4%</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs text-slate-500">Active Alerts</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">8</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 p-4 space-y-3">
              <div className="h-3 rounded-full bg-blue-200 w-3/4 group-hover:w-4/5 transition-all duration-500" />
              <div className="h-3 rounded-full bg-indigo-200 w-1/2 group-hover:w-3/5 transition-all duration-500" />
              <div className="h-3 rounded-full bg-purple-200 w-7/12 group-hover:w-2/3 transition-all duration-500" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm sm:text-base font-medium text-slate-600">
            Trusted by growing restaurants
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 justify-items-center">
            <div className="w-full max-w-[220px] text-center bg-white rounded-xl shadow-sm px-6 py-4 text-slate-500 font-medium hover:shadow-md transition-all duration-300 hover:-translate-y-1 opacity-70 hover:opacity-100">
              UrbanEats
            </div>
            <div className="w-full max-w-[220px] text-center bg-white rounded-xl shadow-sm px-6 py-4 text-slate-500 font-medium hover:shadow-md transition-all duration-300 hover:-translate-y-1 opacity-70 hover:opacity-100">
              MetroBites
            </div>
            <div className="w-full max-w-[220px] text-center bg-white rounded-xl shadow-sm px-6 py-4 text-slate-500 font-medium hover:shadow-md transition-all duration-300 hover:-translate-y-1 opacity-70 hover:opacity-100">
              FlavorFleet
            </div>
            <div className="w-full max-w-[220px] text-center bg-white rounded-xl shadow-sm px-6 py-4 text-slate-500 font-medium hover:shadow-md transition-all duration-300 hover:-translate-y-1 opacity-70 hover:opacity-100">
              CitySpoon
            </div>
            <div className="w-full max-w-[220px] text-center bg-white rounded-xl shadow-sm px-6 py-4 text-slate-500 font-medium hover:shadow-md transition-all duration-300 hover:-translate-y-1 opacity-70 hover:opacity-100">
              DineDash
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="group bg-white rounded-2xl shadow-lg p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-50 mb-5 group-hover:scale-110 transition-all duration-300">
              <BarChart3 className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Competitor Monitoring</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Track competitor prices continuously and detect market changes early to protect margins and stay competitive.
            </p>
          </article>

          <article className="group bg-white rounded-2xl shadow-lg p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-50 mb-5 group-hover:scale-110 transition-all duration-300">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Trend Analysis</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Analyze historical pricing patterns to uncover trends, seasonality, and opportunities for strategic adjustments.
            </p>
          </article>

          <article className="group bg-white rounded-2xl shadow-lg p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-50 mb-5 group-hover:scale-110 transition-all duration-300">
              <Sparkles className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">AI Recommendations</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Receive intelligent pricing suggestions based on competitor benchmarks and your market positioning goals.
            </p>
          </article>
        </div>
      </section>

      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold">Product</h3>
            <p className="mt-2 text-sm text-slate-300">Features</p>
          </div>
          <div>
            <h3 className="font-semibold">Company</h3>
            <p className="mt-2 text-sm text-slate-300">About</p>
            <p className="mt-1 text-sm text-slate-300">Careers</p>
          </div>
          <div>
            <h3 className="font-semibold">Contact</h3>
            <p className="mt-2 text-sm text-slate-300">support@pricewatcher.ai</p>
            <p className="mt-1 text-sm text-slate-300">+1 (555) 000-2026</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-700 text-sm text-slate-400">
          © 2026 PriceWatcher AI
        </div>
      </footer>
    </div>
  )
}

export default Landing
