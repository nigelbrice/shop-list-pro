console.log('🔄 CONVERT-INGREDIENTS ROUTE LOADED');

// server/routes/convert-ingredients.ts
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/convert-recipe', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'No ingredients provided' });
    }

    console.log('Converting ingredients to grams/ml...');

    // Format ingredients for AI
    const ingredientList = ingredients
      .map((ing, idx) => `${idx + 1}. ${ing.amount} ${ing.unit} ${ing.item}`)
      .join('\n');

    // Call Claude Haiku for conversion
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Convert these recipe ingredients to grams or milliliters. Return ONLY valid JSON, no markdown or explanations.

CONVERSION RULES:
1. Volume to weight in grams:
   - 1 cup all-purpose flour = 120g
   - 1 cup granulated sugar = 200g
   - 1 cup brown sugar = 220g
   - 1 cup butter = 227g
   - 1 cup milk/water = 240ml
   - 1 tbsp = 15ml (or 15g)
   - 1 tsp = 5ml (or 5g)

2. Weight to grams:
   - 1 oz = 28g
   - 1 lb = 454g
   - 1 kg = 1000g

3. Whole items:
   - 1 medium onion = 150g
   - 1 large onion = 200g
   - 1 garlic clove = 5g
   - 1 medium egg = 50g
   - 1 large egg = 60g
   - 1 medium potato = 150g
   - 1 medium tomato = 100g

4. Keep size descriptors in item name.

INGREDIENTS:
${ingredientList}

Return ONLY this JSON structure:
{
  "ingredients": [
    {"item": "all-purpose flour", "amount": "240", "unit": "g"},
    {"item": "medium onion, chopped", "amount": "150", "unit": "g"}
  ]
}`,
        },
      ],
    });

    const extracted = message.content[0];
    if (extracted.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    console.log('=== CONVERSION RESPONSE ===');
    console.log(extracted.text);
    console.log('=== END RESPONSE ===');

    // Parse JSON response
    const responseText = extracted.text.trim();
    const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      throw new Error('No JSON found in AI response');
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse JSON:', jsonMatch[0]);
      throw new Error('Invalid JSON in AI response');
    }

    if (!result.ingredients || !Array.isArray(result.ingredients)) {
      throw new Error('Invalid response format: missing ingredients array');
    }

    console.log('Converted successfully:', result.ingredients.length, 'ingredients');

    res.json({ success: true, ingredients: result.ingredients });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to convert ingredients' 
    });
  }
});

export default router;
