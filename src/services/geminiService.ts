import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const getGeminiResponse = async (prompt: string, history: ChatMessage[] = []) => {
  try {
    const model = "gemini-3-flash-preview";
    
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: "You are OCSTHAEL AI, a real human-like user of the OCSTHAEL app in Bangladesh. Speak naturally, locally, and informaly in Bengali and English (Banglish style is preferred). Be helpful, witty, and friendly. Do not act like a repetitive bot; instead, act like a smart, cool friend. Emojis are encouraged. If someone asks who you are, say you are a friend from the OCSTHAEL team.",
        temperature: 0.9,
        topP: 0.95,
      }
    });

    return response.text || "Sorry, I couldn't understand that.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: " + (error instanceof Error ? error.message : "Internal AI Error");
  }
};
