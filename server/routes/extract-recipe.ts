// server/routes/extract-recipe.ts
// Using Claude Haiku 3.5 - 10x cheaper than Sonnet! (~1-2 cents per recipe)

import { Router } from 'express';

const router = Router();

// Helper function to check if text is a URL
function isUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Helper function to fetch webpage content via Jina AI Reader (free, clean text)
async function fetchWebpage(url: string): Promise<string> {
  try {
    // Use Jina AI Reader to get clean text instead of raw HTML
    const jinaUrl = `https://r.jina.ai/${url}`;
    
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch via Jina: ${response.statusText}`);
    }

    const cleanText = await response.text();
    console.log('Jina Reader returned clean text, length:', cleanText.length);
    return cleanText;
    
  } catch (error) {
    console.error('Jina Reader failed, falling back to direct fetch:', error);
    
    // Fallback: direct fetch
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    return await response.text();
  }
}

router.post('/', async (req, res) => {
  try {
    let { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Check if input is a URL and fetch if so
    let sourceType = 'text';
    if (isUrl(text)) {
      console.log('Detected URL, fetching webpage:', text);
      sourceType = 'url';
      try {
        text = await fetchWebpage(text);
        console.log('Successfully fetched webpage, content length:', text.length);
      } catch (fetchError) {
        console.error('Failed to fetch URL:', fetchError);
        return res.status(400).json({ 
          error: 'Could not fetch the URL. Please copy and paste the recipe text instead.',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        });
      }
    }

    console.log(`Attempting to extract recipe from ${sourceType}, text length:`, text.length);

    // Use Claude Sonnet 4 - Reliable and works perfectly
    // With Jina AI cleaning: ~6 cents per recipe (vs 50 cents without Jina!)
    // For 150 recipes: ~$9 total - reasonable for a one-time import
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Extract recipe information from the following text.

Return ONLY valid JSON with this exact structure (no markdown, no preamble):
{
  "title": "Recipe name",
  "ingredients": [
    {"item": "ingredient name", "amount": "quantity", "unit": "measurement", "notes": "optional notes"}
  ],
  "baseInstructions": [
    {"step": 1, "text": "instruction text"}
  ],
  "prepTime": "optional prep time",
  "servings": "optional servings",
  "tags": ["optional", "tags"]
}

Text to extract:
${text}`,
          },
        ],
      }),
    });

    console.log('Claude Sonnet response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Claude error response:', errorBody);
      throw new Error(`Claude API error: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    console.log('Claude response received, content blocks:', data.content?.length);

    const textContent = data.content.map((i: any) => i.text || '').join('\n');
    
    // Clean and parse JSON
    const clean = textContent.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    
    console.log('Successfully parsed recipe:', parsed.title);
    res.json(parsed);

  } catch (error) {
    console.error('Recipe extraction error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to extract recipe' });
  }
});

export default router;