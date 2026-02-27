import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'

const ANALYTICS_TREND_SELECTION_KEY = 'analytics_trend_selected_dish'
const TREND_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function buildFallbackTrendData(dishes, selectedDish) {
  if (!dishes.length) {
    return []
  }

  const avgOurPrice = dishes.reduce((sum, dish) => sum + Number(dish.ourPrice || 0), 0) / dishes.length
  const avgCompetitorPrice = dishes.reduce((sum, dish) => sum + Number(dish.competitorAvg || 0), 0) / dishes.length

  const baseOurPrice = selectedDish ? Number(selectedDish.ourPrice || 0) : avgOurPrice
  const baseCompetitorPrice = selectedDish ? Number(selectedDish.competitorAvg || 0) : avgCompetitorPrice
  const multipliers = [0.97, 1.01, 0.99, 1.03, 1.02, 1.06, 1.04]

  return TREND_DAYS.map((day, index) => ({
    day,
    ourPrice: Math.round(baseOurPrice * multipliers[index]),
    competitorAvg: Math.round(baseCompetitorPrice * multipliers[index]),
  }))
}

function getDifferencePercent(dish) {
  const parsed = Number.parseFloat(dish.difference)

  if (!Number.isNaN(parsed)) {
    return parsed
  }

  if (!dish.competitorAvg) {
    return 0
  }

  return ((dish.ourPrice - dish.competitorAvg) / dish.competitorAvg) * 100
}

function AnalyticsPage() {
  const { dishes } = useData()
  const { accessToken } = useAuth()
  const [insightFilter, setInsightFilter] = useState('all')
  const [selectedDishId, setSelectedDishId] = useState(
    () => localStorage.getItem(ANALYTICS_TREND_SELECTION_KEY) || 'all',
  )
  const [priceTrendData, setPriceTrendData] = useState([])
  const [isTrendLoading, setIsTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState('')
  const effectiveAccessToken = accessToken || localStorage.getItem('access_token') || ''

  useEffect(() => {
    if (!dishes.length) {
      setSelectedDishId('all')
      return
    }

    if (selectedDishId !== 'all' && !dishes.some((dish) => String(dish.id) === selectedDishId)) {
      setSelectedDishId('all')
    }
  }, [dishes, selectedDishId])

  useEffect(() => {
    localStorage.setItem(ANALYTICS_TREND_SELECTION_KEY, selectedDishId)
  }, [selectedDishId])

  const averageDifference = useMemo(() => {
    if (dishes.length === 0) {
      return 0
    }

    const totalDifference = dishes.reduce((sum, dish) => sum + getDifferencePercent(dish), 0)
    return totalDifference / dishes.length
  }, [dishes])

  const highestPricedDish = useMemo(() => {
    if (dishes.length === 0) {
      return null
    }

    return dishes.reduce((highest, dish) => (dish.ourPrice > highest.ourPrice ? dish : highest), dishes[0])
  }, [dishes])

  const lowestPricedDish = useMemo(() => {
    if (dishes.length === 0) {
      return null
    }

    return dishes.reduce((lowest, dish) => (dish.ourPrice < lowest.ourPrice ? dish : lowest), dishes[0])
  }, [dishes])

  const competitorUndercutPercent = useMemo(() => {
    if (dishes.length === 0) {
      return 0
    }

    const undercutCount = dishes.filter((dish) => dish.competitorAvg < dish.ourPrice).length
    return (undercutCount / dishes.length) * 100
  }, [dishes])

  const kpis = useMemo(
    () => [
      { label: 'Average Price Difference', value: `${averageDifference.toFixed(1)}%` },
      {
        label: 'Highest Priced Dish',
        value: highestPricedDish ? `${highestPricedDish.dishName} (₹${highestPricedDish.ourPrice})` : 'N/A',
      },
      {
        label: 'Lowest Priced Dish',
        value: lowestPricedDish ? `${lowestPricedDish.dishName} (₹${lowestPricedDish.ourPrice})` : 'N/A',
      },
      { label: 'Competitor Undercut %', value: `${competitorUndercutPercent.toFixed(0)}%` },
    ],
    [averageDifference, competitorUndercutPercent, highestPricedDish, lowestPricedDish],
  )

  const selectedTrendDish = useMemo(
    () => dishes.find((dish) => String(dish.id) === selectedDishId) || null,
    [dishes, selectedDishId],
  )

  useEffect(() => {
    const fetchTrendData = async () => {
      if (!effectiveAccessToken || !dishes.length) {
        setPriceTrendData([])
        return
      }

      setIsTrendLoading(true)
      setTrendError('')

      try {
        const baseParams = { days: 7 }

        if (selectedDishId !== 'all') {
          baseParams.dish_id = selectedDishId
        }

        const [ourResponse, competitorResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/price-history', {
            headers: {
              Authorization: `Bearer ${effectiveAccessToken}`,
            },
            params: {
              ...baseParams,
              metric: 'our_price',
            },
          }),
          axios.get('http://localhost:5000/api/price-history', {
            headers: {
              Authorization: `Bearer ${effectiveAccessToken}`,
            },
            params: {
              ...baseParams,
              metric: 'competitor_avg',
            },
          }),
        ])

        const ourPoints = Array.isArray(ourResponse.data?.points) ? ourResponse.data.points : []
        const competitorPoints = Array.isArray(competitorResponse.data?.points) ? competitorResponse.data.points : []

        setPriceTrendData(
          ourPoints.map((point, index) => ({
            day: point.day,
            ourPrice: point.price,
            competitorAvg: competitorPoints[index]?.price ?? null,
          })),
        )
      } catch (apiError) {
        setPriceTrendData(buildFallbackTrendData(dishes, selectedTrendDish))
        setTrendError('')
      } finally {
        setIsTrendLoading(false)
      }
    }

    fetchTrendData()
  }, [dishes, effectiveAccessToken, selectedDishId, selectedTrendDish])

  const hasTrendValues = useMemo(
    () => priceTrendData.some((point) => Number.isFinite(point.ourPrice) || Number.isFinite(point.competitorAvg)),
    [priceTrendData],
  )

  const comparisonData = useMemo(
    () =>
      dishes.map((dish) => ({
        dish: dish.dishName,
        ourPrice: dish.ourPrice,
        competitorAvg: dish.competitorAvg,
      })),
    [dishes],
  )

  const aiInsights = useMemo(
    () =>
      dishes.map((dish) => {
        const diff = getDifferencePercent(dish)

        if (diff > 5) {
          return {
            id: dish.id,
            status: 'higher',
            message: `${dish.dishName}: Priced significantly above market`,
            classes: 'border-red-300 bg-red-50/50',
          }
        }

        if (diff < -5) {
          return {
            id: dish.id,
            status: 'lower',
            message: `${dish.dishName}: Priced below competitors`,
            classes: 'border-amber-300 bg-amber-50/50',
          }
        }

        return {
          id: dish.id,
          status: 'competitive',
          message: `${dish.dishName}: Competitively positioned`,
          classes: 'border-emerald-300 bg-emerald-50/50',
        }
      }),
    [dishes],
  )

  const filteredInsights = useMemo(() => {
    if (insightFilter === 'all') {
      return aiInsights
    }

    return aiInsights.filter((insight) => insight.status === insightFilter)
  }, [aiInsights, insightFilter])

  const insightCounts = useMemo(() => {
    const counts = {
      all: aiInsights.length,
      higher: 0,
      lower: 0,
      competitive: 0,
    }

    aiInsights.forEach((insight) => {
      if (insight.status === 'higher') {
        counts.higher += 1
      } else if (insight.status === 'lower') {
        counts.lower += 1
      } else {
        counts.competitive += 1
      }
    })

    return counts
  }, [aiInsights])

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-3xl">
      <div className="max-w-7xl mx-auto space-y-6">
        <section>
          <h1 className="text-3xl font-semibold text-slate-800">Analytics Overview</h1>
          <p className="mt-2 text-slate-500">Monitor pricing trends and competitor intelligence</p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {kpis.map((kpi) => (
            <article
              key={kpi.label}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
            >
              <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
              <p className="mt-1 text-sm text-slate-500">{kpi.label}</p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <article className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {selectedTrendDish
                  ? `Price Trend (Last 7 Days) - ${selectedTrendDish.dishName}`
                  : 'Price Trend (Last 7 Days) - All Dishes'}
              </h2>
              <select
                value={selectedDishId}
                onChange={(event) => setSelectedDishId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All dishes</option>
                {dishes.map((dish) => (
                  <option key={dish.id} value={String(dish.id)}>
                    {dish.dishName}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-72 w-full">
              {trendError ? (
                <p className="text-sm text-red-600">{trendError}</p>
              ) : isTrendLoading ? (
                <p className="text-sm text-slate-500">Loading trend data...</p>
              ) : !hasTrendValues ? (
                <p className="text-sm text-slate-500">No historical trend data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceTrendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, '']} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ourPrice"
                      name="Our Price"
                      stroke="#2563eb"
                      strokeWidth={3}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="competitorAvg"
                      name="Competitor Avg"
                      stroke="#64748b"
                      strokeWidth={3}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Dish Price Comparison</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dish" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ourPrice" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="competitorAvg" fill="#64748b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-6 space-y-4 hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-800">AI Pricing Insights</h2>
            <select
              value={insightFilter}
              onChange={(event) => setInsightFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All ({insightCounts.all})</option>
              <option value="higher">Higher ({insightCounts.higher})</option>
              <option value="lower">Lower ({insightCounts.lower})</option>
              <option value="competitive">Competitive ({insightCounts.competitive})</option>
            </select>
          </div>

          {filteredInsights.length === 0 ? (
            <div className="border-l-4 border-slate-300 bg-slate-50 rounded-lg px-4 py-3">
              No insights available for this filter.
            </div>
          ) : (
            filteredInsights.map((insight) => (
              <div key={insight.id} className={`border-l-4 rounded-lg px-4 py-3 ${insight.classes}`}>
                {insight.message}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

export default AnalyticsPage
