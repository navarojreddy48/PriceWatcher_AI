import { useData } from '../context/DataContext'

const statusClasses = {
  Higher: 'text-red-600',
  Lower: 'text-green-600',
  Competitive: 'text-yellow-600',
}

function PriceTable() {
  const { dishes, isLoadingDishes, dishesError } = useData()

  if (dishesError) {
    return (
      <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {dishesError}
      </div>
    )
  }

  if (isLoadingDishes) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-600">
        Loading price comparison...
      </div>
    )
  }

  if (!dishes.length) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-600">
        No dishes found yet.
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm overflow-hidden">
      <div className="max-h-80 overflow-auto">
        <table className="w-full min-w-[680px] text-sm text-left text-gray-700">
          <thead className="bg-gray-100 text-gray-800 sticky top-0 z-10">
          <tr>
            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Dish Name</th>
            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px] text-center">Our Price</th>
            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px] text-center">Competitor Avg</th>
            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px] text-center">Difference %</th>
            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
          </tr>
          </thead>
          <tbody>
            {dishes.map((row) => (
              <tr
                key={row.id}
                className="border-t border-gray-200 even:bg-slate-50/70 hover:bg-blue-50/60 transition-all duration-300"
              >
                <td className="px-5 py-4 font-semibold text-gray-900">{row.dishName}</td>
                <td className="px-5 py-4 text-center font-medium">{row.ourPrice}</td>
                <td className="px-5 py-4 text-center font-medium">{row.competitorAvg}</td>
                <td className="px-5 py-4 text-center font-medium">{row.difference}</td>
                <td className={`px-5 py-4 font-bold ${statusClasses[row.status]}`}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PriceTable
