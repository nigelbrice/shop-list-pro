// client/src/types/recipe.ts

export const RECIPE_CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Snacks',
  'Drinks',
  'Sides',
  'Uncategorized',
] as const;

export type RecipeCategory = typeof RECIPE_CATEGORIES[number];

export interface CookingMethod {
  method: string;
  temperature?: string;
  time?: string;
  instructions: string;
  notes?: string;
}

export interface Ingredient {
  item: string;
  amount: string;
  unit: string;
  notes?: string;
}

export interface Instruction {
  step: number;
  text: string;
}

export interface Recipe {
  id: number;
  title: string;
  category?: RecipeCategory;
  imageUrl?: string;
  rating?: number;
  tags: string[];
  prepTime?: string;
  servings?: string;
  notes?: string;
  ingredients: Ingredient[];
  baseInstructions: Instruction[];
  cookingMethods?: CookingMethod[];
  updatedAt?: string;
}
