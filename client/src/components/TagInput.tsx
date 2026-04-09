// client/src/components/TagInput.tsx
import { useState } from 'react';
import { X, Plus } from 'lucide-react';

const SUGGESTED_TAGS = [
  // Meal type
  'breakfast', 'lunch', 'dinner', 'snack', 'appetizer', 'dessert',
  // Cuisine
  'italian', 'mexican', 'chinese', 'indian', 'thai', 'japanese', 'french', 'american',
  // Diet
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'low-carb',
  // Cooking method
  'baking', 'grilling', 'frying', 'slow-cooker', 'instant-pot', 'air-fryer',
  // Dish type
  'soup', 'salad', 'pasta', 'pizza', 'sandwich', 'burger', 'tacos', 'curry', 'stir-fry',
  'casserole', 'rice', 'noodles', 'seafood', 'chicken', 'beef', 'pork',
  // Occasion
  'holiday', 'party', 'weeknight', 'quick', 'comfort-food', 'healthy', 'kid-friendly',
  // Sweet treats
  'cookies', 'cake', 'pie', 'brownies', 'candy', 'chocolate', 'ice-cream',
].sort();

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ tags, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = inputValue
    ? SUGGESTED_TAGS.filter(
        tag => 
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(tag)
      )
    : SUGGESTED_TAGS.filter(tag => !tags.includes(tag));

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onChange([...tags, normalizedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag if input is empty
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-primary/70"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input with autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow clicking suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder="Type to search or add custom tag..."
          className="w-full px-4 py-2 border rounded-lg bg-background text-foreground border-border"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
            <div className="p-2 space-y-1">
              {filteredSuggestions.slice(0, 20).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-secondary text-sm text-foreground"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick add popular tags */}
      {!inputValue && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground py-1">Quick add:</span>
          {['breakfast', 'lunch', 'dinner', 'dessert', 'vegetarian', 'quick'].map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <Plus size={12} />
              {tag}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Press Enter to add custom tags, or click suggestions above
      </p>
    </div>
  );
}