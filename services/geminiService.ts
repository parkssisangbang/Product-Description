import { GoogleGenAI, Type } from "@google/genai";
import { type CustomTranslation, type GeneratedCopy } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type ProductInput =
  | { type: 'url'; value: string }
  | { type: 'text'; value: string }
  | { type: 'images'; value: File[] };


const extractTextFromUrl = async (url: string): Promise<string> => {
  const prompt = `
    You are an expert at analyzing e-commerce product pages from the website koreasang.co.kr.
    Your task is to analyze the product page at this URL: ${url}
    Imagine you are viewing the detailed product description, which consists of multiple images.
    Please IGNORE the very first main promotional image at the top of the description section, and also IGNORE the very last image which is typically about shipping and company information.
    Focus ONLY on the images in between these two.
    Extract all Korean text from these middle images.
    Consolidate all the extracted text into a single block of text.
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
  return response.text;
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

const extractTextAndAnalyzeImages = async (files: File[]): Promise<string> => {
    const imageParts = await Promise.all(files.map(fileToGenerativePart));
    const prompt = `You are an expert at analyzing product images. From the following images, extract all Korean text. Additionally, describe the key visual features of the product shown. Consolidate all extracted text and visual descriptions into a single, cohesive block of text.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, ...imageParts] }
    });
    return response.text;
};

const generateKoreanCopy = async (
  extractedText: string, 
  learningContext: string,
  requiredKeywords: string[],
  briefDescription: string
): Promise<GeneratedCopy> => {
  const prompt = `
    You are a world-class marketing copywriter for '박씨상방', a premium store specializing in traditional Korean crafts.
    Your task is to create highly persuasive marketing copy based on text extracted from a product's description images and user-provided information.
    The final output must be a single JSON object with two keys: "mainTitle" and "sections".
    - "mainTitle": A single, compelling, and representative title for the entire product. It should be concise and capture the product's essence. ${requiredKeywords.length > 0 ? `**CRITICAL: This title MUST include the following keywords: ${requiredKeywords.join(', ')}.**` : ''}
    - "sections": An array of objects, each with a 'title' and 'content' detailing different aspects of the product.

    ${(briefDescription && briefDescription.trim() !== '') ? `
    **User's Brief Description (Important Context):**
    Use this description as a key reference to understand the product's core message and tone when creating all sections of the copy.
    ---
    ${briefDescription}
    ---
    ` : ''}

    **Core Directives:**
    1.  **Structure and Content Flow:**
        *   **Total Sections:** You must generate AT LEAST FIVE distinct sections.
        *   **First Section (Introduction):** The very first section must serve as an introduction to the cultural context of the craft. Use the "background information" provided about our brand and Korean culture to write this section. For example, if the product is '나전칠기' (Najeonchilgi), this section should explain what Najeonchilgi is, its history, and its value. This section sets the stage before diving into the specific product details.
        *   **Subsequent Sections (Product Details):** All sections after the first one must be based strictly on the "Extracted Text", detailing the specific features, design, and benefits of the product.

    2.  **Prioritize Text, Supplement with Imagery:** Your creative process must be strictly text-first.
        *   **Step 1 (Analyze Text):** Thoroughly analyze the provided "Extracted Text". This is your single source of truth for the product-specific sections (sections 2 onwards). Every feature, benefit, and detail you write about MUST originate from this text.
        *   **Step 2 (Enrich with Imagery):** After grounding your understanding in the text, you may then use your knowledge of the product type to infer and describe logical visual details that would be in the images. This is to make the copy more vivid. For example, if the text mentions "자개" (mother-of-pearl), you can describe its "iridescent shine". This is a valid enrichment. However, if the text does not mention a "wooden box", you CANNOT add a description of one. This is inventing new facts.

    3.  **Section Titles:**
        *   **Goal:** Create direct, powerful, and intriguing titles that highlight a specific product feature or benefit. They should be short, impactful, and grounded in the product's details.
        *   **Style:** Think of them as bold statements or compelling headers, not abstract or emotional questions.
        *   **WHAT TO AVOID (CRITICAL):**
            *   **Do not create illogical connections.** For example, do not claim that a product's size (e.g., "16cm") proves an abstract concept like an artisan's "devotion" (정성). This is nonsensical. A title like "장인의 '정성', 숫자로 증명합니다" is a bad example and must be avoided.
            *   **Do not use overly emotional, vague, or poetic phrases.** Avoid titles like "빛을 담은 보석함, 보셨나요?" (Have you seen the jewelry box that holds light?) or "당신의 가장 소중한 것은 무엇인가요?" (What is your most precious thing?). They are awkward and ineffective.
        *   **Good Example Direction:** Instead of a bad title like "장인의 '정성', 숫자로 증명합니다", a better title for content about size and detail might be "16cm 안에 담긴 디테일의 차이" (The difference in detail, contained within 16cm) or "작지만 완벽한, 모든 각도의 자신감" (Small but perfect, confidence from every angle).

    4.  **Content:** Write in a simple, easy-to-understand style that resonates with a broad audience. Focus on the product's benefits, unique story, and the feeling it evokes.

    5.  **Factual Accuracy:** This is CRITICAL. For sections 2 onwards, base your description ONLY on the provided "Extracted Text". DO NOT invent details about packaging, shipping methods, or included items (e.g., do not say "it comes in a luxurious silk box" or "we provide careful packaging") unless this information is explicitly stated in the extracted text. Stick to describing the product itself—its features, materials, artistry, and emotional value.

    Here is some background information about our brand and Korean culture that you should use for the **first section** and to enrich the overall copy:
    ---
    ${learningContext}
    ---

    Now, using the following extracted text for **sections 2 and onwards**, generate the marketing copy.
    Extracted Text:
    ---
    ${extractedText}
    ---
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                mainTitle: { type: Type.STRING, description: "A single, compelling, and representative title for the entire product." },
                sections: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "A direct, powerful, and intriguing title for the section, based on the new guidelines." },
                            content: { type: Type.STRING, description: "The simple, compelling, and easy-to-read marketing content for the section." }
                        },
                        required: ["title", "content"]
                    }
                }
            },
            required: ["mainTitle", "sections"]
        }
    }
  });

  try {
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as GeneratedCopy;
  } catch (e) {
    console.error("Failed to parse JSON from Gemini for Korean copy:", e);
    throw new Error("Could not generate structured Korean copy.");
  }
};

export const translateToEnglish = async (koreanCopy: GeneratedCopy, customTranslations: CustomTranslation[]): Promise<GeneratedCopy> => {
    const translationRules = customTranslations.reduce((acc, t) => {
        acc[t.korean] = t.english;
        return acc;
    }, {} as Record<string, string>);

    const prompt = `
      Translate the following Korean marketing copy into English.
      The copy is provided as a JSON object. You must return the translated content in the exact same JSON structure, including both the "mainTitle" and all "sections".
      
      **CRITICAL INSTRUCTION:** You MUST follow these specific custom translation rules. If you encounter a Korean word from this list, you MUST use its provided English translation.
      Custom Translation Rules:
      ---
      ${JSON.stringify(translationRules, null, 2)}
      ---
      
      Now, translate this JSON content:
      ---
      ${JSON.stringify(koreanCopy, null, 2)}
      ---
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as GeneratedCopy;
    } catch (e) {
        console.error("Failed to parse JSON from Gemini for English translation:", e);
        throw new Error("Could not generate structured English translation.");
    }
};

export const generateFullProductCopy = async (
  input: ProductInput,
  learningContext: string,
  customTranslations: CustomTranslation[],
  requiredKeywords: string[],
  briefDescription: string
): Promise<{ koreanCopy: GeneratedCopy, englishCopy: GeneratedCopy }> => {
  let extractedText: string;

  switch (input.type) {
    case 'url':
      extractedText = await extractTextFromUrl(input.value);
      break;
    case 'text':
      extractedText = input.value;
      break;
    case 'images':
      extractedText = await extractTextAndAnalyzeImages(input.value);
      break;
    default:
      throw new Error("Invalid input type");
  }

  const koreanCopy = await generateKoreanCopy(extractedText, learningContext, requiredKeywords, briefDescription);
  const englishCopy = await translateToEnglish(koreanCopy, customTranslations);
  
  return { koreanCopy, englishCopy };
};

export const regenerateMainTitle = async (
  existingCopy: GeneratedCopy,
  language: 'ko' | 'en',
  requiredKeywords: string[],
  briefDescription: string,
  customTranslations: CustomTranslation[]
): Promise<string> => {
  if (language === 'ko') {
    const prompt = `
      You are a world-class marketing copywriter for '박씨상방', a premium store specializing in traditional Korean crafts.
      I have a product description with the main title: "${existingCopy.mainTitle}".
      I need a new, alternative main title for this product.
      The new title must be compelling, representative, and different from the current one.
      ${requiredKeywords.length > 0 ? `**CRITICAL: The new title MUST include the following keywords: ${requiredKeywords.join(', ')}.**` : ''}

      For context, here is the user's brief description:
      ---
      ${briefDescription}
      ---
      
      And here is the full product description copy:
      ---
      ${JSON.stringify(existingCopy.sections, null, 2)}
      ---

      Generate ONLY the new main title as a single string of plain text, without any formatting like quotes or labels.
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim().replace(/^"|"$/g, '');
  } else {
    // English regeneration
    const translationRules = customTranslations.reduce((acc, t) => {
        acc[t.korean] = t.english;
        return acc;
    }, {} as Record<string, string>);
    const prompt = `
      You are a world-class marketing copywriter.
      I have an English product description. The current main title is: "${existingCopy.mainTitle}".
      I need a new, alternative main title for this product.
      The new title must be compelling, representative, and different from the current one.

      **CRITICAL INSTRUCTION:** Be mindful of these custom translation rules if relevant words appear.
      Custom Translation Rules:
      ---
      ${JSON.stringify(translationRules, null, 2)}
      ---
      
      For context, here is the full English description:
      ---
      ${JSON.stringify(existingCopy.sections, null, 2)}
      ---

      Generate ONLY the new main title as a single string of plain text, without any formatting like quotes or labels.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text.trim().replace(/^"|"$/g, '');
  }
};

export const regenerateSectionTitle = async (
  sectionContent: string,
  mainTitle: string,
  language: 'ko' | 'en',
  customTranslations: CustomTranslation[]
): Promise<string> => {
  if (language === 'ko') {
    const prompt = `
      You are a world-class marketing copywriter for '박씨상방'.
      I have a section of a product description and I need a new, alternative title for it.

      **Context:**
      - Product Main Title: "${mainTitle}"
      - Section Content: "${sectionContent}"

      **Guidelines for the new title (CRITICAL):**
      - **Goal:** Create a direct, powerful, and intriguing title that highlights a specific product feature or benefit from the content.
      - **Style:** Short, impactful, and grounded in the product's details.
      - **WHAT TO AVOID (CRITICAL):**
          *   **Do not create illogical connections.** (e.g., claiming size proves devotion).
          *   **Do not use overly emotional, vague, or poetic phrases.** (e.g., "Have you seen the jewelry box that holds light?").
      - **Good Example Direction:** A title for content about size and detail might be "16cm 안에 담긴 디테일의 차이" (The difference in detail, contained within 16cm).

      Generate ONLY the new section title as a single string of plain text, without any formatting like quotes or labels.
    `;
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim().replace(/^"|"$/g, '');
  } else {
    // English regeneration
    const translationRules = customTranslations.reduce((acc, t) => {
        acc[t.korean] = t.english;
        return acc;
    }, {} as Record<string, string>);
    const prompt = `
      You are a world-class marketing copywriter.
      I have a section of an English product description. I need a new, alternative title for it.

      **Context:**
      - Product Main Title: "${mainTitle}"
      - Section Content: "${sectionContent}"

      **Guidelines for the new title:**
      - **Goal:** Create a direct, powerful, and intriguing title.
      - **Style:** Short and impactful.

      **CRITICAL INSTRUCTION:** Be mindful of these custom translation rules if relevant words appear.
      Custom Translation Rules:
      ---
      ${JSON.stringify(translationRules, null, 2)}
      ---
      
      Generate ONLY the new section title as a single string of plain text, without any formatting like quotes or labels.
    `;
     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text.trim().replace(/^"|"$/g, '');
  }
};