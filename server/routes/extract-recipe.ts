console.log('🔥 EXTRACT-RECIPE FILE LOADED 🔥');

// server/routes/extract-recipe.ts
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Helper: Fetch URL content via Jina AI Reader (free tier)
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    const response = await fetch(jinaUrl);
    if (!response.ok) throw new Error(`Jina fetch failed: ${response.statusText}`);
    return await response.text();
  } catch (error) {
    console.error('Jina fetch error:', error);
    throw new Error('Failed to fetch URL content');
  }
}

router.post('/extract-recipe', async (req, res) => {
  try {
    const { input, text } = req.body; // Accept both 'input' and 'text' for compatibility
    const userInput = input || text;

    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({ error: 'No input provided' });
    }

    let content = userInput.trim();

    // If it looks like a URL, fetch it first
    if (content.startsWith('http://') || content.startsWith('https://')) {
      console.log('Fetching URL via Jina AI:', content);
      content = await fetchUrlContent(content);
    }

    console.log('Extracting recipe with AI (Haiku 4.5)...');

    // Call Claude Haiku 4.5 for extraction with automatic gram conversion
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // ⭐ Haiku 4.5 - 5x cheaper!
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `You are a recipe extraction assistant. Extract the recipe from the text below and convert ALL measurements to grams or milliliters.

CRITICAL: Your response must be ONLY valid JSON. Do not include any markdown, explanations, or other text. Start directly with { and end with }.

CONVERSION RULES:
1. Convert ALL volume measurements to weight in grams:
   - 1 cup all-purpose flour = 120g
   - 1 cup granulated sugar = 200g
   - 1 cup brown sugar = 220g
   - 1 cup butter = 227g
   - 1 cup milk = 240ml
   - 1 cup water = 240ml
   - 1 tbsp = 15ml (or 15g for most ingredients)
   - 1 tsp = 5ml (or 5g for most ingredients)

2. Convert weight units to grams:
   - 1 oz = 28g
   - 1 lb = 454g
   - 1 kg = 1000g

3. For whole items, estimate weight:
   - 1 medium onion = 150g
   - 1 large onion = 200g
   - 1 small onion = 100g
   - 1 garlic clove = 5g
   - 1 medium egg = 50g
   - 1 large egg = 60g
   - 1 medium potato = 150g
   - 1 medium tomato = 100g
   - 1 medium carrot = 60g
   - 1 medium lemon = 80g (or "15ml lemon juice" if juiced)

4. Include the size descriptor in the ingredient name:
   - "150g medium onion, chopped" (not just "150g onion")
   - "200g large eggs" (not just "200g eggs")

Required JSON format (respond with ONLY this JSON, nothing else):
{
  "title": "Recipe Name",
  "category": "Breakfast|Lunch|Dinner|Dessert|Snacks|Drinks|Sides",
  "sourceUrl": "original URL if provided",
  "ingredients": [
    {"item": "all-purpose flour", "amount": "240", "unit": "g"},
    {"item": "medium onion, finely chopped", "amount": "150", "unit": "g"}
  ],
  "baseInstructions": [
    {"step": 1, "text": "Instruction text here"}
  ],
  "prepTime": "30 minutes",
  "servings": "4 servings",
  "tags": ["dinner", "pasta", "italian"]
}

TEXT TO EXTRACT FROM:
${content}`,
        },
      ],
    });

    const extracted = message.content[0];
    if (extracted.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    console.log('=== RAW AI RESPONSE ===');
    console.log(extracted.text);
    console.log('=== END RAW RESPONSE ===');

    // Parse the JSON response - be very aggressive about finding the JSON
    const recipeText = extracted.text.trim();
    
    // Remove any markdown code blocks
    let cleanedText = recipeText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to find JSON object between curly braces
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI response:', recipeText);
      throw new Error('No JSON found in AI response');
    }

    let recipe;
    try {
      recipe = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse JSON:', jsonMatch[0]);
      throw new Error('Invalid JSON in AI response');
    }

    // Validate required fields
    if (!recipe.title || !recipe.ingredients || !recipe.baseInstructions) {
      throw new Error('Invalid recipe format: missing required fields');
    }

    console.log('Recipe extracted successfully:', recipe.title);

    // Return in the format the frontend expects: { success: true, recipe: {...} }
    res.json({ success: true, recipe });

  } catch (error) {
    console.error('Recipe extraction error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to extract recipe' 
    });
  }
});

export default router;