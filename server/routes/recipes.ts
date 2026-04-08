// server/routes/recipes.ts
import { Router } from 'express';
import { db } from '../db';
import { recipes, accountUsers } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Helper to convert bigints to numbers for JSON serialization
function serializeRecipe(recipe: any) {
  return {
    ...recipe,
    id: Number(recipe.id),
    accountId: Number(recipe.accountId),
    createdByUserId: Number(recipe.createdByUserId),
  };
}

// GET /api/recipes - Get all recipes for user's account
router.get('/', async (req, res) => {
  try {
    const accountId = Number(req.session?.accountId);
    if (!accountId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const allRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.accountId, accountId))
      .orderBy(desc(recipes.updatedAt));

    res.json(allRecipes.map(serializeRecipe));
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// GET /api/recipes/:id - Get single recipe
router.get('/:id', async (req, res) => {
  try {
    const accountId = Number(req.session?.accountId);
    const recipeId = parseInt(req.params.id);

    if (!accountId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (Number(recipe.accountId) !== accountId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(serializeRecipe(recipe));
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// POST /api/recipes - Create new recipe
router.post('/', async (req, res) => {
  try {
    const accountId = Number(req.session?.accountId);
    const activeUserId = req.session?.activeUserId ? Number(req.session.activeUserId) : null;

    if (!accountId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      category,
      sourceUrl,
      imageUrl,
      ingredients,
      baseInstructions,
      cookingMethods,
      prepTime,
      servings,
      tags,
      notes,
      rating,
    } = req.body;

    if (!title || !ingredients || !baseInstructions) {
      return res.status(400).json({ error: 'Title, ingredients, and instructions are required' });
    }

    const [newRecipe] = await db
      .insert(recipes)
      .values({
        accountId: accountId,
        createdByUserId: activeUserId || accountId,
        title,
        category: category || 'Uncategorized',
        sourceUrl: sourceUrl || null,
        imageUrl: imageUrl || null,
        ingredients: ingredients || [],
        baseInstructions: baseInstructions || [],
        cookingMethods: cookingMethods || [],
        prepTime: prepTime || null,
        servings: servings || null,
        tags: tags || [],
        notes: notes || null,
        rating: rating || null,
      })
      .returning();

    res.status(201).json(serializeRecipe(newRecipe));
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// PATCH /api/recipes/:id - Update recipe
router.patch('/:id', async (req, res) => {
  try {
    const accountId = Number(req.session?.accountId);
    const recipeId = parseInt(req.params.id);

    if (!accountId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existing = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (Number(existing.accountId) !== accountId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update only provided fields
    const updateData: any = {};
    const allowedFields = [
      'title', 'category', 'sourceUrl', 'imageUrl', 'ingredients', 'baseInstructions',
      'cookingMethods', 'prepTime', 'servings', 'tags', 'notes', 'rating'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const [updated] = await db
      .update(recipes)
      .set(updateData)
      .where(eq(recipes.id, recipeId))
      .returning();

    res.json(serializeRecipe(updated));
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// DELETE /api/recipes/:id - Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    const accountId = Number(req.session?.accountId);
    const recipeId = parseInt(req.params.id);

    if (!accountId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existing = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (Number(existing.accountId) !== accountId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.delete(recipes).where(eq(recipes.id, recipeId));

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

export default router;