// client/src/components/NutritionCalculator.tsx
import { useState } from 'react';
import { Calculator, Loader2, CheckCircle, AlertCircle, Edit, X, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface NutritionData {
  per100g: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  perServing: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  totalWeight: number;
  servings: number;
}

interface IngredientBreakdown {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  weight: number;
  source: 'usda' | 'ai' | 'unknown';
}

interface NutritionCalculatorProps {
  recipeId: number;
  existingNutrition?: {
    caloriesPer100g?: number;
    proteinPer100g?: number;
    fatPer100g?: number;
    carbsPer100g?: number;
    caloriesPerServing?: number;
    proteinPerServing?: number;
    fatPerServing?: number;
    carbsPerServing?: number;
    totalWeight?: number;
    calculatedAt?: string;
    nutritionBreakdown?: IngredientBreakdown[];
  };
  variant?: 'button' | 'card'; // 'button' for edit page, 'card' for detail page
}

export function NutritionCalculator({ 
  recipeId, 
  existingNutrition,
  variant = 'button' 
}: NutritionCalculatorProps) {
  const queryClient = useQueryClient();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [ingredientBreakdown, setIngredientBreakdown] = useState<IngredientBreakdown[]>(
    existingNutrition?.nutritionBreakdown || []
  );
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({
    caloriesPer100g: 0,
    proteinPer100g: 0,
    fatPer100g: 0,
    carbsPer100g: 0,
    caloriesPerServing: 0,
    proteinPerServing: 0,
    fatPerServing: 0,
    carbsPerServing: 0,
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/recipes/${recipeId}/calculate-nutrition`, {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to calculate nutrition');
      }
      
      return data;
    },
    onSuccess: (data) => {
      setNutritionData(data.nutrition);
      setIngredientBreakdown(data.ingredientBreakdown || []);
      setError(null);
      // Refresh the recipe data to show updated nutrition
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setNutritionData(null);
      setIngredientBreakdown([]);
    },
  });

  // Save edited nutrition values
  const saveMutation = useMutation({
    mutationFn: async (values: typeof editedValues) => {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save nutrition values');
      }
      
      return res.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
    },
  });

  const handleCalculate = () => {
    setError(null);
    calculateMutation.mutate();
  };

  const handleStartEdit = () => {
    // Initialize edit values with current nutrition
    const current = nutritionData || {
      per100g: {
        calories: existingNutrition?.caloriesPer100g || 0,
        protein: existingNutrition?.proteinPer100g || 0,
        fat: existingNutrition?.fatPer100g || 0,
        carbs: existingNutrition?.carbsPer100g || 0,
      },
      perServing: {
        calories: existingNutrition?.caloriesPerServing || 0,
        protein: existingNutrition?.proteinPerServing || 0,
        fat: existingNutrition?.fatPerServing || 0,
        carbs: existingNutrition?.carbsPerServing || 0,
      },
    };
    
    setEditedValues({
      caloriesPer100g: current.per100g.calories,
      proteinPer100g: current.per100g.protein,
      fatPer100g: current.per100g.fat,
      carbsPer100g: current.per100g.carbs,
      caloriesPerServing: current.perServing.calories,
      proteinPerServing: current.perServing.protein,
      fatPerServing: current.perServing.fat,
      carbsPerServing: current.perServing.carbs,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    saveMutation.mutate(editedValues);
  };

  // Check if we have nutrition data (either from calculation or existing)
  const hasNutrition = nutritionData || (
    existingNutrition?.caloriesPer100g !== undefined &&
    existingNutrition?.caloriesPerServing !== undefined
  );

  const displayNutrition = nutritionData || {
    per100g: {
      calories: existingNutrition?.caloriesPer100g || 0,
      protein: existingNutrition?.proteinPer100g || 0,
      fat: existingNutrition?.fatPer100g || 0,
      carbs: existingNutrition?.carbsPer100g || 0,
    },
    perServing: {
      calories: existingNutrition?.caloriesPerServing || 0,
      protein: existingNutrition?.proteinPerServing || 0,
      fat: existingNutrition?.fatPerServing || 0,
      carbs: existingNutrition?.carbsPerServing || 0,
    },
    totalWeight: existingNutrition?.totalWeight || 0,
  };

  // Button variant (for edit page)
  if (variant === 'button') {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Nutrition Information
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Calculate calories and macros (requires ingredient weights in g/kg/ml/l)
            </p>
          </div>
          <div className="flex gap-2">
            {hasNutrition && !isEditing && (
              <button
                onClick={handleStartEdit}
                type="button"
                className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                <Edit size={16} />
                Edit
              </button>
            )}
            <button
              onClick={handleCalculate}
              disabled={calculateMutation.isPending || isEditing}
              type="button"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed"
            >
              {calculateMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator size={16} />
                  {hasNutrition ? 'Recalculate' : 'Calculate'} Nutrition
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {error}
                </p>
                {error.includes('Missing weights') && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Add weights to all ingredients (e.g., "400g spaghetti", "2kg chicken") then try again.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {calculateMutation.isSuccess && !error && (
          <div className="mb-4 p-4 bg-accent/5 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-accent dark:text-green-200">
                Nutrition calculated successfully!
              </p>
            </div>
          </div>
        )}

        {/* Display nutrition if available */}
        {hasNutrition && (
          <>
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Per 100g - Edit */}
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <h4 className="font-semibold mb-3 text-foreground">Per 100g</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Calories (kcal)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedValues.caloriesPer100g}
                          onChange={(e) => setEditedValues({...editedValues, caloriesPer100g: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg bg-background dark:bg-background text-foreground border-border dark:border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Protein (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedValues.proteinPer100g}
                          onChange={(e) => setEditedValues({...editedValues, proteinPer100g: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg bg-background dark:bg-background text-foreground border-border dark:border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Fat (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedValues.fatPer100g}
                          onChange={(e) => setEditedValues({...editedValues, fatPer100g: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg bg-background dark:bg-background text-foreground border-border dark:border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Carbs (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedValues.carbsPer100g}
                          onChange={(e) => setEditedValues({...editedValues, carbsPer100g: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg bg-background dark:bg-background text-foreground border-border dark:border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Per Serving - Edit */}
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex justify-between items-baseline mb-3">
                      <h4 className="font-semibold text-foreground">Per Serving</h4>
                      {displayNutrition.totalWeight > 0 && displayNutrition.servings > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ~{Math.round(displayNutrition.totalWeight / displayNutrition.servings)}g per serving
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Calories (kcal)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedValues.caloriesPerServing}
                          onChange={(e) => setEditedValues({...editedValues, caloriesPerServing: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg bg-background dark:bg-background text-foreground border-border dark:border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Protein (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedValues.proteinPerServing}
                          onChange={(e) => setEditedValues({...editedValues, proteinPerServing: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg bg-background dark:bg-background text-foreground border-border dark:border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Fat (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedValues.fatPerServing}
                          onChange={(e) => setEditedValues({...editedValues, fatPerServing: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg bg-background dark:bg-background text-foreground border-border dark:border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Carbs (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedValues.carbsPerServing}
                          onChange={(e) => setEditedValues({...editedValues, carbsPerServing: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg bg-background dark:bg-background text-foreground border-border dark:border-border"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save/Cancel buttons */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 border border-border dark:border-border rounded-lg hover:bg-secondary text-muted-foreground"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saveMutation.isPending}
                    type="button"
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="grid md:grid-cols-2 gap-4">
                {/* Per 100g */}
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <h4 className="font-semibold mb-3 text-foreground">Per 100g</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calories</span>
                      <span className="font-medium text-foreground">{displayNutrition.per100g.calories} kcal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protein</span>
                      <span className="font-medium text-foreground">{displayNutrition.per100g.protein}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fat</span>
                      <span className="font-medium text-foreground">{displayNutrition.per100g.fat}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carbs</span>
                      <span className="font-medium text-foreground">{displayNutrition.per100g.carbs}g</span>
                    </div>
                  </div>
                </div>

                {/* Per Serving */}
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="font-semibold text-foreground">Per Serving</h4>
                    {displayNutrition.totalWeight > 0 && displayNutrition.servings > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ~{Math.round(displayNutrition.totalWeight / displayNutrition.servings)}g per serving
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calories</span>
                      <span className="font-medium text-foreground">{displayNutrition.perServing.calories} kcal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protein</span>
                      <span className="font-medium text-foreground">{displayNutrition.perServing.protein}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fat</span>
                      <span className="font-medium text-foreground">{displayNutrition.perServing.fat}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carbs</span>
                      <span className="font-medium text-foreground">{displayNutrition.perServing.carbs}g</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Ingredient breakdown toggle */}
        {ingredientBreakdown.length > 0 && (
          <div className="mt-4">
            {/* Warning if AI estimates present */}
            {ingredientBreakdown.some(ing => ing.source === 'ai') && (
              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {ingredientBreakdown.filter(ing => ing.source === 'ai').length} ingredient(s) estimated by AI
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                      AI estimates may be less accurate. Consider verifying with nutrition labels or USDA database.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-sm text-primary hover:underline"
            >
              {showBreakdown ? 'Hide' : 'Show'} ingredient breakdown
            </button>

            {showBreakdown && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-3 text-sm text-foreground">
                  Ingredient Breakdown
                </h4>
                <div className="space-y-2 text-xs">
                  {ingredientBreakdown.map((ing, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {ing.name} ({ing.weight}g)
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                          ing.source === 'usda' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : ing.source === 'ai'
                            ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                            : 'bg-gray-100 dark:bg-background text-muted-foreground'
                        }`}>
                          {ing.source === 'usda' ? '✓ USDA' : ing.source === 'ai' ? '⚠ AI Estimate' : 'Unknown'}
                        </span>
                      </span>
                      <span className={`${
                        ing.source === 'ai' 
                          ? 'text-amber-600 dark:text-amber-400 font-medium' 
                          : 'text-muted-foreground'
                      }`}>
                        {ing.calories} kcal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Card variant (for detail page - read-only)
  if (!hasNutrition) return null;

  return (
    <div className="bg-background dark:bg-background p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">
          Nutrition Facts
        </h2>
        {existingNutrition?.calculatedAt && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Calculated {new Date(existingNutrition.calculatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Per 100g */}
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-3 text-foreground">Per 100g</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calories</span>
              <span className="font-medium text-foreground">{displayNutrition.per100g.calories} kcal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Protein</span>
              <span className="font-medium text-foreground">{displayNutrition.per100g.protein}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fat</span>
              <span className="font-medium text-foreground">{displayNutrition.per100g.fat}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carbs</span>
              <span className="font-medium text-foreground">{displayNutrition.per100g.carbs}g</span>
            </div>
          </div>
        </div>

        {/* Per Serving */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-baseline mb-3">
            <h3 className="font-semibold text-foreground">Per Serving</h3>
            {displayNutrition.totalWeight > 0 && displayNutrition.servings > 0 && (
              <span className="text-xs text-muted-foreground">
                ~{Math.round(displayNutrition.totalWeight / displayNutrition.servings)}g per serving
              </span>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calories</span>
              <span className="font-medium text-foreground">{displayNutrition.perServing.calories} kcal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Protein</span>
              <span className="font-medium text-foreground">{displayNutrition.perServing.protein}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fat</span>
              <span className="font-medium text-foreground">{displayNutrition.perServing.fat}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carbs</span>
              <span className="font-medium text-foreground">{displayNutrition.perServing.carbs}g</span>
            </div>
          </div>
        </div>
      </div>

      {displayNutrition.totalWeight > 0 && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Total recipe weight: {displayNutrition.totalWeight}g
        </div>
      )}
    </div>
  );
}