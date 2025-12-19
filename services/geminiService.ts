
import { GoogleGenAI, Type } from "@google/genai";
import { JSAData, Language } from "../types";
import { LOCATIONS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateJSAFromAI = async (jobTitle: string, lang: Language): Promise<JSAData> => {
  const model = "gemini-3-flash-preview";
  
  const systemPrompt = `
    You are BIROUK Salima, the world's leading HSE expert at JESA (Jacobs + OCP).
    Your task is to generate a comprehensive Job Safety Analysis (JSA/SPA) for the job title provided.
    
    CRITICAL RULES:
    1. Output strictly valid JSON matching the schema provided.
    2. Hazards: Exactly 12, specific industrial risks with OSHA/NIOSH legal limits.
    3. Tools: Exactly 8, professional grade with real brand/model examples.
    4. Controls: Exactly 8, high-quality preventive measures (PPE, Procedure, Standard).
    5. Steps: Exactly 12, logical sequential work execution steps.
    6. Translate titles accurately into English, French, and Arabic.
    7. Be technical, formal, and industrially precise.
  `;

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
      contents: `Generate a full industrial JSA/SPA for this task: "${jobTitle}". Technical depth: High. Language Context: ${lang}.`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: jsaSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    
    // Safety check and enrichment to fulfill JSAData interface
    return {
      id: `ai-${Date.now()}`,
      ...data,
      metadata: {
        company: 'JESA',
        project: '',
        workOrder: '',
        teamLeader: '',
        teamMembers: []
      },
      locations: LOCATIONS
    };
  } catch (error) {
    console.error("Gemini HSE Expert System Error:", error);
    throw error;
  }
};
