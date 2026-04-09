import Anthropic from "@anthropic-ai/sdk";

// USDA FoodData Central API configuration
const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

// Anthropic API for fallback estimation
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface IngredientNutrition {
  name: string;
  calories: number;
  protein: number; // grams
  fat: number; // grams
  carbs: number; // grams
  weight: number; // grams
  source: 'usda' | 'ai' | 'unknown';
}

interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  totalWeight: number;
}

/**
 * Parse weight from ingredient string
 * Examples: "400g spaghetti" -> 400, "2kg chicken" -> 2000, "500ml milk" -> 500
 * Also handles: "400 grams spaghetti", "2 kilograms chicken", etc.
 */
function parseWeight(ingredientText: string): number | null {
  // Match patterns like: 400g, 2kg, 500ml, 1.5kg, 400 grams, 2 kilograms, etc.
  const weightMatch = ingredientText.match(/(\d+\.?\d*)\s*(g|kg|ml|l|grams?|kilograms?|milliliters?|litres?|liters?)\b/i);
  
  if (!weightMatch) return null;
  
  const amount = parseFloat(weightMatch[1]);
  const unit = weightMatch[2].toLowerCase();
  
  // Convert to grams
  switch (unit) {
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return amount * 1000;
    case 'l':
    case 'litre':
    case 'litres':
    case 'liter':
    case 'liters':
      return amount * 1000; // Approximate ml to grams (works for water-based liquids)
    case 'g':
    case 'gram':
    case 'grams':
    case 'ml':
    case 'milliliter':
    case 'milliliters':
      return amount;
    default:
      return null;
  }
}

/**
 * Extract ingredient name from full ingredient text
 * "400g spaghetti" -> "spaghetti"
 * "400 grams spaghetti" -> "spaghetti"
 */
function extractIngredientName(ingredientText: string): string {
  // Remove weight and unit (including full unit names) using word boundaries
  return ingredientText
    .replace(/^\d+\.?\d*\s*(g\b|kg\b|ml\b|l\b|grams?\b|kilograms?\b|milliliters?\b|litres?\b|liters?\b)\s*/i, '')
    .trim();
}

/**
 * Search USDA database for ingredient
 */
async function searchUSDA(ingredientName: string): Promise<IngredientNutrition | null> {
  try {
    const searchUrl = `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(ingredientName)}&api_key=${USDA_API_KEY}&pageSize=1`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      return null;
    }
    
    const food = data.foods[0];
    const nutrients = food.foodNutrients;
    
    // Extract nutrients (per 100g from USDA)
    const getNutrient = (nutrientId: number) => {
      const nutrient = nutrients.find((n: any) => n.nutrientId === nutrientId);
      return nutrient ? nutrient.value : 0;
    };
    
    return {
      name: ingredientName,
      calories: getNutrient(1008), // Energy (kcal)
      protein: getNutrient(1003),  // Protein
      fat: getNutrient(1004),      // Total lipid (fat)
      carbs: getNutrient(1005),    // Carbohydrate
      weight: 100, // USDA returns per 100g
      source: 'usda'
    };
  } catch (error) {
    console.error(`USDA search failed for "${ingredientName}":`, error);
    return null;
  }
}

/**
 * Use AI to estimate nutrition when USDA fails
 */
async function estimateWithAI(ingredientName: string, weight: number): Promise<IngredientNutrition | null> {
  try {
    const prompt = `Estimate the nutritional content for ${weight}g of "${ingredientName}".

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "calories": <number>,
  "protein": <number in grams>,
  "fat": <number in grams>,
  "carbs": <number in grams>
}

Be as accurate as possible based on typical nutritional values for this ingredient.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected AI response type');
    }

    // Parse AI response
    const aiResponse = JSON.parse(content.text.trim());
    
    return {
      name: ingredientName,
      calories: aiResponse.calories || 0,
      protein: aiResponse.protein || 0,
      fat: aiResponse.fat || 0,
      carbs: aiResponse.carbs || 0,
      weight: weight,
      source: 'ai'
    };
  } catch (error) {
    console.error(`AI estimation failed for "${ingredientName}":`, error);
    return null;
  }
}

/**
 * Calculate nutrition for a single ingredient
 */
async function calculateIngredientNutrition(ingredientText: string): Promise<IngredientNutrition | null> {
  const weight = parseWeight(ingredientText);
  const name = extractIngredientName(ingredientText);
  
  if (!weight) {
    console.warn(`No weight found in ingredient: "${ingredientText}"`);
    return {
      name: ingredientText,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      weight: 0,
      source: 'unknown'
    };
  }
  
  // Try USDA first
  const usdaResult = await searchUSDA(name);
  
  if (usdaResult) {
    // Scale USDA values (which are per 100g) to actual ingredient weight
    const scale = weight / 100;
    return {
      name,
      calories: Math.round(usdaResult.calories * scale),
      protein: Math.round(usdaResult.protein * scale * 10) / 10, // 1 decimal place
      fat: Math.round(usdaResult.fat * scale * 10) / 10,
      carbs: Math.round(usdaResult.carbs * scale * 10) / 10,
      weight,
      source: 'usda'
    };
  }
  
  // Fallback to AI estimation
  console.log(`USDA lookup failed for "${name}", using AI estimation`);
  return await estimateWithAI(name, weight);
}

/**
 * Calculate total nutrition for a recipe
 */
export async function calculateRecipeNutrition(
  ingredients: Array<{ item: string; amount: string; unit: string }>,
  servings: number
): Promise<{
  per100g: { calories: number; protein: number; fat: number; carbs: number };
  perServing: { calories: number; protein: number; fat: number; carbs: number };
  totalWeight: number;
  ingredientBreakdown: IngredientNutrition[];
}> {
  const ingredientResults: IngredientNutrition[] = [];
  
  // Calculate nutrition for each ingredient
  for (const ingredient of ingredients) {
    // Combine amount, unit, and item into a single string for parsing
    const ingredientText = `${ingredient.amount}${ingredient.unit} ${ingredient.item}`;
    const nutrition = await calculateIngredientNutrition(ingredientText);
    
    if (nutrition) {
      ingredientResults.push(nutrition);
    }
  }
  
  // Calculate totals
  const totals: NutritionTotals = ingredientResults.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      protein: acc.protein + ing.protein,
      fat: acc.fat + ing.fat,
      carbs: acc.carbs + ing.carbs,
      totalWeight: acc.totalWeight + ing.weight,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, totalWeight: 0 }
  );
  
  // Calculate per 100g (only if we have total weight)
  const per100g = totals.totalWeight > 0 ? {
    calories: Math.round((totals.calories / totals.totalWeight) * 100),
    protein: Math.round((totals.protein / totals.totalWeight) * 100 * 10) / 10,
    fat: Math.round((totals.fat / totals.totalWeight) * 100 * 10) / 10,
    carbs: Math.round((totals.carbs / totals.totalWeight) * 100 * 10) / 10,
  } : { calories: 0, protein: 0, fat: 0, carbs: 0 };
  
  // Calculate per serving
  const servingCount = servings || 1;
  const perServing = {
    calories: Math.round(totals.calories / servingCount),
    protein: Math.round((totals.protein / servingCount) * 10) / 10,
    fat: Math.round((totals.fat / servingCount) * 10) / 10,
    carbs: Math.round((totals.carbs / servingCount) * 10) / 10,
  };
  
  return {
    per100g,
    perServing,
    totalWeight: totals.totalWeight,
    ingredientBreakdown: ingredientResults,
  };
}