import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

function getDifferenceAndStatus(ourPrice, competitorAvg) {
  if (!competitorAvg) {
    return { difference: '0%', status: 'Competitive' }
  }

  const percent = ((ourPrice - competitorAvg) / competitorAvg) * 100
  const roundedPercent = Number(percent.toFixed(0))
  const difference = `${roundedPercent > 0 ? '+' : ''}${roundedPercent}%`

  if (roundedPercent > 0) {
    return { difference, status: 'Higher' }
  }

  if (roundedPercent < 0) {
    return { difference, status: 'Lower' }
  }

  return { difference, status: 'Competitive' }
}

function normalizeDish(dish) {
  const ourPrice = Number(dish.our_price)
  const competitorAvg = Number(dish.competitor_avg)
  const { difference, status } = getDifferenceAndStatus(ourPrice, competitorAvg)

  return {
    id: dish.id,
    dishName: dish.dish_name,
    category: dish.category,
    ourPrice,
    competitorAvg,
    difference,
    status,
    createdAt: dish.created_at,
  }
}

function normalizeCompetitor(item) {
  return {
    id: item.id,
    restaurantName: item.restaurant_name,
    platform: item.platform,
    websiteUrl: item.website_url,
    dishesTracked: item.dishes_tracked || 0,
    status: item.status || 'Active',
    scrapedTitle: item.scraped_title || '',
    lastUpdated: item.last_updated ? new Date(item.last_updated).toLocaleString() : 'Never',
  }
}

function DataProvider({ children }) {
  const { accessToken, isAuthenticated } = useAuth()
  const [dishes, setDishes] = useState([])
  const [competitors, setCompetitors] = useState([])
  const [isLoadingDishes, setIsLoadingDishes] = useState(false)
  const [dishesError, setDishesError] = useState('')
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false)
  const [competitorsError, setCompetitorsError] = useState('')
  const effectiveAccessToken = accessToken || localStorage.getItem('access_token') || ''

  const getAuthHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${effectiveAccessToken}`,
    }),
    [effectiveAccessToken],
  )

  const fetchDishes = useCallback(async () => {
    if (!isAuthenticated || !effectiveAccessToken) {
      setDishes([])
      return
    }

    setIsLoadingDishes(true)
    setDishesError('')

    try {
      const response = await axios.get('http://localhost:5000/api/dishes', {
        headers: getAuthHeaders(),
      })

      setDishes(response.data.map(normalizeDish))
    } catch (apiError) {
      setDishes([])
      setDishesError(apiError?.response?.data?.error || 'Failed to load dishes.')
    } finally {
      setIsLoadingDishes(false)
    }
  }, [effectiveAccessToken, getAuthHeaders, isAuthenticated])

  const fetchCompetitors = useCallback(async () => {
    if (!isAuthenticated || !effectiveAccessToken) {
      setCompetitors([])
      return
    }

    setIsLoadingCompetitors(true)
    setCompetitorsError('')

    try {
      const response = await axios.get('http://localhost:5000/api/competitors', {
        headers: getAuthHeaders(),
      })
      setCompetitors((response.data || []).map(normalizeCompetitor))
    } catch (apiError) {
      setCompetitors([])
      setCompetitorsError(apiError?.response?.data?.error || 'Failed to load competitors.')
    } finally {
      setIsLoadingCompetitors(false)
    }
  }, [effectiveAccessToken, getAuthHeaders, isAuthenticated])

  useEffect(() => {
    fetchDishes()
    fetchCompetitors()
  }, [fetchCompetitors, fetchDishes])

  const addDish = async (dish) => {
    await axios.post(
      'http://localhost:5000/api/dishes',
      {
        dish_name: dish.dishName,
        category: dish.category,
        our_price: dish.ourPrice,
        competitor_avg: dish.competitorAvg,
      },
      {
        headers: getAuthHeaders(),
      },
    )

    await fetchDishes()
  }

  const updateDish = async (updatedDish) => {
    await axios.put(
      `http://localhost:5000/api/dishes/${updatedDish.id}`,
      {
        dish_name: updatedDish.dishName,
        category: updatedDish.category,
        our_price: updatedDish.ourPrice,
        competitor_avg: updatedDish.competitorAvg,
      },
      {
        headers: getAuthHeaders(),
      },
    )

    await fetchDishes()
  }

  const deleteDish = async (dishId) => {
    await axios.delete(`http://localhost:5000/api/dishes/${dishId}`, {
      headers: getAuthHeaders(),
    })

    await fetchDishes()
  }

  const value = useMemo(
    () => ({
      dishes,
      competitors,
      isLoadingDishes,
      dishesError,
      isLoadingCompetitors,
      competitorsError,
      fetchDishes,
      fetchCompetitors,
      addDish,
      updateDish,
      deleteDish,
    }),
    [
      dishes,
      competitors,
      isLoadingDishes,
      dishesError,
      isLoadingCompetitors,
      competitorsError,
      fetchDishes,
      fetchCompetitors,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

function useData() {
  const context = useContext(DataContext)

  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }

  return context
}

export { DataProvider, useData }
