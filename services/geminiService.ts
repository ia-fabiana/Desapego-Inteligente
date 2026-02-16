
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, Item } from "../types";

// Inicialização obrigatória usando process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeItemImage = async (base64Image: string): Promise<AIAnalysisResult> => {
  // Use gemini-3-flash-preview for multimodal analysis tasks
  const model = 'gemini-3-flash-preview';
  const prompt = "Analise visualmente este item de desapego. Forneça um título de venda, uma descrição detalhada mas curta, um preço sugerido em Reais (número) e a categoria mais adequada.";

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
          },
        },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          suggestedPrice: { type: Type.NUMBER },
          category: { type: Type.STRING },
        },
        required: ["title", "description", "suggestedPrice", "category"],
      },
    },
  });

  try {
    // response.text is a property containing the generated string
    const text = response.text || '{}';
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Erro no Parse da IA:", error);
    return { title: "Novo Item", description: "", suggestedPrice: 0, category: "Geral" };
  }
};

export const mapSpreadsheetJsonToItems = async (jsonData: any[]): Promise<Partial<Item>[]> => {
  // Advanced data transformation tasks benefit from the reasoning capabilities of gemini-3-pro-preview
  const model = 'gemini-3-pro-preview';
  const response = await ai.models.generateContent({
    model,
    contents: { 
      parts: [{ text: `Converta estes dados de planilha para o formato de inventário compatível com a interface Item: ${JSON.stringify(jsonData)}` }] 
    },
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "O nome do produto" },
            description: { type: Type.STRING, description: "Uma breve descrição" },
            price: { type: Type.NUMBER, description: "Preço em Reais" },
            category: { type: Type.STRING, description: "Categoria do produto" },
            quantity: { type: Type.NUMBER, description: "Quantidade em estoque" },
          },
          required: ["title", "price", "category"]
        }
      }
    },
  });
  return JSON.parse(response.text || '[]');
};

export const analyzeSpreadsheetFile = async (base64Data: string, mimeType: string): Promise<Partial<Item>[]> => {
  // Extracting information from files is a complex task requiring gemini-3-pro-preview
  const model = 'gemini-3-pro-preview';
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data.split(',')[1] } },
        { text: "Extraia todos os itens desta tabela e retorne um JSON array com campos: title, description, price, category." },
      ],
    },
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            price: { type: Type.NUMBER },
            category: { type: Type.STRING },
          },
          required: ["title", "price", "category"]
        }
      }
    },
  });
  return JSON.parse(response.text || '[]');
};
