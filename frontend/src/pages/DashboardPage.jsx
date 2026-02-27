import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import PriceTable from '../components/PriceTable'
import RecommendationCard from '../components/RecommendationCard'
import TrendChart from '../components/TrendChart'
import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const { accessToken, isAuthenticated } = useAuth()
  const [dishes, setDishes] = useState([])
  const [competitorsCount, setCompetitorsCount] = useState(0)
  const [alertsCount, setAlertsCount] = useState(0)
  const effectiveAccessToken = accessToken || localStorage.getItem('access_token') || ''

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated || !effectiveAccessToken) {
        setDishes([])
        setCompetitorsCount(0)
        setAlertsCount(0)
        return
      }

      const headers = {
        Authorization: `Bearer ${effectiveAccessToken}`,
      }

      try {
        const [dishesResponse, competitorsResponse, alertsResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/dishes', { headers }),
          axios.get('http://localhost:5000/api/competitors', { headers }),
          axios.get('http://localhost:5000/api/alerts', { headers }),
        ])

        setDishes(Array.isArray(dishesResponse.data) ? dishesResponse.data : [])
        setCompetitorsCount(Array.isArray(competitorsResponse.data) ? competitorsResponse.data.length : 0)
        setAlertsCount(Array.isArray(alertsResponse.data) ? alertsResponse.data.filter((item) => !item.is_read).length : 0)
      } catch {
        setDishes([])
        setCompetitorsCount(0)
        setAlertsCount(0)
      }
    }

    fetchDashboardData()
  }, [effectiveAccessToken, isAuthenticated])

  const avgPriceDifference = useMemo(() => {
    if (!dishes.length) {
      return '0.0%'
    }

    const percentages = dishes
      .map((dish) => {
        const ourPrice = Number(dish.our_price)
        const competitorAvg = Number(dish.competitor_avg)

        if (!Number.isFinite(ourPrice) || !Number.isFinite(competitorAvg) || competitorAvg <= 0) {
          return null
        }

        return Math.abs(((ourPrice - competitorAvg) / competitorAvg) * 100)
      })
      .filter((value) => value !== null)

    if (!percentages.length) {
      return '0.0%'
    }

    const average = percentages.reduce((sum, value) => sum + value, 0) / percentages.length
    return `${average.toFixed(1)}%`
  }, [dishes])

  const stats = [
    { label: 'Total Dishes', value: String(dishes.length) },
    { label: 'Avg Price Difference', value: avgPriceDifference },
    { label: 'Active Alerts', value: String(alertsCount) },
    { label: 'Competitors Monitored', value: String(competitorsCount) },
  ]

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="bg-white rounded-2xl shadow-lg p-5 transition-all duration-300 hover:shadow-xl"
          >
            <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Price Comparison</h3>
          <PriceTable />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Price Trend Analysis</h3>
          <TrendChart />
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 mb-4">AI Recommendations</h3>
        <RecommendationCard />
      </section>
    </div>
  )
}

export default DashboardPage
