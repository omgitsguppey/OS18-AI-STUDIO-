import { Type } from "@google/genai";
import { generateOptimizedContent } from "./core";
import { getString, parseJsonObject } from "./parse";
import { AppID } from "../../types";

const TRAP_LEXICON = {
  STAPLES: ["Motion", "Slime", "Twin", "Wock", "Tech", "Za", "YSL", "Opps", "Crash out", "No Cap"],
  LUXURY_BRANDS: ["Rick Owens", "Chrome Hearts", "Bottega", "Maybach", "Cullinan", "Skeleton AP", "Patek", "Margiela"],
  PHONETIC_DEVICES: ["Alliteration", "Internal Rhyme", "Assonance", "Multisyllabic Rhyme Schemes"],
  TROPE_TOPICS: [
    "Codeine / Purple Fluid", "Snakes in the grass", "Penthouse Isolation",
    "Global Travel / Paris", "Hardware / Dracos", "High Fashion Fabrics",
    "Betrayal by Day-Ones", "Success as a Nightmare"
  ]
};

export const generateTrapBar = async (
  likedLines: string[], 
  dislikedLines: string[],
  vibe: string = "Flex"
): Promise<string> => {
  // --- ALGORITHM 1: Brand Affinity & Slang Weighting ---
  // We scan liked lines to see which brands/slang appear most frequently to create a "Signature"
  const userSignature = likedLines.join(" ");
  const preferredBrands = TRAP_LEXICON.LUXURY_BRANDS.filter(b => 
    new RegExp(b.split(" ")[0], "i").test(userSignature)
  );
  
  // --- ALGORITHM 2: Linguistic Density Analysis ---
  // Determine if the user prefers "Short/Punchy" or "Long/Complex" based on average word count
  const avgWordCount = likedLines.length > 0 
    ? likedLines.reduce((acc, line) => acc + line.split(" ").length, 0) / likedLines.length 
    : 10;

  // --- ALGORITHM 3: Diversity Injection ---
  // Ensure we don't pick the same anchor if it's already in the "Recent Likes"
  const availableTopics = TRAP_LEXICON.TROPE_TOPICS.filter(t => !userSignature.includes(t.split(" ")[0]));
  const topic = (availableTopics.length > 0 ? availableTopics : TRAP_LEXICON.TROPE_TOPICS)[Math.floor(Math.random() * (availableTopics.length || 1))];
  
  const brand = TRAP_LEXICON.LUXURY_BRANDS[Math.floor(Math.random() * TRAP_LEXICON.LUXURY_BRANDS.length)];
  const device = TRAP_LEXICON.PHONETIC_DEVICES[Math.floor(Math.random() * TRAP_LEXICON.PHONETIC_DEVICES.length)];

  const vibeMap: Record<string, string> = {
    Flex: "Arrogant, brand-heavy, untouchable wealth status.",
    Dark: "Nihilistic, menacing, Gotham-esque paranoia.",
    Pain: "Toxic, numb, emotionally detached, substance-reliant.",
    Hype: "Aggressive, high-velocity, dominant club energy."
  };

  const systemInstruction = `You are a Platinum Trap Ghostwriter. Persona: Detached, Toxic, Wealthy.
  
  CURRENT TASK:
  Generate a punchline about ${topic} (${vibe} vibe).
  
  LINGUISTIC HEURISTICS:
  - Avg Length Target: ${avgWordCount < 8 ? "Ultra-short/Punchy" : "Detailed/Atmospheric"} (~${Math.round(avgWordCount)} words).
  - Primary Anchor: ${brand}.
  - Rhetorical Device: Use ${device}.
  - Known User Brand Affinity: ${preferredBrands.length > 0 ? preferredBrands.join(", ") : "None detected yet"}.
  
  SELF-LEARNING ANALYSIS:
  Analyze these liked lines for cadence: ${JSON.stringify(likedLines.slice(-5))}.
  If the user likes ${preferredBrands[0] || "high-end items"}, pivot the lyrics to luxury ${topic}.
  
  NEGATIVE CONSTRAINTS:
  - AVOID: ${JSON.stringify(dislikedLines.slice(-3))}.
  - No corny rhyming. No mentioning "rapping".
  
  Response must be JSON with a "bar" string.`;

  try {
    const response = await generateOptimizedContent(
      AppID.TRAP_AI,
      `Spit a ${vibe} bar. Reference: ${brand}. Topic: ${topic}.`,
      {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { bar: { type: Type.STRING } }
        }
      }
    );
    
    const parsed = parseJsonObject(response.text);
    if (!parsed) return "Motion silent, Maybach tinted, I'm already gone.";
    return getString(parsed, "bar", "Motion silent, Maybach tinted, I'm already gone.");
  } catch (error) {
    console.error("TrapAI Algorithmic Error:", error);
    return "The vault is locked. Motion too heavy.";
  }
};
