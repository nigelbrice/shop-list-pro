// src/pages/RecipeList.tsx
import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Star, X } from 'lucide-react';
import type { Recipe, RecipeCategory } from '../types/recipe';
import { RECIPE_CATEGORIES } from '../types/recipe';

export default function RecipeList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'All'>('All');

  const { data: recipes, isLoading, refetch } = useQuery({
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

  // Permanently delete tag from all recipes
  const handleDeleteTag = async (tagToDelete: string) => {
    const recipeCount = recipes?.filter(r => r.tags?.includes(tagToDelete)).length || 0;
    
    if (!confirm(`Delete tag "${tagToDelete}" from ${recipeCount} recipe(s)? This cannot be undone.`)) {
      return;
    }

    try {
      // Find all recipes with this tag and update them
      const recipesWithTag = recipes?.filter(r => r.tags?.includes(tagToDelete)) || [];
      
      for (const recipe of recipesWithTag) {
        const updatedTags = recipe.tags?.filter(t => t !== tagToDelete) || [];
        
        await fetch(`/api/recipes/${recipe.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tags: updatedTags }),
        });
      }
      
      // Deselect if currently selected
      if (selectedTag === tagToDelete) {
        setSelectedTag(null);
      }
      
      // Refresh recipes to show updated tags
      refetch();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag. Please try again.');
    }
  };

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
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <Plus size={20} />
            Add Recipe
          </button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search recipes, ingredients, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Category filters */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Category</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
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
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
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
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-full text-sm ${
                  !selectedTag
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <div key={tag} className="relative inline-block group">
                  <button
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 pr-6 rounded-full text-sm transition-colors ${
                      selectedTag === tag
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {tag}
                  </button>
                  
                  {/* Grey X button - shows on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTag(tag);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 opacity-0 group-hover:opacity-100 bg-muted-foreground/70 hover:bg-muted-foreground rounded-full flex items-center justify-center text-background transition-all"
                    title={`Delete "${tag}" from all recipes`}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      {(searchTerm || selectedCategory !== 'All' || selectedTag) && (
        <div className="mb-4 text-sm text-muted-foreground">
          Found {filteredRecipes?.length || 0} recipe{filteredRecipes?.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Recipe Grid */}
      {filteredRecipes && filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <div className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-card hover-lift">
                {/* Image */}
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <span className="text-muted-foreground text-4xl">
                      {getCategoryEmoji(recipe.category)}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {/* Category badge */}
                  {recipe.category && (
                    <div className="mb-2">
                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                        {getCategoryEmoji(recipe.category)} {recipe.category}
                      </span>
                    </div>
                  )}

                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-card-foreground">
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
                              : 'text-muted'
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                    {recipe.prepTime && <span>⏱️ {recipe.prepTime}</span>}
                    {recipe.servings && <span>👥 {recipe.servings}</span>}
                  </div>

                  {/* Tags */}
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {recipe.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
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
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedTag || selectedCategory !== 'All' 
              ? 'No recipes found' 
              : 'No recipes yet'}
          </p>
          <Link href="/recipes/new">
            <button className="text-primary hover:underline">
              Add your first recipe
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}