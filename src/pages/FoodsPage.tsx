import { FoodSearch } from '../components/food/FoodSearch'

export function FoodsPage() {
  return (
    <div className="px-4 py-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Foods</h1>
        <p className="text-sm text-text/60 mt-1">Search and manage food items for your recipes.</p>
      </div>

      <FoodSearch mode="browse" />
    </div>
  )
}
