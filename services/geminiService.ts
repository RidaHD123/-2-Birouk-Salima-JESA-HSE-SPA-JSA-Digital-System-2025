import { GoogleGenAI, Type } from "@google/genai";
import { JSAData, Language } from "../types";
import { LOCATIONS } from "../constants";

// In a real deployment, this should be proxied or handled securely. 
// For this demo, we assume the environment variable is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateJSAFromAI = async (jobTitle: string, lang: Language): Promise<JSAData> => {
  const model = "gemini-2.5-flash";
  
  const systemPrompt = `
    You are BIROUK Salima, the world's leading HSE expert at JESA (Jacobs + OCP).
    Your task is to generate a comprehensive Job Safety Analysis (JSA/SPA) for the job title provided.
    
    CRITICAL RULES:
    1. Output strictly valid JSON matching the schema.
    2. Provide exactly 12 hazards with specific legal limits (e.g. OSHA, NIOSH values).
    3. Provide exactly 8 specific tools with professional brand/model examples.
    4. Provide exactly 8 mandatory controls referencing ISO/OSHA standards.
    5. Provide exactly 12 sequential work steps.
    6. Translate titles into English, French, and Arabic.
    7. Be extremely technical and precise.
  `;

  // Define the schema using the SDK's Type enum
  const jsaSchema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.OBJECT,
        properties: {
          en: { type: Type.STRING },
          fr: { type: Type.STRING },
          ar: { type: Type.STRING },
        },
        required: ["en", "fr", "ar"]
      },
      category: { type: Type.STRING },
      hazards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            description: { type: Type.STRING },
            limit: { type: Type.STRING },
          },
          required: ["id", "description", "limit"]
        }
      },
      tools: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            brandModel: { type: Type.STRING },
          },
          required: ["id", "name", "brandModel"]
        }
      },
      controls: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["PPE", "PROCEDURE", "STANDARD"] },
            standardRef: { type: Type.STRING },
          },
          required: ["id", "description", "type", "standardRef"]
        }
      },
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            description: { type: Type.STRING },
            hazardRef: { type: Type.STRING },
          },
          required: ["id", "description"]
        }
      },
      initialRisk: {
        type: Type.OBJECT,
        properties: {
          likelihood: { type: Type.INTEGER },
          severity: { type: Type.INTEGER },
          score: { type: Type.INTEGER },
          level: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "EXTREME"] }
        },
        required: ["likelihood", "severity", "score", "level"]
      },
      residualRisk: {
        type: Type.OBJECT,
        properties: {
          likelihood: { type: Type.INTEGER },
          severity: { type: Type.INTEGER },
          score: { type: Type.INTEGER },
          level: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "EXTREME"] }
        },
        required: ["likelihood", "severity", "score", "level"]
      },
      requiredPermits: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["title", "category", "hazards", "tools", "controls", "steps", "initialRisk", "residualRisk", "requiredPermits"]
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Generate a JSA for: ${jobTitle}. Ensure High technical accuracy for industrial settings.`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: jsaSchema,
        temperature: 0.3, // Low temperature for factual consistency
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    
    // Enrich with static location data
    return {
      id: `ai-${Date.now()}`,
      ...data,
      locations: LOCATIONS
    };
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};