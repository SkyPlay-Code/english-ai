// --- "COSMIC SCHOLAR" BACKEND SERVER (FINAL FOR VERCEL DEPLOYMENT) ---

const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const cors = require('cors');
const multer = require('multer');

// --- SETUP ---
const app = express();
// This is the crucial change for security. 
// It reads the API_KEY from the "Environment Variables" you set on Vercel.
const API_KEY = process.env.API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
const upload = multer({ storage: multer.memoryStorage() });

// --- HELPER FUNCTION FOR CITATIONS ---
function addCitations(response) {
    let text = response.text();
    const supports = response.candidates?.[0]?.groundingMetadata?.groundingSupports;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (!supports || !chunks) { return text; }
    
    const sortedSupports = [...supports].sort((a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0));

    for (const support of sortedSupports) {
        const endIndex = support.segment?.endIndex;
        if (endIndex === undefined || !support.groundingChunkIndices?.length) { continue; }

        const citationLinks = support.groundingChunkIndices
            .map(i => {
                const uri = chunks[i]?.web?.uri;
                return uri ? ` [${i + 1}](${uri})` : null;
            })
            .filter(Boolean);

        if (citationLinks.length > 0) {
            text = text.slice(0, endIndex) + citationLinks.join("") + text.slice(endIndex);
        }
    }
    return text;
}

// --- MODEL CONFIGURATION ---
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  systemInstruction: "You are a helpful English Professor AI. Your answers should be accurate and factual. Use markdown for formatting.",
  tools: [{ googleSearch: {} }],
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ]
});

// --- API ENDPOINTS ---

// 1. Endpoint for Text Chat (with memory and search grounding)
app.post('/api/generate-text', async (req, res) => {
    try {
        const { prompt, history } = req.body;
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt);
        const response = result.response;

        if (response.candidates && response.candidates.length > 0) {
            const textWithCitations = addCitations(response);
            res.json({ message: textWithCitations });
        } else {
            console.error("AI response blocked or empty. Full response:", JSON.stringify(response, null, 2));
            res.status(500).json({ error: "The AI's response was blocked due to safety filters. Please try rephrasing." });
        }
    } catch (error) {
        console.error("Error in /generate-text:", error.message);
        res.status(500).json({ error: 'Failed to generate text response.' });
    }
});

// 2. Endpoint for PDF Analysis (stateless)
app.post('/api/analyze-pdf', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file was uploaded.' });
        }
        const prompt = req.body.prompt;
        const filePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } };
        const result = await model.generateContent([prompt, filePart]);
        const response = result.response;

        if (response.candidates && response.candidates.length > 0) {
            res.json({ message: response.text() });
        } else {
            res.status(500).json({ error: "The AI's analysis was blocked due to safety filters." });
        }
    } catch (error) {
        console.error("Error in /analyze-pdf:", error.message);
        res.status(500).json({ error: 'Failed to analyze the PDF.' });
    }
});

// --- EXPORT FOR VERCEL ---
// This line allows Vercel to use our 'app' as a serverless function.
module.exports = app;