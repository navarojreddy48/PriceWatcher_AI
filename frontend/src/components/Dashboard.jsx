import PriceTable from './PriceTable'
import RecommendationCard from './RecommendationCard'
import TrendChart from './TrendChart'

function Dashboard() {
  const stats = [
    { label: 'Total Dishes Monitored', value: '25' },
    { label: 'Average Market Difference', value: '6.4%' },
    { label: 'Active Recommendations', value: '8' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
      <main className="max-w-[1200px] mx-auto">
        <header className="text-center mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Restaurant Competitor Price Watcher
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AI-Based Competitor Price Monitoring System
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="bg-white rounded-2xl shadow-lg p-5 transition-all duration-300 hover:scale-105"
            >
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-600 font-medium">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">Price Comparison</h2>
            <PriceTable />
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">Price Trend Analysis</h2>
            <TrendChart />
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">AI Recommendations</h2>
            <RecommendationCard />
          </div>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
