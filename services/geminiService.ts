
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, Item } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeItemImage = async (base64Image: string): Promise<AIAnalysisResult> => {
  const model = 'gemini-3-flash-preview';
  const prompt = "Analise esta imagem de um item usado para venda. Forneça um título atraente, uma descrição detalhada, um preço sugerido em Reais (apenas o número) e uma categoria curta.";

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
    return JSON.parse(response.text || '{}') as AIAnalysisResult;
  } catch (error) {
    console.error("Erro ao processar resposta da IA:", error);
    return { title: "Novo Item", description: "", suggestedPrice: 0, category: "Geral" };
  }
};

export const mapSpreadsheetJsonToItems = async (jsonData: any[]): Promise<Partial<Item>[]> => {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Você é um assistente de inventário profissional. Recebi dados de uma planilha de móveis e equipamentos.
  Mapeie TODOS os itens fornecidos no JSON abaixo para o formato do nosso aplicativo, extraindo campos específicos das colunas.

  REGRAS DE MAPEAMENTO:
  1. title: Use a coluna 'Item'.
  2. category: Use a coluna 'Categoria'.
  3. location: Use a coluna 'Local atual'.
  4. quantity: Use a coluna 'Qtde' (converte para número).
  5. color: Use a coluna 'Cor'.
  6. brand: Use a coluna 'Marca/ Modelo'.
  7. price: Use 'Valor de Mercado'. Se vazio, use 'Valor Unitário'.
  8. imageUrl: Extraia o link da coluna 'Fotos'.
  9. description: Crie um texto fluido citando a Marca, Cor e Medidas se disponíveis.

  DADOS BRUTOS:
  ${JSON.stringify(jsonData)}

  Retorne um ARRAY JSON completo com chaves: title, category, price, description, imageUrl, location, quantity, color, brand.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            price: { type: Type.NUMBER },
            description: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            location: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            color: { type: Type.STRING },
            brand: { type: Type.STRING },
          },
          required: ["title", "category", "price", "description"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Erro ao mapear JSON via IA:", error);
    return [];
  }
};

export const analyzeSpreadsheetFile = async (base64Data: string, mimeType: string): Promise<Partial<Item>[]> => {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Analise visualmente este documento e extraia TODOS os itens da tabela.
  Procure pelas colunas: Item, Categoria, Local atual, Qtde, Cor, Marca/ Modelo, Fotos, Valor de Mercado.
  Retorne um JSON array com title, category, price, description, imageUrl, location, quantity, color, brand.`;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data.split(',')[1],
          },
        },
        { text: prompt },
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
            category: { type: Type.STRING },
            price: { type: Type.NUMBER },
            description: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            location: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            color: { type: Type.STRING },
            brand: { type: Type.STRING },
          },
          required: ["title", "category", "price", "description"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Erro ao parsear arquivo visual:", error);
    return [];
  }
};
