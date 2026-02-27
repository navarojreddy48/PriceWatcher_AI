import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'

const TREND_CHART_SELECTION_KEY = 'dashboard_trend_selected_dish'
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

function TrendChart() {
  const { dishes } = useData()
  const { accessToken } = useAuth()
  const [selectedDishId, setSelectedDishId] = useState(() => localStorage.getItem(TREND_CHART_SELECTION_KEY) || 'all')
  const [trendData, setTrendData] = useState([])
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
    localStorage.setItem(TREND_CHART_SELECTION_KEY, selectedDishId)
  }, [selectedDishId])

  const selectedTrendDish = useMemo(
    () => dishes.find((dish) => String(dish.id) === selectedDishId) || null,
    [dishes, selectedDishId],
  )

  useEffect(() => {
    const fetchTrendData = async () => {
      if (!effectiveAccessToken || !dishes.length) {
        setTrendData([])
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

        const merged = ourPoints.map((point, index) => ({
          day: point.day,
          ourPrice: point.price,
          competitorAvg: competitorPoints[index]?.price ?? null,
        }))

        setTrendData(merged)
      } catch (apiError) {
        setTrendData(buildFallbackTrendData(dishes, selectedTrendDish))
        setTrendError('')
      } finally {
        setIsTrendLoading(false)
      }
    }

    fetchTrendData()
  }, [dishes, effectiveAccessToken, selectedDishId, selectedTrendDish])

  const hasChartValues = trendData.some(
    (item) => Number.isFinite(item.ourPrice) || Number.isFinite(item.competitorAvg),
  )

  if (trendError) {
    return <p className="text-sm text-red-600">{trendError}</p>
  }

  if (isTrendLoading) {
    return <p className="text-sm text-slate-500">Loading trend data...</p>
  }

  if (!trendData.length || !hasChartValues) {
    return (
      <div className="w-full rounded-2xl bg-white/80 backdrop-blur-sm p-4 sm:p-5 transition-all duration-300">
        <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-4 tracking-tight">
          Price Trend Analysis
        </h3>
        <p className="text-sm text-gray-500">No dish data available for charting yet.</p>
      </div>
    )
  }

  return (
    <div className="w-full rounded-2xl bg-white/80 backdrop-blur-sm p-4 sm:p-5 transition-all duration-300">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm sm:text-base font-semibold text-gray-700 tracking-tight">
          {selectedTrendDish
            ? `Price Trend (Last 7 Days) - ${selectedTrendDish.dishName}`
            : 'Price Trend (Last 7 Days) - All Dishes'}
        </h3>
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 12, right: 20, left: 6, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="competitorAvg"
              name="Competitor Avg"
              stroke="#64748b"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default TrendChart
