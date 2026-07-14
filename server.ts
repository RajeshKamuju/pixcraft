import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Startup check for GEMINI_API_KEY
const startupApiKey = process.env.GEMINI_API_KEY;
if (startupApiKey) {
  const redacted = startupApiKey.length > 8 
    ? `${startupApiKey.slice(0, 4)}...${startupApiKey.slice(-4)}` 
    : '***';
  console.log(`[STARTUP CHECK] GEMINI_API_KEY is present and non-empty. Key preview: ${redacted} (length: ${startupApiKey.length})`);
} else {
  console.warn(`[STARTUP CHECK] WARNING: GEMINI_API_KEY is NOT set or is empty in process.env!`);
}

const app = express();
const PORT = 3000;

// Set up body parsers with limit for image base64 uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Shared Gemini client utility
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[GEMINI INITIALIZATION ERROR] GEMINI_API_KEY process.env variable is missing!');
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    console.log('[GEMINI INITIALIZATION] Initializing GoogleGenAI client with the current process.env.GEMINI_API_KEY...');
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return ai;
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Pexels Search Proxy Route
app.get('/api/pexels/search', async (req, res): Promise<any> => {
  const query = req.query.query as string;
  const page = req.query.page as string || '1';
  const perPage = req.query.per_page as string || '20';

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('[PEXELS API WARNING] PEXELS_API_KEY is not set in environment variables!');
    return res.status(501).json({ 
      error: 'Pexels API key is not configured on the server. Please add PEXELS_API_KEY to your environment variables.' 
    });
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    console.log(`[PEXELS API PROXY] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[PEXELS API ERROR] Status ${response.status}: ${errText}`);
      return res.status(response.status).json({ 
        error: `Pexels API responded with status ${response.status}`, 
        details: errText 
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('[PEXELS PROXY EXCEPTION]', err);
    return res.status(500).json({ error: 'Failed to query Pexels API', details: err.message || err });
  }
});

// Template Generation Endpoint
app.post('/api/generate', async (req, res): Promise<any> => {
  // Increase request timeout to 3 minutes (180000ms) to handle slow Gemini responses
  req.setTimeout(180000);

  const { image, mimeType, templateStyle, name, caption, photoMode = 'face' } = req.body;

  // 1. Log the full received request payload including selected template and mode
  console.log('[API GENERATE] Received request payload:', {
    hasImage: !!image,
    imageLength: image ? image.length : 0,
    mimeType,
    templateStyle,
    name,
    caption,
    photoMode
  });

  // Validation
  if (!image) {
    return res.status(400).json({ error: 'Missing image data' });
  }
  if (!mimeType || !['image/jpeg', 'image/png'].includes(mimeType)) {
    return res.status(400).json({ error: 'Invalid or missing mimeType (must be image/jpeg or image/png)' });
  }
  if (!templateStyle) {
    return res.status(400).json({ error: 'Missing templateStyle' });
  }

  try {
    const aiClient = getGeminiClient();

    // Define style specific description and enhancements
    let styleDescription = '';
    let styleAspect = '1:1';

    const isFaceMode = photoMode === 'face';

    if (templateStyle === 'festival') {
      if (isFaceMode) {
        styleDescription = `A premium professional Festival Greeting card template. Take the person's face from the uploaded photo, keep the face centered, undistorted, well-lit, and beautifully framed. Integrate it naturally into the Festival Greeting design. Wrap the subject elegantly inside a beautiful decorative border featuring warm celebration lights, gold/amber tones, and festive confetti. Render the text Name: "${name || ''}" and Caption: "${caption || ''}" elegantly at the bottom.`;
      } else {
        styleDescription = `A premium professional Festival Greeting card template. Take the main subject of the uploaded image and integrate it naturally into the Festival Greeting design, preserving the subject's proportions and clarity, without distorting or cropping it awkwardly. Wrap the subject elegantly inside a beautiful decorative border featuring warm colors, glowing celebration lights, gold/amber tones, and festive confetti. Render the text Name: "${name || ''}" and Caption: "${caption || ''}" elegantly at the bottom.`;
      }
    } else if (templateStyle === 'idcard') {
      if (isFaceMode) {
        styleDescription = `A formal professional identification ID Card layout. The person's face and features should be perfectly centered, clear, well-lit, and undistorted against a clean white or light gray background, within a thin formal ID card border. Directly below the photo, display the Name: "${name || 'Employee'}" and Job Title/Caption: "${caption || 'Staff'}" in a crisp, highly legible formal sans-serif font.`;
      } else {
        styleDescription = `A formal professional identification ID Card layout. Take the main subject of the uploaded image and integrate it naturally into the ID Card design, preserving the subject's proportions and clarity, without distorting or cropping it awkwardly. The subject should be perfectly centered and clear against a clean white or light gray background, within a thin formal ID card border. Directly below the photo, display the Name: "${name || 'Employee'}" and Job Title/Caption: "${caption || 'Staff'}" in a crisp, highly legible formal sans-serif font.`;
      }
    } else if (templateStyle === 'birthday') {
      if (isFaceMode) {
        styleDescription = `A vibrant and joyful Birthday Poster. Take the person's face from the uploaded photo, keep the face centered, undistorted, well-lit, and beautifully integrated into the design. The background should be decorated with festive colorful balloons, streamer ribbons, and warm lights. At the top, feature a bold, polished "Happy Birthday" text banner. Place the Name: "${name || 'Birthday Star'}" and message/caption: "${caption || ''}" beautifully as part of the birthday layout.`;
      } else {
        styleDescription = `A vibrant and joyful Birthday Poster. Take the main subject of the uploaded image and integrate it naturally into the Birthday Poster design, preserving the subject's proportions and clarity, without distorting or cropping it awkwardly. The background should be decorated with festive colorful balloons, streamer ribbons, and warm lights. At the top, feature a bold, polished "Happy Birthday" text banner. Place the Name: "${name || 'Birthday Star'}" and message/caption: "${caption || ''}" beautifully as part of the birthday layout.`;
      }
    } else if (templateStyle === 'linkedin') {
      styleAspect = '16:9';
      if (isFaceMode) {
        styleDescription = `A high-end professional LinkedIn Profile Banner. Take the person's face from the uploaded photo, keep the face centered, undistorted, well-lit, and naturally placed inside a clean circular or rounded frame on the left side of the banner. The banner background should be a modern, sophisticated gradient in professional colors (deep blue or slate gray) with clean, subtle corporate geometric accents. Render the Name: "${name || ''}" and Headline/Caption: "${caption || ''}" clearly on the right in high-contrast elegant typography.`;
      } else {
        styleDescription = `A high-end professional LinkedIn Profile Banner. Take the main subject of the uploaded image and integrate it naturally into the LinkedIn Profile Banner design, preserving the subject's proportions and clarity, without distorting or cropping it awkwardly. Place the subject inside a clean circular or rounded frame on the left side of the banner. The banner background should be a modern, sophisticated gradient in professional colors (deep blue or slate gray) with clean, subtle corporate geometric accents. Render the Name: "${name || ''}" and Headline/Caption: "${caption || ''}" clearly on the right in high-contrast elegant typography.`;
      }
    } else {
      if (isFaceMode) {
        styleDescription = `A beautiful template styling with name "${name || ''}" and caption "${caption || ''}". Take the person's face from the uploaded photo, keep the face centered, undistorted, well-lit in the frame, and integrate it naturally into the design.`;
      } else {
        styleDescription = `A beautiful template styling with name "${name || ''}" and caption "${caption || ''}". Take the main subject of the uploaded image and integrate it naturally into the design, preserving the subject's proportions and clarity, without distorting or cropping it awkwardly.`;
      }
    }

    let basePrompt = '';
    if (isFaceMode) {
      basePrompt = `Transform this uploaded photo into the template style specified.
Important Rules:
1. Keep the person's face and overall features from the original photo completely centered, recognizable, and undistorted. Keep the face well-lit and balanced in the frame.
2. Integrate it seamlessly into the style described below.
3. The final design should look like a highly polished, single-frame digital template.
4. Render any requested text clearly on the design.
5. In the bottom-right corner, place a very small, clean, semi-transparent watermark text reading "Made with PixCraft". It must be subtle and elegant.

Template Style to implement:
${styleDescription}`;
    } else {
      basePrompt = `Transform this uploaded image into the template style specified.
Important Rules:
1. Take the main subject of the uploaded image and integrate it naturally into the template design, preserving the subject's proportions and clarity, without distorting or cropping it awkwardly. Do not assume there is a face present.
2. Integrate it seamlessly into the style described below.
3. The final design should look like a highly polished, single-frame digital template.
4. Render any requested text clearly on the design.
5. In the bottom-right corner, place a very small, clean, semi-transparent watermark text reading "Made with PixCraft". It must be subtle and elegant.

Template Style to implement:
${styleDescription}`;
    }

    // We will fire two parallel requests to generate 2 distinct variations!
    // We can add minor variations to the prompt or seed to make them different.
    let lastError: any = null;
    const runGeneration = async (variationIndex: number) => {
      const prompt = `${basePrompt}\nEnsure variation ${variationIndex === 0 ? 'A is elegant and classic' : 'B is creative and modern'}.`;
      
      console.log(`[GEMINI API REQUEST] Sending payload for variation ${variationIndex}:`);
      console.log('- model: gemini-2.5-flash-image');
      console.log('- hasImage:', !!image);
      console.log('- mimeType:', mimeType);
      console.log('- prompt:', prompt);
      console.log('- aspectRatio:', styleAspect);
      console.log('- imageSize: 1K');

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: image,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: styleAspect,
            imageSize: '1K',
          },
        },
      }).catch(err => {
        console.error(`[GEMINI API ERROR] Call for variation ${variationIndex} failed:`, err);
        throw err;
      });

      console.log(`[GEMINI API RESPONSE] Raw response for variation ${variationIndex}:`, JSON.stringify(response, null, 2));

      // Parse response parts to extract the base64 image
      let base64Data: string | null = null;
      if (
        response.candidates &&
        response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts
      ) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            base64Data = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Data) {
        throw new Error('Gemini model did not return a valid image for variation ' + (variationIndex + 1));
      }

      return `data:image/png;base64,${base64Data}`;
    };

    // Run in parallel
    const [var1, var2] = await Promise.all([
      runGeneration(0).catch(err => {
        console.error('Variation 1 failed with error:', err);
        lastError = err;
        return null;
      }),
      runGeneration(1).catch(err => {
        console.error('Variation 2 failed with error:', err);
        lastError = err;
        return null;
      }),
    ]);

    const results = [var1, var2].filter(v => v !== null);

    if (results.length === 0) {
      if (lastError) {
        throw lastError;
      }
      return res.status(502).json({ error: 'Gemini image generation model did not return any valid images. Please try a different photo.' });
    }

    res.json({
      variations: results,
    });
  } catch (error: any) {
    console.error('[SERVER API GENERATE ERROR] Full Gemini generation error details:');
    console.error('- Message:', error.message || error);
    console.error('- Name:', error.name || 'N/A');
    console.error('- Status Code:', error.status || error.statusCode || 'N/A');
    console.error('- Stack Trace:', error.stack || 'N/A');
    
    try {
      console.error('- Full JSON-serialized Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (e) {
      console.error('- Raw Error Object:', error);
    }

    // Check for API key invalid or missing (401, 403, or specific messages)
    const isApiKeyError = (
      !process.env.GEMINI_API_KEY ||
      error.status === 401 ||
      error.statusCode === 401 ||
      error.status === 403 ||
      error.statusCode === 403 ||
      String(error.message || error).toLowerCase().includes('api key') ||
      String(error.message || error).toLowerCase().includes('api_key') ||
      String(error.message || error).toLowerCase().includes('key not valid') ||
      String(error.message || error).toLowerCase().includes('unauthorized') ||
      String(error.message || error).toLowerCase().includes('forbidden') ||
      String(error.message || error).toLowerCase().includes('invalid_argument')
    );

    if (isApiKeyError) {
      console.error('API key invalid or missing — check Secrets panel');
      return res.status(401).json({
        error: 'Print generation failed: Invalid or missing API key configuration.',
        status: 401,
        stack: error.stack
      });
    }

    // Check for billing-required or limit-0 errors
    const isBillingError = (
      String(error.message || error).toLowerCase().includes('billing') ||
      String(error.message || error).toLowerCase().includes('plan') ||
      String(error.message || error).toLowerCase().includes('quota exceeded') ||
      String(error.message || error).toLowerCase().includes('limit: 0') ||
      String(error.message || error).toLowerCase().includes('free_tier')
    );

    if (isBillingError) {
      return res.status(402).json({
        error: 'Print generation failed: A billing-enabled API key is required for image-to-image generation.',
        details: error.message || String(error),
        status: 402,
        stack: error.stack
      });
    }

    // Check for rate limit error (429)
    const isRateLimit = (
      error.status === 429 || 
      error.statusCode === 429 || 
      error.status === 'RESOURCE_EXHAUSTED' ||
      String(error.message || error).toLowerCase().includes('429') ||
      String(error.message || error).toLowerCase().includes('quota') ||
      String(error.message || error).toLowerCase().includes('resource_exhausted') ||
      String(error.message || error).toLowerCase().includes('rate limit')
    );

    if (isRateLimit) {
      return res.status(429).json({ 
        error: 'High demand right now, please try again shortly',
        details: error.message || String(error),
        status: 429,
        stack: error.stack
      });
    }

    res.status(error.status || error.statusCode || 500).json({ 
      error: error.message || 'Failed to generate template',
      details: error.message || String(error),
      status: error.status || error.statusCode || 500,
      stack: error.stack
    });
  }
});

// Global JSON error handler to catch PayloadTooLargeError or other routing issues
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express global error handler caught error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'An internal server error occurred',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  });
});

// Vite or Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  
  // Set server timeout to 3 minutes (180000ms)
  server.timeout = 180000;
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

startServer();
