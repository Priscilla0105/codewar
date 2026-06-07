import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      console.log("Successfully initialized Gemini AI Engine.");
    } catch (e) {
      console.error("Gemini AI Client failed to initialize: ", e);
    }
  }
  return aiClient;
}

// Sassy competitor statements if key is unconfigured
const COMPETITIVE_FALLBACKS = [
  "Nice try, but I wrote this algorithm in my sleep!",
  "Is your compiler as slow as your typing speed?",
  "Are you stuck? I've already passed 3 test cases. Speed up!",
  "Are you still writing nested loops? O(N^2) represents a severe performance bottleneck.",
  "Just pushed my update. No compilation errors over here. Let's go!",
  "Hey, let me know if you need to copy-paste some solutions... Oh wait, pasting is blocked! Ha!",
  "Don't feel bad, losing to an AI is the current tech standard.",
  "My code execution timer is 12ms. What's yours?",
  "Check your stack traces! Sounds like you've triggered an out-of-bounds error."
];

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  parameters: { model: string; contents: string; config?: any },
  retries = 2,
  delayMs = 1000
): Promise<any> {
  const modelsToTry = [parameters.model, "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...parameters,
          model: model,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        console.warn(`Gemini call failed for model ${model} (attempt ${attempt + 1}/${retries + 1}):`, error.message || error);
        
        // If it's a 404 or Model Not Found, we can transition to the fallback model immediately
        if (error.status === 404 || (error.message && error.message.toLowerCase().includes("not found"))) {
          break;
        }

        if (attempt < retries) {
          const backoff = delayMs * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }
  }
  throw lastError || new Error("Failed to generate content after retries.");
}

export async function generateAiOpponentChat(
  opponentCodeProgress: number,
  userWpm: number,
  problemTitle: string,
  userChatMessage?: string
): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    // Return random sassy fallback
    if (userChatMessage && userChatMessage.toLowerCase().includes("help")) {
      return `I can't write your code for "${problemTitle}", but remember to verify array index constraints!`;
    }
    return COMPETITIVE_FALLBACKS[Math.floor(Math.random() * COMPETITIVE_FALLBACKS.length)];
  }

  try {
    const prompt = `You are a sassy, competitive, expert developer playing a 1v1 online speed-coding battle against a human user.
The game is called "Clash of Coders".
Problem title: "${problemTitle}"
User's typing speed: ${userWpm} WPM.
AI progress: ${opponentCodeProgress}% of test cases passing.
User message: "${userChatMessage || 'Solve fast!'}"

CRITICAL RULES:
- You must NOT reveal answers or write any part of the solution.
- You must NOT provide code snippets, complete code blocks, or solve problems automatically.
- You must NOT reveal hidden test cases.
- You are strictly forbidden from outputting code.
- You can only give sassy, encouraging, or competitive prompts, suggest approaches, give hints, check overall input conditions, or provide technical guidance/explanation of concepts (e.g. "Try using a loop.", "Think about arrays.", "Consider edge cases.", "Check your input conditions.").

Generate a short, playful, developer-focused chat retort. Keep it under 2 sentences. Include subtle technical humor, code jokes (e.g. O(N), StackOverflow, recursion, or semicolon issues) and match their energy. Do not repeat greeting patterns.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.85
      }
    });

    return response.text?.trim() || "Let's see who merges the pull request first!";
  } catch (error) {
    console.error("Gemini runtime error, cascading to competitive fallback:", error);
    return COMPETITIVE_FALLBACKS[Math.floor(Math.random() * COMPETITIVE_FALLBACKS.length)];
  }
}

export async function generateAiMentorChat(
  problemTitle: string,
  problemDescription: string,
  userCode: string,
  language: string,
  userChatMessage: string
): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return "I am currently running in offline mode. For full AI mentorship, please make sure to configure your GEMINI_API_KEY inside Settings. Let's trace your code together!";
  }

  try {
    const prompt = `You are a ChatGPT-style expert, ultra-intelligent, friendly, and highly encouraging coding AI Mentor in "Clash of Coders".
Your goal is to guide the student, explain syntax errors, provide logic explanations, give debugging tips, beginner-friendly explanations, or motivational suggestions.

CRITICAL RULES:
- You must NOT reveal answers or write any part of the solution.
- You must NOT provide code snippets, complete code blocks, or solve problems automatically.
- You must NOT reveal hidden test cases.
- You are strictly forbidden from outputting code.
- You can ONLY:
  * Give hints (e.g. "Try using a loop.", "Think about arrays.", "Consider edge cases.", "Check your input conditions.")
  * Give motivation and encourage users
  * Explain programming concepts
  * Suggest high-level approaches
  * Provide learning guidance

Problem title: "${problemTitle}"
Problem specification: "${problemDescription}"
Programming language: "${language}"

Student's current source code draft (for context ONLY, do NOT use this to generate code):
\`\`\`
${userCode}
\`\`\`

Current User's message to you: "${userChatMessage}"

Please respond in markdown to provide high-level concept hints or encouragement. Keep it concise, helpful, and completely free of any code solutions.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7
      }
    });

    return response.text?.trim() || "I'm examining your solution. Let's think about how to loop through the inputs correctly!";
  } catch (error) {
    console.error("Gemini mentor runtime error:", error);
    return "I'm feeling a bit disconnected at the moment, but you're doing great! Keep analyzing constraints and checking array indices!";
  }
}
