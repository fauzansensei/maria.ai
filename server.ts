import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.warn("Maria Server: Firebase Admin failed to initialize naturally. Check credentials.", e);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini with server-side key
  const genAI = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.use(express.json({ limit: '20mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/maria", async (req, res) => {
    try {
      const { contents, systemInstruction, temperature, topP, customApiKey, firebaseToken } = req.body;

      let effectiveApiKey = process.env.GEMINI_API_KEY || '';
      
      // If user provided a token, check for a paid key in their profile PREFERRING the cloud storage over the request body
      if (firebaseToken && admin.apps.length) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
          const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            // Use paid API key if available in preferences (regardless of Plus status, if they have a key we use it)
            if (data?.preferences?.paidApiKey) {
              effectiveApiKey = data.preferences.paidApiKey;
              console.log(`Maria Server: Using user-provided API key for UID: ${decodedToken.uid}`);
            }
          }
        } catch (e) {
          console.warn("Maria Server: Firebase token verification failed", e);
        }
      }

      // Fallback to customApiKey from body if NO token was provided (legacy support or dev)
      // but prioritize the cloud-fetched key.
      if (!firebaseToken && customApiKey) {
        effectiveApiKey = customApiKey;
      }

      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: {
          systemInstruction,
          temperature: temperature || 0.7,
          topP: topP || 0.9,
          // Gemini 2.0 SDK uses googleSearch (camelCase)
          tools: [{ googleSearch: {} }] as any,
        }
      });

      res.json({ 
        text: response.text,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata 
      });
    } catch (error: any) {
      // SCRUB ERROR: Prevent leaking keys in logs
      const safeErrorMessage = error.message?.replace(/[A-Za-z0-9_-]{35,}/g, '[REDACTED_KEY]');
      console.error("Maria Server API Error:", safeErrorMessage || "Unknown Error");
      
      const isQuotaError = error.status === 429 || 
                          error.message?.toLowerCase().includes("429") || 
                          error.message?.toLowerCase().includes("quota") ||
                          error.message?.toLowerCase().includes("resource_exhausted") ||
                          error.status === "RESOURCE_EXHAUSTED";

      if (isQuotaError) {
        return res.status(429).json({
          error: "Kuota API Gemini telah habis atau limit harian tercapai. Silakan coba lagi nanti atau hubungkan kunci API berbayar di Settings.",
          status: "RESOURCE_EXHAUSTED"
        });
      }

      res.status(500).json({ 
        error: "Terjadi kesalahan pada server Maria. Mohon coba lagi.",
        status: error.status || "UNKNOWN"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Maria Server Critical Failure:", err);
  process.exit(1);
});
