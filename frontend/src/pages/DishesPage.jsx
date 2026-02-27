import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const statusBadgeClasses = {
  Higher: 'bg-red-50 text-red-600 border border-red-200',
  Lower: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  Competitive: 'bg-amber-50 text-amber-600 border border-amber-200',
}

function DishesPage() {
  const { isAdmin } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedDishId, setSelectedDishId] = useState(null)
  const { dishes, addDish, updateDish, deleteDish, isLoadingDishes, dishesError } = useData()
  const [actionError, setActionError] = useState('')

  const [newDishName, setNewDishName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newOurPrice, setNewOurPrice] = useState('')

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const matchesSearch = dish.dishName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = statusFilter === 'All' || dish.status === statusFilter
      return matchesSearch && matchesFilter
    })
  }, [dishes, searchQuery, statusFilter])

  const closeModal = () => {
    setIsAddModalOpen(false)
    setIsEditing(false)
    setSelectedDishId(null)
    setNewDishName('')
    setNewCategory('')
    setNewOurPrice('')
  }

  const handleOpenAddModal = () => {
    setIsEditing(false)
    setSelectedDishId(null)
    setNewDishName('')
    setNewCategory('')
    setNewOurPrice('')
    setIsAddModalOpen(true)
  }

  const handleEditDish = (dish) => {
    setIsEditing(true)
    setSelectedDishId(dish.id)
    setNewDishName(dish.dishName)
    setNewCategory(dish.category)
    setNewOurPrice(String(dish.ourPrice))
    setIsAddModalOpen(true)
  }

  const handleDeleteDish = async (dishId) => {
    const shouldDelete = window.confirm('Are you sure you want to delete this dish?')

    if (!shouldDelete) {
      return
    }

    setActionError('')

    try {
      await deleteDish(dishId)
    } catch (apiError) {
      setActionError(apiError?.response?.data?.error || 'Failed to delete dish.')
    }
  }

  const handleSaveDish = async () => {
    const parsedPrice = Number(newOurPrice)

    if (!newDishName || !newCategory || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return
    }

    const competitorAvg = parsedPrice
    const difference = '0%'
    const status = 'Competitive'

    setActionError('')

    try {
      if (isEditing && selectedDishId !== null) {
        await updateDish({
          id: selectedDishId,
          dishName: newDishName,
          category: newCategory,
          ourPrice: parsedPrice,
          competitorAvg,
          difference,
          status,
        })
      } else {
        await addDish({
          dishName: newDishName,
          category: newCategory,
          ourPrice: parsedPrice,
          competitorAvg,
          difference,
          status,
        })
      }

      closeModal()
    } catch (apiError) {
      setActionError(apiError?.response?.data?.error || 'Failed to save dish.')
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 py-8 sm:py-10 rounded-3xl transition-all duration-300">
      <div className="max-w-7xl mx-auto space-y-6 px-1">
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Dishes Management</h1>
            <p className="mt-2 text-slate-500">Manage your restaurant menu and pricing</p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            hidden={!isAdmin}
          >
            + Add Dish
          </button>
        </section>

        <section className="bg-white rounded-2xl shadow-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300">
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-64 transition-all duration-300"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 bg-white text-slate-700 transition-all duration-300"
          >
            <option>All</option>
            <option>Higher</option>
            <option>Lower</option>
            <option>Competitive</option>
          </select>
        </section>

        <section className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
          {isLoadingDishes && <div className="px-6 py-4 text-sm text-slate-500">Loading dishes...</div>}
          {dishesError && <div className="px-6 py-4 text-sm text-red-600">{dishesError}</div>}
          {actionError && <div className="px-6 py-4 text-sm text-red-600">{actionError}</div>}

          {filteredDishes.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 mb-4" />
              <p className="text-slate-500">No dishes added yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm text-left text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Dish Name</th>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-5 py-4 font-semibold text-center">Our Price</th>
                    <th className="px-5 py-4 font-semibold text-center">Competitor Avg</th>
                    <th className="px-5 py-4 font-semibold text-center">Difference %</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDishes.map((dish) => (
                    <tr
                      key={dish.id}
                      className="border-b border-slate-100 even:bg-slate-50/70 hover:bg-blue-50 transition-all duration-300"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900">{dish.dishName}</td>
                      <td className="px-5 py-4">{dish.category}</td>
                      <td className="px-5 py-4 text-center">{dish.ourPrice}</td>
                      <td className="px-5 py-4 text-center">{dish.competitorAvg}</td>
                      <td className="px-5 py-4 text-center">{dish.difference}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClasses[dish.status]}`}>
                          {dish.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 space-x-3 whitespace-nowrap">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditDish(dish)}
                              className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg font-medium cursor-pointer transition-all duration-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDish(dish.id)}
                              className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg font-medium cursor-pointer transition-all duration-300"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isAdmin && isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Dish' : 'Add New Dish'}</h2>
            <p className="mt-1 text-sm text-slate-600">Add basic dish details to your menu list</p>

            <div className="mt-5 space-y-4">
              <input
                type="text"
                placeholder="Dish Name"
                value={newDishName}
                onChange={(event) => setNewDishName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Category"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Our Price"
                value={newOurPrice}
                onChange={(event) => setNewOurPrice(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDish}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DishesPage
