// client/src/pages/RecipeDetail.tsx
import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Trash2, Star, Clock, Users, Flame, ThermometerSun, Printer } from 'lucide-react';
import type { Recipe, RecipeCategory } from '../types/recipe';
import { RecipeToShoppingList } from '../components/RecipeToShoppingList';
import { NutritionCalculator } from '../components/NutritionCalculator';

// Category emoji helper
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

export default function RecipeDetail() {
  const [, params] = useRoute('/recipes/:id');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'base' | number>('base');

  const recipeId = params?.id;

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch recipe');
      return res.json() as Promise<Recipe>;
    },
    enabled: !!recipeId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setLocation('/recipes');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading recipe...</div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-gray-500 mb-4">Recipe not found</div>
        <button
          onClick={() => setLocation('/recipes')}
          className="text-blue-600 hover:underline"
        >
          Back to recipes
        </button>
      </div>
    );
  }

  const hasCookingMethods = recipe.cookingMethods && recipe.cookingMethods.length > 0;
  const currentMethod = selectedMethod === 'base' 
    ? null 
    : recipe.cookingMethods?.[selectedMethod as number];

  return (
    <>
      <style>{`
        @media print {
          /* Hide navigation and action buttons */
          .no-print {
            display: none !important;
          }
          
          /* Clean layout for print */
          body {
            background: white !important;
          }
          
          .print-container {
            max-width: 100% !important;
            padding: 0 !important;
          }
          
          /* Single column layout */
          .print-grid {
            display: block !important;
          }
          
          .print-grid > div {
            page-break-inside: avoid;
            margin-bottom: 2rem;
            border: none !important;
            padding: 0 !important;
          }
          
          /* Clean typography */
          h1 {
            font-size: 28pt;
            margin-bottom: 12pt;
          }
          
          h2 {
            font-size: 18pt;
            margin-top: 16pt;
            margin-bottom: 8pt;
          }
          
          /* Image sizing */
          .print-image {
            max-height: 300px;
            page-break-inside: avoid;
          }
          
          /* Tag pills */
          .print-tags span {
            border: 1px solid #333;
            padding: 2px 8px;
            margin-right: 4px;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 py-8 print-container">
        {/* Header */}
        <div className="mb-6">
          <div className="no-print">
            <button
              onClick={() => setLocation('/recipes')}
              className="flex items-center gap-2 text-muted-foreground hover:text-gray-900 dark:hover:text-white mb-4"
            >
              <ArrowLeft size={20} />
              Back to recipes
            </button>
          </div>

          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* Category badge */}
              {recipe.category && (
                <div className="mb-3">
                  <span className="text-sm bg-accent/10 text-accent px-3 py-1.5 rounded-full font-medium">
                    {getCategoryEmoji(recipe.category)} {recipe.category}
                  </span>
                </div>
              )}

              <h1 className="text-4xl font-bold mb-2 text-card-foreground">
                {recipe.title}
              </h1>

              {/* Meta info */}
              <div className="flex gap-4 text-muted-foreground mb-4">
                {recipe.prepTime && (
                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {recipe.prepTime}
                  </span>
                )}
                {recipe.servings && (
                  <span className="flex items-center gap-1">
                    <Users size={16} />
                    {recipe.servings}
                  </span>
                )}
              </div>

              {/* Tags */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4 print-tags">
                  {recipe.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Rating */}
              {recipe.rating && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={
                          i < recipe.rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {recipe.rating}/5
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 no-print">
              <RecipeToShoppingList recipe={recipe} />
              <button
                onClick={handlePrint}
                className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-secondary rounded-lg"
                title="Print recipe"
              >
                <Printer size={20} />
              </button>
              <button
                onClick={() => setLocation(`/recipes/${recipeId}/edit`)}
                className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-secondary rounded-lg"
                title="Edit recipe"
              >
                <Edit2 size={20} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-secondary rounded-lg"
                title="Delete recipe"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Image */}
        {recipe.imageUrl && (
          <div className="mb-8">
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-96 object-cover rounded-lg print-image"
            />
          </div>
        )}

        {/* Cooking Method Tabs */}
        {hasCookingMethods && (
          <div className="mb-6 no-print">
            <div className="flex gap-2 flex-wrap border-b border-border">
              <button
                onClick={() => setSelectedMethod('base')}
                className={`px-4 py-2 font-medium transition-colors ${
                  selectedMethod === 'base'
                    ? 'text-primary border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-muted-foreground hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Base Recipe
              </button>
              {recipe.cookingMethods?.map((method, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedMethod(idx)}
                  className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                    selectedMethod === idx
                      ? 'text-primary border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-muted-foreground hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Flame size={16} />
                  {method.method}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cooking Method Info (if variant selected) */}
        {currentMethod && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold mb-2 text-card-foreground">{currentMethod.method}</h3>
            <div className="flex gap-6 text-sm">
              {currentMethod.temperature && (
                <div className="flex items-center gap-2">
                  <ThermometerSun size={18} className="text-primary" />
                  <span className="text-card-foreground font-medium">{currentMethod.temperature}</span>
                </div>
              )}
              {currentMethod.time && (
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  <span className="text-card-foreground font-medium">{currentMethod.time}</span>
                </div>
              )}
            </div>
            {currentMethod.notes && (
              <p className="mt-2 text-sm text-muted-foreground">
                💡 {currentMethod.notes}
              </p>
            )}
          </div>
        )}

        {/* Main content */}
        <div className="grid md:grid-cols-2 gap-8 print-grid">
          {/* Ingredients */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-2xl font-bold mb-4 text-card-foreground">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-primary">•</span>
                  <span>
                    <span className="font-medium">
                      {ing.amount} {ing.unit}
                    </span>{' '}
                    {ing.item}
                    {ing.notes && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {' '}({ing.notes})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-2xl font-bold mb-4 text-card-foreground">
              Instructions
            </h2>
            
            {currentMethod ? (
              // Show cooking method specific instructions
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {currentMethod.instructions}
                </p>
              </div>
            ) : (
              // Show base instructions
              <ol className="space-y-4">
                {recipe.baseInstructions.map((inst) => (
                  <li key={inst.step} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {inst.step}
                    </span>
                    <span className="text-muted-foreground pt-0.5">
                      {inst.text}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Notes */}
        {recipe.notes && (
          <div className="mt-8 bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold mb-2 text-card-foreground">
              Notes
            </h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {recipe.notes}
            </p>
          </div>
        )}

        {/* Nutrition Facts */}
        <div className="mt-8">
          <NutritionCalculator 
            recipeId={recipe.id} 
            existingNutrition={{
              caloriesPer100g: recipe.caloriesPer100g,
              proteinPer100g: recipe.proteinPer100g,
              fatPer100g: recipe.fatPer100g,
              carbsPer100g: recipe.carbsPer100g,
              caloriesPerServing: recipe.caloriesPerServing,
              proteinPerServing: recipe.proteinPerServing,
              fatPerServing: recipe.fatPerServing,
              carbsPerServing: recipe.carbsPerServing,
              totalWeight: recipe.totalWeight,
              calculatedAt: recipe.calculatedAt,
            }}
            variant="card"
          />
        </div>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
            <div className="bg-card p-6 rounded-lg max-w-md mx-4">
              <h3 className="text-xl font-bold mb-4 text-card-foreground">
                Delete Recipe?
              </h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete "{recipe.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}