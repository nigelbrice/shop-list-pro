import { Router } from 'express';
import { db } from '../db';
import { recipes } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { calculateRecipeNutrition } from '../services/nutritionService';

const router = Router();

/**
 * POST /api/recipes/:id/calculate-nutrition
 * Calculate and save nutrition data for a recipe
 */
router.post('/:id/calculate-nutrition', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    
    // Fetch the recipe
    const recipe = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, BigInt(recipeId)))
      .limit(1);
    
    if (!recipe || recipe.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipeData = recipe[0];
    
    // Parse servings (handle "4", "4 servings", etc.)
    const servingsMatch = recipeData.servings?.match(/(\d+)/);
    const servings = servingsMatch ? parseInt(servingsMatch[1]) : 1;
    
    // Check if ingredients have weights
    const ingredients = recipeData.ingredients as Array<{ item: string; amount: string; unit: string }>;
    
    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ 
        error: 'Recipe has no ingredients',
        message: 'Add ingredients before calculating nutrition'
      });
    }
    
    // Check for missing weights
    const missingWeights = ingredients.filter(ing => {
      const combined = `${ing.amount}${ing.unit}`;
      const hasWeight = /\d+\.?\d*\s*(g|kg|ml|l|grams?|kilograms?|milliliters?|litres?|liters?)\b/i.test(combined);
      
      // Debug logging
      if (!hasWeight) {
        console.log(`Failed validation for ingredient:`, {
          item: ing.item,
          amount: ing.amount,
          unit: ing.unit,
          combined,
          tested: combined
        });
      }
      
      return !hasWeight;
    });
    
    if (missingWeights.length > 0) {
      return res.status(400).json({
        error: 'Missing weights for some ingredients',
        message: 'Please add weights (in grams/kg/ml/l) for all ingredients',
        missingWeights: missingWeights.map(ing => ing.item)
      });
    }
    
    console.log(`Calculating nutrition for recipe ${recipeId} with ${ingredients.length} ingredients...`);
    
    // Calculate nutrition
    const nutritionData = await calculateRecipeNutrition(ingredients, servings);
    
    // Calculate serving size in grams
    const servingSize = nutritionData.totalWeight / servings;
    
    console.log('Nutrition calculation complete:', {
      totalWeight: nutritionData.totalWeight,
      servings,
      servingSize,
      perServing: nutritionData.perServing,
      sources: nutritionData.ingredientBreakdown.map(i => ({ name: i.name, source: i.source }))
    });
    
    // Update recipe with nutrition data
    await db
      .update(recipes)
      .set({
        caloriesPer100g: nutritionData.per100g.calories,
        proteinPer100g: nutritionData.per100g.protein,
        fatPer100g: nutritionData.per100g.fat,
        carbsPer100g: nutritionData.per100g.carbs,
        
        caloriesPerServing: nutritionData.perServing.calories,
        proteinPerServing: nutritionData.perServing.protein,
        fatPerServing: nutritionData.perServing.fat,
        carbsPerServing: nutritionData.perServing.carbs,
        
        totalWeight: nutritionData.totalWeight,
        servingSize: servingSize,
        calculatedAt: new Date(),
        nutritionBreakdown: nutritionData.ingredientBreakdown as any, // Save the breakdown
      })
      .where(eq(recipes.id, BigInt(recipeId)));
    
    res.json({
      success: true,
      nutrition: {
        per100g: nutritionData.per100g,
        perServing: nutritionData.perServing,
        totalWeight: nutritionData.totalWeight,
        servingSize: servingSize,
        servings,
      },
      ingredientBreakdown: nutritionData.ingredientBreakdown,
    });
    
  } catch (error) {
    console.error('Error calculating nutrition:', error);
    res.status(500).json({ 
      error: 'Failed to calculate nutrition',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;