import { useMemo } from 'react'
import { useData } from '../context/DataContext'

function getSuggestionColor(suggestion) {
  if (suggestion.startsWith('Reduce')) return 'text-red-600'
  if (suggestion.startsWith('Increase')) return 'text-green-600'
  return 'text-yellow-600'
}

function getSuggestionBorder(suggestion) {
  if (suggestion.startsWith('Reduce')) return 'border-l-red-500'
  if (suggestion.startsWith('Increase')) return 'border-l-green-500'
  return 'border-l-yellow-500'
}

function RecommendationCard() {
  const { dishes } = useData()

  const recommendations = useMemo(() => {
    return dishes
      .map((dish) => {
        const ourPrice = Number(dish.ourPrice)
        const competitorAvg = Number(dish.competitorAvg)

        if (!Number.isFinite(ourPrice) || !Number.isFinite(competitorAvg) || competitorAvg <= 0) {
          return null
        }

        const percentDiff = ((ourPrice - competitorAvg) / competitorAvg) * 100
        const roundedAbs = Math.round(Math.abs(percentDiff))

        if (percentDiff > 2) {
          return {
            dish: dish.dishName,
            suggestion: `Reduce price by ${roundedAbs}%`,
            reason: `Price is ${roundedAbs}% higher than competitor average`,
            score: Math.abs(percentDiff),
          }
        }

        if (percentDiff < -2) {
          return {
            dish: dish.dishName,
            suggestion: `Increase price by ${roundedAbs}%`,
            reason: `Currently priced ${roundedAbs}% below competitor average`,
            score: Math.abs(percentDiff),
          }
        }

        return {
          dish: dish.dishName,
          suggestion: 'Keep price unchanged',
          reason: 'Price is competitive in the market',
          score: 0,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [dishes])

  if (!recommendations.length) {
    return <p className="text-sm text-gray-500">No pricing recommendations available yet.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {recommendations.map((item) => (
        <article
          key={item.dish}
          className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${getSuggestionBorder(item.suggestion)} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
        >
          <h3 className="text-lg font-bold tracking-tight text-gray-900">{item.dish}</h3>
          <p className={`mt-3 font-semibold text-sm sm:text-base ${getSuggestionColor(item.suggestion)}`}>
            {item.suggestion}
          </p>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">{item.reason}</p>
        </article>
      ))}
    </div>
  )
}

export default RecommendationCard
