// client/src/pages/EditRecipe.tsx
import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, Upload, X } from 'lucide-react';
import TagInput from '@/components/TagInput';
import { RECIPE_CATEGORIES, type RecipeCategory } from '../types/recipe';

interface CookingMethod {
  method: string;
  temperature?: string;
  time?: string;
  instructions: string;
  notes?: string;
}

interface Recipe {
  id: number;
  title: string;
  category?: RecipeCategory;
  prepTime?: string;
  servings?: string;
  tags: string[];
  ingredients: Array<{ item: string; amount: string; unit: string; notes?: string }>;
  baseInstructions: Array<{ step: number; text: string }>;
  cookingMethods?: CookingMethod[];
  notes?: string;
  rating?: number;
  imageUrl?: string;
}

const COOKING_METHOD_OPTIONS = [
  'Oven',
  'Slow Cooker',
  'Smoker',
  'Griddle',
  'Air Fryer',
  'Instant Pot',
  'Stovetop',
  'Grill',
  'Microwave',
];

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

export default function EditRecipe() {
  const [, params] = useRoute('/recipes/:id/edit');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const recipeId = params?.id;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecipeCategory>('Uncategorized');
  const [prepTime, setPrepTime] = useState('');
  const [servings, setServings] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  
  const [ingredients, setIngredients] = useState([
    { item: '', amount: '', unit: '' }
  ]);
  
  const [instructions, setInstructions] = useState([
    { text: '' }
  ]);

  const [cookingMethods, setCookingMethods] = useState<CookingMethod[]>([]);

  // Fetch the recipe
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

  // Populate form when recipe loads
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || '');
      setCategory(recipe.category || 'Uncategorized');
      setPrepTime(recipe.prepTime || '');
      setServings(recipe.servings || '');
      setTags(recipe.tags || []);
      setNotes(recipe.notes || '');
      setRating(recipe.rating);
      setImageUrl(recipe.imageUrl || '');
      
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        setIngredients(recipe.ingredients.map(ing => ({
          item: ing.item || '',
          amount: ing.amount || '',
          unit: ing.unit || '',
        })));
      }
      
      if (recipe.baseInstructions && recipe.baseInstructions.length > 0) {
        setInstructions(recipe.baseInstructions.map(inst => ({
          text: inst.text || ''
        })));
      }

      if (recipe.cookingMethods && recipe.cookingMethods.length > 0) {
        setCookingMethods(recipe.cookingMethods);
      }
    }
  }, [recipe]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update recipe');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      setLocation(`/recipes/${recipeId}`);
    },
  });

  const addIngredient = () => {
    setIngredients([...ingredients, { item: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, { text: '' }]);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = { text: value };
    setInstructions(updated);
  };

  // Cooking Methods
  const addCookingMethod = () => {
    setCookingMethods([...cookingMethods, {
      method: '',
      temperature: '',
      time: '',
      instructions: '',
      notes: '',
    }]);
  };
 
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be less than 5MB');
    return;
  }

  const reader = new FileReader();
  reader.onloadend = () => {
    setImageUrl(reader.result as string);
  };
  reader.readAsDataURL(file);
};

const removeImage = () => {
  setImageUrl('');
};

  const removeCookingMethod = (index: number) => {
    setCookingMethods(cookingMethods.filter((_, i) => i !== index));
  };

  const updateCookingMethod = (index: number, field: keyof CookingMethod, value: string) => {
    const updated = [...cookingMethods];
    updated[index] = { ...updated[index], [field]: value };
    setCookingMethods(updated);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('Please enter a recipe title');
      return;
    }

    updateMutation.mutate({
      title,
      category,
      ingredients: ingredients.filter(i => i.item.trim()),
      baseInstructions: instructions.filter(i => i.text.trim()).map((inst, idx) => ({
        step: idx + 1,
        text: inst.text
      })),
      cookingMethods: cookingMethods.filter(m => m.method && m.instructions),
      prepTime: prepTime || null,
      servings: servings || null,
      tags: tags,
      notes: notes || null,
      rating: rating || null,
      imageUrl: imageUrl || null,
    });
  };

  const inputClass = "w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600";

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => setLocation(`/recipes/${recipeId}`)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          Back to recipe
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Recipe</h1>
      </div>

      <div className="space-y-6 p-6 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Recipe Image</label>
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Recipe preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                onClick={removeImage}
                type="button"
                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <Upload className="mb-2 text-gray-400" size={32} />
              <span className="text-sm text-gray-500 dark:text-gray-400">Click to upload image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Recipe Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Grandma's Chocolate Chip Cookies"
            className={inputClass}
          />
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RecipeCategory)}
            className={inputClass}
          >
            {RECIPE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {getCategoryEmoji(cat)} {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Prep Time</label>
            <input
              type="text"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              placeholder="e.g., 15 minutes"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Servings</label>
            <input
              type="text"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              placeholder="e.g., 4-6 people"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Rating (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={rating || ''}
            onChange={(e) => setRating(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Optional rating"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">Ingredients</label>
            <button
              onClick={addIngredient}
              type="button"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              <Plus size={16} /> Add Ingredient
            </button>
          </div>
          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
                  placeholder="Amount"
                  className="w-24 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="w-24 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={ing.item}
                  onChange={(e) => updateIngredient(idx, 'item', e.target.value)}
                  placeholder="Ingredient"
                  className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
                {ingredients.length > 1 && (
                  <button
                    onClick={() => removeIngredient(idx)}
                    type="button"
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              Base Instructions
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(General method - use cooking variants below for specific methods)</span>
            </label>
            <button
              onClick={addInstruction}
              type="button"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              <Plus size={16} /> Add Step
            </button>
          </div>
          <div className="space-y-2">
            {instructions.map((inst, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-sm font-semibold pt-2 w-8 text-gray-900 dark:text-white">{idx + 1}.</span>
                <textarea
                  value={inst.text}
                  onChange={(e) => updateInstruction(idx, e.target.value)}
                  placeholder="Step instructions..."
                  rows={2}
                  className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
                {instructions.length > 1 && (
                  <button
                    onClick={() => removeInstruction(idx)}
                    type="button"
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COOKING METHODS */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                Cooking Method Variants
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Add different cooking methods (e.g., Oven, Slow Cooker, Smoker) with specific temps & times
              </p>
            </div>
            <button
              onClick={addCookingMethod}
              type="button"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              <Plus size={16} /> Add Method
            </button>
          </div>

          <div className="space-y-4">
            {cookingMethods.map((method, idx) => (
              <div key={idx} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Method {idx + 1}</h4>
                  <button
                    onClick={() => removeCookingMethod(idx)}
                    type="button"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Cooking Method *
                    </label>
                    <select
                      value={method.method}
                      onChange={(e) => updateCookingMethod(idx, 'method', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    >
                      <option value="">Select method...</option>
                      {COOKING_METHOD_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Temperature
                      </label>
                      <input
                        type="text"
                        value={method.temperature || ''}
                        onChange={(e) => updateCookingMethod(idx, 'temperature', e.target.value)}
                        placeholder="e.g., 375°F or Low"
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Cook Time
                      </label>
                      <input
                        type="text"
                        value={method.time || ''}
                        onChange={(e) => updateCookingMethod(idx, 'time', e.target.value)}
                        placeholder="e.g., 25-30 minutes"
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Instructions *
                    </label>
                    <textarea
                      value={method.instructions}
                      onChange={(e) => updateCookingMethod(idx, 'instructions', e.target.value)}
                      placeholder="Specific instructions for this cooking method..."
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={method.notes || ''}
                      onChange={(e) => updateCookingMethod(idx, 'notes', e.target.value)}
                      placeholder="Optional tips or notes..."
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                </div>
              </div>
            ))}

            {cookingMethods.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No cooking method variants yet. Click "Add Method" to add one.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes, tips, or variations..."
            rows={3}
            className={inputClass}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            type="button"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => setLocation(`/recipes/${recipeId}`)}
            type="button"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}