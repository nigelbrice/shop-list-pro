// src/pages/RecipeList.tsx
import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Star } from 'lucide-react';
import type { Recipe, RecipeCategory } from '../types/recipe';
import { RECIPE_CATEGORIES } from '../types/recipe';

export default function RecipeList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'All'>('All');

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const res = await fetch('/api/recipes', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json() as Promise<Recipe[]>;
    },
  });

  // Extract all unique tags
  const allTags = Array.from(
    new Set(recipes?.flatMap(r => r.tags || []) || [])
  ).sort();

  // Enhanced filter: search title, tags, AND ingredients + category filter
  const filteredRecipes = recipes?.filter(recipe => {
    const searchLower = searchTerm.toLowerCase();
    
    // Search in title
    const matchesTitle = recipe.title.toLowerCase().includes(searchLower);
    
    // Search in tags
    const matchesTags = recipe.tags?.some(tag => 
      tag.toLowerCase().includes(searchLower)
    );
    
    // Search in ingredients
    const matchesIngredients = recipe.ingredients?.some(ing =>
      ing.item.toLowerCase().includes(searchLower)
    );
    
    const matchesSearch = !searchTerm || matchesTitle || matchesTags || matchesIngredients;
    const matchesTag = !selectedTag || recipe.tags?.includes(selectedTag);
    const matchesCategory = selectedCategory === 'All' || recipe.category === selectedCategory;
    
    return matchesSearch && matchesTag && matchesCategory;
  });

  // Get category emoji
  const getCategoryEmoji = (category?: RecipeCategory) => {
    const emojiMap: Record<string, string> = {
      'Breakfast': '🍳',
      'Lunch': '🥗',
      'Dinner': '🍽️',
      'Dessert': '🍰',
      'Snacks': '🍿',
      'Drinks': '🍹',
      'Sides': '🥖',
      'Uncategorized': '📝',
    };
    return emojiMap[category || 'Uncategorized'] || '📝';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading recipes...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Recipes</h1>
        <Link href="/recipes/new">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Plus size={20} />
            Add Recipe
          </button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search recipes, ingredients, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category filters */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {RECIPE_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <span>{getCategoryEmoji(cat)}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-full text-sm ${
                  !selectedTag
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedTag === tag
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      {(searchTerm || selectedCategory !== 'All' || selectedTag) && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Found {filteredRecipes?.length || 0} recipe{filteredRecipes?.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Recipe Grid */}
      {filteredRecipes && filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-gray-800">
                {/* Image */}
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-4xl">
                      {getCategoryEmoji(recipe.category)}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {/* Category badge */}
                  {recipe.category && (
                    <div className="mb-2">
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                        {getCategoryEmoji(recipe.category)} {recipe.category}
                      </span>
                    </div>
                  )}

                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900 dark:text-white">
                    {recipe.title}
                  </h3>
                  
                  {/* Rating */}
                  {recipe.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < recipe.rating!
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {recipe.prepTime && <span>⏱️ {recipe.prepTime}</span>}
                    {recipe.servings && <span>👥 {recipe.servings}</span>}
                  </div>

                  {/* Tags */}
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {recipe.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{recipe.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedTag || selectedCategory !== 'All' 
              ? 'No recipes found' 
              : 'No recipes yet'}
          </p>
          <Link href="/recipes/new">
            <button className="text-blue-600 hover:underline">
              Add your first recipe
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}