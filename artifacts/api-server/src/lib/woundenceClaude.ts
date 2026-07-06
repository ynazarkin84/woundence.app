import Anthropic from "@anthropic-ai/sdk";
import type { WoundAnalysisResult } from "@workspace/db";

const claudeApiKey = process.env.ANTHROPIC_API_KEY;

function getClaudeClient() {
  if (!claudeApiKey) throw new Error("ANTHROPIC_API_KEY environment variable is required for wound analysis");
  return new Anthropic({ apiKey: claudeApiKey });
}

export async function analyzeWoundImage(
  imageBuffer: Buffer,
  imageMetadata: { width: number; height: number; format: string; size: number }
): Promise<WoundAnalysisResult> {
  const client = getClaudeClient();
  const base64Image = imageBuffer.toString("base64");
  const mediaType =
    imageMetadata.format === "webp" ? "image/webp" : imageMetadata.format === "png" ? "image/png" : "image/jpeg";

  const prompt = `You are an expert wound care specialist and clinical wound assessment AI. Analyze this wound image and provide a comprehensive clinical assessment.

Please provide a detailed JSON response with the following structure (return ONLY valid JSON, no markdown):
{
  "area": <number in cm²>,
  "perimeter": <number in cm>,
  "longestDiameter": <number in cm>,
  "width": <number in cm>,
  "depth": <number in cm or null>,
  "volume": <number in cm³ or null>,
  "undermining": <boolean>,
  "underminingLocation": <string or null>,
  "underminingDepth": <number or null>,
  "tunneling": <boolean>,
  "tunnelingLocation": <string or null>,
  "tunnelingDepth": <number or null>,
  "woundType": <"callus"|"diabetic_foot_ulcer"|"venous_ulcer"|"pressure_ulcer"|"arterial_ulcer"|"edema"|"other">,
  "woundTypeConfidence": <number 0-100>,
  "bodyLocation": <string describing probable anatomical location>,
  "woundClassification": <string>,
  "pressureInjuryStage": <"Stage I"|"Stage II"|"Stage III"|"Stage IV"|"Unstageable"|"Deep Tissue" or null>,
  "wagnerGrade": <0-5 or null>,
  "coapClassification": <string or null>,
  "tissueComposition": {
    "granulation": <percentage 0-100>,
    "slough": <percentage 0-100>,
    "necrotic": <percentage 0-100>,
    "epithelial": <percentage 0-100 or null>,
    "fibrin": <percentage 0-100 or null>
  },
  "exudate": {
    "amount": <"none"|"minimal"|"moderate"|"heavy">,
    "type": <"serous"|"serosanguineous"|"sanguineous"|"purulent"|"none">,
    "odor": <"none"|"mild"|"moderate"|"strong">
  },
  "periwoundSkin": {
    "condition": <"intact"|"macerated"|"erythematous"|"indurated"|"dry/scaly">,
    "edema": <boolean>,
    "erythema": <boolean>,
    "warmth": <boolean>,
    "induration": <boolean>
  },
  "pain": {
    "present": <boolean>,
    "level": <1-10 or null>,
    "character": <string or null>
  },
  "infectionSigns": <array of strings>,
  "healingStage": <1|2|3|4>,
  "dressingRecommendation": {
    "primary": <string>,
    "secondary": <string>,
    "changeFrequency": <string>
  },
  "treatmentPlan": {
    "cleansingAgent": <string>,
    "debridementType": <"none"|"autolytic"|"enzymatic"|"mechanical"|"sharp/surgical">,
    "infectionManagement": <string>,
    "adjunctTherapy": <string>
  },
  "recommendations": <array of clinical recommendation strings>,
  "nextReviewDate": <ISO date string for recommended review>
}

Image metadata: ${imageMetadata.width}x${imageMetadata.height} pixels, format: ${imageMetadata.format}

Provide realistic clinical measurements based on visual assessment. Be precise and clinically accurate.`;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : undefined;
  if (!text) throw new Error("Empty response from Claude API");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No valid JSON found in Claude response");

  const analysis = JSON.parse(jsonMatch[0]) as WoundAnalysisResult;

  if (!analysis.woundType || !analysis.tissueComposition || !analysis.exudate) {
    throw new Error("Incomplete analysis response from Claude API");
  }

  return analysis;
}

export { WoundAnalysisResult };
