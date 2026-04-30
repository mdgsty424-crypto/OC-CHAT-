import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";

// Use VITE_ prefix as specifically requested for Vercel environment compatibility
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
const genAI = new GoogleGenerativeAI(API_KEY);

// Function Declarations for AI Agent
export const updateProfileFunction: FunctionDeclaration = {
  name: "updateProfile",
  description: "Updates the user's profile information like name, bio, or username.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      displayName: { type: SchemaType.STRING, description: "The new display name of the user." },
      bio: { type: SchemaType.STRING, description: "A short bio or description." },
      username: { type: SchemaType.STRING, description: "A unique username starting with @." },
      location: { type: SchemaType.STRING, description: "User's location." }
    },
  },
};

export const updateSecurityFunction: FunctionDeclaration = {
  name: "updateSecurity",
  description: "Updates security settings like app lock or privacy mode.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      appLockEnabled: { type: SchemaType.BOOLEAN, description: "Enable or disable app lock." },
      privacyModeEnabled: { type: SchemaType.BOOLEAN, description: "Enable or disable privacy mode (screenshot protection)." },
      pin: { type: SchemaType.STRING, description: "Set a 4-digit security PIN." }
    },
  },
};

export const getLatestBooksFunction: FunctionDeclaration = {
  name: "getLatestBooks",
  description: "Retrieves the latest posts from the Books feed for context.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      count: { type: SchemaType.NUMBER, description: "Number of posts to retrieve (default 5)." }
    }
  }
};

export interface AICallback {
  name: string;
  args: any;
}

export class GeminiService {
  private static modelName = "gemini-1.5-flash";

  static async chat(prompt: string, history: any[] = [], isMention: boolean = false): Promise<{ text: string; functionCalls?: AICallback[] }> {
    if (!API_KEY) {
      return { text: "AI is currently unavailable (API Key missing). Please check your environment variables." };
    }

    try {
      const model = genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: `You are the OCSTHAEL AI, the official AI character of the OC Chat app. 
          Respond naturally in Bengali-English mix (Benglish/Hinglish). 
          ${isMention ? "You were mentioned in a group/private chat. Provide a helpful, concise response based on the message context." : "You are talking to the user in a direct chat. Help them explore the app or manage their account."}
          When asked to perform actions (like updating profile or security), you MUST use the provided tools. 
          CRITICAL: Always ask for 'Confirm' permission before executing any sensitive account changes.
          Keep responses fast and optimized for mobile users.`,
        tools: [
          { functionDeclarations: [updateProfileFunction, updateSecurityFunction, getLatestBooksFunction] }
        ]
      });

      const result = await model.generateContent({
        contents: [
          ...history,
          { role: 'user', parts: [{ text: prompt }] }
        ]
      });

      const response = result.response;
      const text = response.text() || "";
      const functionCalls: AICallback[] = [];
      
      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              args: part.functionCall.args
            });
          }
        }
      }

      return { text, functionCalls };
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return { text: "Ektu somossa hochche, pore try koro! (Having a slight issue, try again later!)" };
    }
  }
}
