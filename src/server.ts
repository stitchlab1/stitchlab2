import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Interactive AI Assistant / Conversational Buddy Route
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, personaId, personaName, personaDescription, userLevel } = req.body;
    
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are an expert English Language Coach designed for Arabic speakers.
The user is practicing English by talking to a character of their choice.
Character Persona Name: "${personaName}"
Character Role/Description: "${personaDescription}"
User's English Level: "${userLevel || 'Intermediate'}" (Adjust vocabulary density/complexity accordingly)

Your job is to:
1. Roleplay cleanly as the character. Keep your English reply relevant, engaging, and in character.
2. In the feedback, inspect the user's latest message ("${message}"). Check for spelling, grammar, preposition errors, or natural phrasing. 
   - Write this feedback in clear, constructive, and friendly Arabic.
   - If their input was English and contained zero errors and was perfectly natural, set "feedback" to empty string ("").
   - If they wrote in Arabic, translate it to natural English for them, and gently explain how they would say it in the feedback field.
3. Suggest 1 to 3 useful words or expressions that they can use in this context, with translations and examples.

You MUST respond strictly in valid JSON format matching this schema:
{
  "reply": "Your contextual English reply in character",
  "arabicTranslation": "A smooth Arabic translation of your reply (helps the learner check their understanding)",
  "feedback": "Arabic grammatical or vocabulary correction on the user's latest input. Keep it positive: 'أحسنت! تصحيح بسيط...' or 'من الأفضل قول...'. Return empty string if the input was perfect.",
  "vocabularySuggestions": [
    { "word": "English word or idiom", "meaning": "Arabic translation", "example": "English example sentence" }
  ]
}

Strictly output valid JSON only. Do not wrap in markdown \`\`\`json fences.
`;

    // Construct history parts for conversational context
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] });
      });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            arabicTranslation: { type: Type.STRING },
            feedback: { type: Type.STRING },
            vocabularySuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  example: { type: Type.STRING }
                },
                required: ["word", "meaning", "example"]
              }
            }
          },
          required: ["reply", "arabicTranslation", "feedback", "vocabularySuggestions"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});

// 2. Grammar & Sentence Analyzer Route
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { sentence } = req.body;
    if (!sentence) {
      res.status(400).json({ error: "Sentence is required" });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are an expert English Grammarian and Instructor for Arabic speakers.
Analyze the user's submitted English statement, phrase, or sentence.
Break it down beautifully into grammatical segments and highlight idioms or useful phonic/pronunciation keys.

Respond strictly in valid JSON format matching this schema:
{
  "translation": "Natural Arabic translation of the sentence",
  "grammarBreakdown": [
    { "part": "segment, verb, tense or word analyzed", "role": "Grammatical function (verb tense, subject-verb agreement etc) in Arabic", "explanation": "Easy-to-understand explanation of the grammar rule in Arabic" }
  ],
  "idiomsOrPhonics": [
    { "term": "Key phrase, word, or pronunciation aspect", "detail": "Advice on how to speak it naturally, silent letters, link sounds, or idiomatic meaning (in Arabic)" }
  ],
  "alternatives": [
    { "phrase": "Clean, natural English alternative sentence", "level": "Beginner, Intermediate, or Advanced", "meaning": "Arabic translation of this alternative phrase" }
  ]
}

No markdown code fences. Strictly output valid JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Sentence: "${sentence}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: { type: Type.STRING },
            grammarBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  part: { type: Type.STRING },
                  role: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["part", "role", "explanation"]
              }
            },
            idiomsOrPhonics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  detail: { type: Type.STRING }
                },
                required: ["term", "detail"]
              }
            },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phrase: { type: Type.STRING },
                  level: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ["phrase", "level", "meaning"]
              }
            }
          },
          required: ["translation", "grammarBreakdown", "idiomsOrPhonics", "alternatives"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});

// 3. Dynamic Quiz Generator Route
app.post("/api/gemini/quiz", async (req, res) => {
  try {
    const { topic, level } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `
You are an English test generator. Generate a 3-question interactive multiple choice test checking vocabulary, common grammar patterns, or preposition rules.
Topic: "${topic || 'General Grammar'}"
Target Level: "${level || 'Intermediate'}" (Beginner, Intermediate, or Advanced)

The questions should be practical, clear, and highly educational for Arabic speakers.
Respond strictly in valid JSON format matching this schema:
{
  "questions": [
    {
      "question": "The quiz question in English (such as fill in the gap, tense correction, prepositions etc.)",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0, // 0-based index of the correct option
      "explanation": "A complete, helpful pedagogical explanation of the correct answer and grammatical rule written in Arabic."
    }
  ]
}

No markdown code fences. Strictly output valid JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate 3 questions for topic "${topic || 'General Grammar'}" at "${level || 'Intermediate'}" level`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  answerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "answerIndex", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Quiz API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});

// Vite/Static assets server configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
