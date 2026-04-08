// client/src/pages/AddRecipe.tsx
// Full version with AI extraction + manual entry + image upload

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Plus, Trash2, Sparkles, Loader2, Upload, X } from 'lucide-react';
import TagInput from '@/components/TagInput';
import { RECIPE_CATEGORIES, type RecipeCategory } from '../types/recipe';

interface ExtractedRecipe {
  title: string;
  ingredients: Array<{ item: string; amount: string; unit: string; notes?: string }>;
  baseInstructions: Array<{ step: number; text: string }>;
  prepTime?: string;
  servings?: string;
  tags?: string[];
}

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

export default function AddRecipe() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [isSaving, setIsSaving] = useState(false);

  // AI extraction state
  const [inputText, setInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);

  // Manual entry state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecipeCategory>('Uncategorized');
  const [prepTime, setPrepTime] = useState('');
  const [servings, setServings] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  
  const [ingredients, setIngredients] = useState([
    { item: '', amount: '', unit: '' }
  ]);
  
  const [instructions, setInstructions] = useState([
    { text: '' }
  ]);

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

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
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

  // AI extraction
  const handleAiExtract = async () => {
    if (!inputText.trim()) return;

    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error('Extraction failed');
      }

      const parsed = await response.json();
      setExtractedRecipe(parsed);
    } catch (error) {
      console.error('Extraction error:', error);
      alert('Failed to extract recipe. Try manual entry or check the input.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Save from AI extraction
  const handleSaveExtracted = async () => {
    if (!extractedRecipe) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: extractedRecipe.title,
          category,
          ingredients: extractedRecipe.ingredients,
          baseInstructions: extractedRecipe.baseInstructions,
          prepTime: extractedRecipe.prepTime,
          servings: extractedRecipe.servings,
          tags: [...(extractedRecipe.tags || []), ...tags],
          imageUrl: imageUrl || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setLocation('/recipes');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  // Save from manual entry
  const handleSaveManual = async () => {
    if (!title.trim()) {
      alert('Please enter a recipe title');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          category,
          ingredients: ingredients.filter(i => i.item.trim()),
          baseInstructions: instructions.filter(i => i.text.trim()).map((inst, idx) => ({
            step: idx + 1,
            text: inst.text
          })),
          prepTime: prepTime || null,
          servings: servings || null,
          tags: tags,
          imageUrl: imageUrl || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setLocation('/recipes');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Add New Recipe</h1>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('ai')}
          type="button"
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            mode === 'ai'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          <Sparkles size={18} />
          AI Extract
        </button>
        <button
          onClick={() => setMode('manual')}
          type="button"
          className={`px-4 py-2 rounded-lg ${
            mode === 'manual'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          Manual Entry
        </button>
      </div>

      {/* Image Upload (shared between both modes) */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Recipe Image (Optional)</label>
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
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
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

      {/* Category selector (shared between both modes) */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Category</label>
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

      {mode === 'ai' ? (
        // AI EXTRACTION MODE
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste Recipe Text
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste a recipe from anywhere - website, screenshot text, email, etc."
              rows={12}
              className={inputClass}
            />
          </div>

          <button
            onClick={handleAiExtract}
            disabled={isExtracting || !inputText.trim()}
            type="button"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExtracting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Extract Recipe
              </>
            )}
          </button>

          {/* Preview extracted recipe */}
          {extractedRecipe && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
              <h2 className="text-xl font-bold mb-4">{extractedRecipe.title}</h2>
              
              <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                {extractedRecipe.prepTime && <span>⏱️ {extractedRecipe.prepTime}</span>}
                {extractedRecipe.servings && <span>👥 {extractedRecipe.servings}</span>}
              </div>

              {extractedRecipe.tags && extractedRecipe.tags.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {extractedRecipe.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h3 className="font-semibold mb-2">Ingredients</h3>
              <ul className="mb-4 space-y-1">
                {extractedRecipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm">
                    {ing.amount} {ing.unit} {ing.item}
                    {ing.notes && <span className="text-gray-600 dark:text-gray-400"> ({ing.notes})</span>}
                  </li>
                ))}
              </ul>

              <h3 className="font-semibold mb-2">Instructions</h3>
              <ol className="space-y-2">
                {extractedRecipe.baseInstructions.map((inst) => (
                  <li key={inst.step} className="text-sm">
                    <span className="font-semibold">{inst.step}.</span> {inst.text}
                  </li>
                ))}
              </ol>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={handleSaveExtracted}
                  disabled={isSaving}
                  type="button"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isSaving ? 'Saving...' : 'Save Recipe'}
                </button>
                <button
                  onClick={() => setExtractedRecipe(null)}
                  type="button"
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // MANUAL ENTRY MODE
        <div className="space-y-6 p-6 rounded-lg border">
          <div>
            <label className="block text-sm font-medium mb-2">Recipe Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Grandma's Chocolate Chip Cookies"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prep Time</label>
              <input
                type="text"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="e.g., 15 minutes"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Servings</label>
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
                 <label className="block text-sm font-medium mb-2">Tags</label>
                 <TagInput tags={tags} onChange={setTags} />
            </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Ingredients</label>
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
                    className="w-24 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="w-24 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="text"
                    value={ing.item}
                    onChange={(e) => updateIngredient(idx, 'item', e.target.value)}
                    placeholder="Ingredient"
                    className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              <label className="block text-sm font-medium">Instructions</label>
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
                  <span className="text-sm font-semibold pt-2 w-8">{idx + 1}.</span>
                  <textarea
                    value={inst.text}
                    onChange={(e) => updateInstruction(idx, e.target.value)}
                    placeholder="Step instructions..."
                    rows={2}
                    className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSaveManual}
              disabled={isSaving}
              type="button"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Recipe'}
            </button>
            <button
              onClick={() => setLocation('/recipes')}
              type="button"
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}