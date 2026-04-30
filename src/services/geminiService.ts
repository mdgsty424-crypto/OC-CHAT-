import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

// Use VITE_ prefix as specifically requested for Vercel environment compatibility
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Function Declarations for AI Agent
export const updateProfileFunction: FunctionDeclaration = {
  name: "updateProfile",
  description: "Updates the user's profile information like name, bio, or username.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      displayName: { type: Type.STRING, description: "The new display name of the user." },
      bio: { type: Type.STRING, description: "A short bio or description." },
      username: { type: Type.STRING, description: "A unique username starting with @." },
      location: { type: Type.STRING, description: "User's location." }
    },
  },
};

export const updateSecurityFunction: FunctionDeclaration = {
  name: "updateSecurity",
  description: "Updates security settings like app lock or privacy mode.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appLockEnabled: { type: Type.BOOLEAN, description: "Enable or disable app lock." },
      privacyModeEnabled: { type: Type.BOOLEAN, description: "Enable or disable privacy mode (screenshot protection)." },
      pin: { type: Type.STRING, description: "Set a 4-digit security PIN." }
    },
  },
};

export const getLatestBooksFunction: FunctionDeclaration = {
  name: "getLatestBooks",
  description: "Retrieves the latest posts from the Books feed for context.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      count: { type: Type.NUMBER, description: "Number of posts to retrieve (default 5)." }
    }
  }
};

export interface AICallback {
  name: string;
  args: any;
}

export class GeminiService {
  private static model = "gemini-3-flash-preview";

  static async chat(prompt: string, history: any[] = [], isMention: boolean = false): Promise<{ text: string; functionCalls?: AICallback[] }> {
    if (!API_KEY) {
      return { text: "AI is currently unavailable (API Key missing). Please check your environment variables." };
    }

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction: `You are the OCSTHAEL AI, the official AI character of the OC Chat app. 
          Respond naturally in Bengali-English mix (Benglish/Hinglish). 
          ${isMention ? "You were mentioned in a group/private chat. Provide a helpful, concise response based on the message context." : "You are talking to the user in a direct chat. Help them explore the app or manage their account."}
          When asked to perform actions (like updating profile or security), you MUST use the provided tools. 
          CRITICAL: Always ask for 'Confirm' permission before executing any sensitive account changes.
          Keep responses fast and optimized for mobile users.`,
          tools: [
            { functionDeclarations: [updateProfileFunction, updateSecurityFunction, getLatestBooksFunction] }
          ]
        }
      });

      const text = response.text || "";
      const functionCalls = response.functionCalls?.map(fc => ({
        name: fc.name,
        args: fc.args
      }));

      return { text, functionCalls };
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return { text: "Ektu somossa hochche, pore try koro! (Having a slight issue, try again later!)" };
    }
  }
}
