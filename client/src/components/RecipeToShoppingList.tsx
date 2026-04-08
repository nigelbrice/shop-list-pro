// client/src/components/RecipeToShoppingList.tsx
import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Check, X, Plus } from 'lucide-react';
import { useItems } from '@/context/items-context';
import { useStoreContext } from '@/context/store-context';
import type { Recipe } from '../types/recipe';

interface Props {
  recipe: Recipe;
}

interface MatchedIngredient {
  recipeIngredient: {
    item: string;
    amount: string;
    unit: string;
  };
  matchedItem?: {
    id: number;
    name: string;
    category?: string;
    imageUrl?: string;
  };
  quantity: number;
}

export function RecipeToShoppingList({ recipe }: Props) {
  const { items, addItem } = useItems();
  const { stores, addItemToStore } = useStoreContext();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(
    stores.length > 0 ? stores[0].id : null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [createdItemNames, setCreatedItemNames] = useState<string[]>([]);

  // Watch for newly created items and add them to store automatically
  useEffect(() => {
    if (createdItemNames.length === 0 || !selectedStoreId || !isAdding) return;

    // Find all created items that now exist in items array
    const foundItems = createdItemNames
      .map(name => {
        const item = items.find(i => 
          i.name.toLowerCase() === name.toLowerCase()
        );
        if (item) {
          console.log('✓ Found and adding:', item.name, 'ID:', item.id);
        }
        return item;
      })
      .filter(Boolean);

    // Add any newly found items to store
    if (foundItems.length > 0) {
      foundItems.forEach(item => {
        addItemToStore(selectedStoreId, item);
      });
      
      // Remove these from the waiting list
      setCreatedItemNames(prev => 
        prev.filter(name => 
          !foundItems.some(item => item.name.toLowerCase() === name.toLowerCase())
        )
      );
    }
  }, [items, createdItemNames, selectedStoreId, isAdding, addItemToStore]);

  // Smart matching: try to find existing items that match recipe ingredients
  const matchedIngredients = useMemo((): MatchedIngredient[] => {
    return recipe.ingredients.map((ing) => {
      const searchTerm = ing.item.toLowerCase().trim();
      
      // Try exact match first
      let match = items.find(item => 
        item.name.toLowerCase().trim() === searchTerm
      );
      
      // If no exact match, try partial match BUT be careful about false positives
      if (!match) {
        // Only match if:
        // 1. The item name contains the search term AND
        // 2. The search term is at least 4 characters (avoid matching "sugar" to "brown sugar")
        // 3. OR it's a word boundary match (whole word)
        
        const candidates = items.filter(item => {
          const itemName = item.name.toLowerCase().trim();
          
          // If search term is very short, require exact match
          if (searchTerm.length < 4) {
            return itemName === searchTerm;
          }
          
          // Check if it's a whole word match using word boundaries
          const wordBoundaryRegex = new RegExp(`\\b${searchTerm}\\b`, 'i');
          if (wordBoundaryRegex.test(itemName)) {
            return true;
          }
          
          // For longer search terms, allow substring match
          // but only if search term is at least 60% of the item name length
          if (searchTerm.length >= itemName.length * 0.6) {
            return itemName.includes(searchTerm);
          }
          
          return false;
        });
        
        // If we found candidates, pick the closest match (shortest name)
        if (candidates.length > 0) {
          match = candidates.reduce((closest, current) => 
            current.name.length < closest.name.length ? current : closest
          );
        }
      }

      return {
        recipeIngredient: ing,
        matchedItem: match,
        quantity: parseQuantity(ing.amount),
      };
    });
  }, [recipe.ingredients, items]);

  // Parse quantity from amount string (e.g., "2", "1.5", "1/2" -> number)
  function parseQuantity(amount: string): number {
    // Handle fractions like "1/2"
    if (amount.includes('/')) {
      const [num, denom] = amount.split('/').map(Number);
      return Math.ceil(num / denom);
    }
    
    // Handle regular numbers
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 1 : Math.ceil(parsed);
  }

  const handleAddToList = async () => {
    if (!selectedStoreId) return;

    setIsAdding(true);
    const itemsToCreate: string[] = [];

    try {
      // Add all matched items immediately
      for (const matched of matchedIngredients) {
        if (matched.matchedItem) {
          console.log('Adding matched item:', matched.matchedItem.name);
          addItemToStore(selectedStoreId, matched.matchedItem);
        } else {
          // Track items we need to create
          itemsToCreate.push(matched.recipeIngredient.item);
        }
      }

      // Create all new items
      if (itemsToCreate.length > 0) {
        console.log('Creating items:', itemsToCreate);
        
        for (const itemName of itemsToCreate) {
          addItem(itemName, 'other');
        }
        
        // Set the list of items we're waiting for
        // The useEffect will add them when they appear
        setCreatedItemNames(itemsToCreate);
        
        // Wait a bit for useEffect to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if any are still pending
        if (createdItemNames.length > 0) {
          console.warn(`⚠ ${createdItemNames.length} items still pending, will add when they sync`);
        }
      }

      setShowDialog(false);
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      alert('Failed to add ingredients to shopping list');
    } finally {
      setIsAdding(false);
      setCreatedItemNames([]); // Clear pending list
    }
  };

  const matchCount = matchedIngredients.filter(m => m.matchedItem).length;
  const totalCount = matchedIngredients.length;

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        title="Send to shopping list"
      >
        <ShoppingCart size={20} />
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Add to Shopping List
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {matchCount} of {totalCount} ingredients matched
                  </p>
                </div>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Store selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Add to store:
                </label>
                <select
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ingredients list */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {matchedIngredients.map((matched, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      matched.matchedItem
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status icon */}
                      <div className="flex-shrink-0 mt-1">
                        {matched.matchedItem ? (
                          <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-yellow-600 flex items-center justify-center">
                            <Plus size={16} className="text-white" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {matched.recipeIngredient.amount} {matched.recipeIngredient.unit} {matched.recipeIngredient.item}
                        </div>
                        
                        {matched.matchedItem ? (
                          <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                            ✓ Matched to: {matched.matchedItem.name}
                            {matched.matchedItem.category && (
                              <span className="ml-2 text-xs bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded">
                                {matched.matchedItem.category}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                            Will create new item
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowDialog(false)}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToList}
                disabled={isAdding || !selectedStoreId}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAdding ? (
                  <>Adding...</>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Add {totalCount} Items
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}