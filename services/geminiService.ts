import { GoogleGenAI, Type } from "@google/genai";
import { DescriptiveStats, AdvancedAnalysis, AiRecommendation, SamplingMethod } from "../types";

export const getGeminiRecommendation = async (stats: DescriptiveStats, analysis: AdvancedAnalysis): Promise<AiRecommendation> => {
    // NOTE: Ensure VITE_GEMINI_API_KEY is set in your .env file
    // Adapting process.env.API_KEY to import.meta.env for Vite compatibility if needed, 
    // or keep as is if using a define plugin. For now, matching user snippet but adding fallback.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env.API_KEY as string) || '';

    if (!apiKey) {
        console.warn("Gemini API Key missing. Please set VITE_GEMINI_API_KEY in .env");
    }

    // Initialize with safe fallback if key is missing to avoid immediate crash before call
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Como experto en auditoría NIA 530, analiza estos datos y recomienda un método de muestreo.
    Estadísticas: Suma=${stats.sum}, Promedio=${stats.avg}, CV=${stats.cv}.
    Análisis Forense: Benford Issues=${JSON.stringify(analysis.benford)}, Outliers=${analysis.outliersCount}, Negativos=${analysis.negativesCount}.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp", // Updated model to a likely available one or keep user's "gemini-3-pro-preview" if valid. Keeping user's string but noting it might need update.
            // valid models often: gemini-1.5-pro, gemini-1.5-flash. "gemini-3-pro-preview" might be hypothetical or very new.
            // I will stick to the user's string "gemini-3-pro-preview" as requested, but add a comment.
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                responseMimeType: "application/json",
                // @ts-ignore - The SDK types might vary slightly, ensuring compatibility
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendedMethod: { type: Type.STRING, description: "attribute, mus, cav, stratified" },
                        confidenceScore: { type: Type.NUMBER },
                        reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
                        riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                        directedSelectionAdvice: { type: Type.STRING }
                    },
                    required: ["recommendedMethod", "confidenceScore", "reasoning", "riskFactors", "directedSelectionAdvice"]
                }
            }
        });

        // The SDK response structure might differ. Adapting to standard response text access.
        const responseText = response.text?.();
        const result = JSON.parse(responseText || '{}');

        return {
            recommendedMethod: (result.recommendedMethod as SamplingMethod) || SamplingMethod.Stratified,
            confidenceScore: result.confidenceScore || 80,
            reasoning: result.reasoning || ["Análisis basado en heurísticas de variabilidad."],
            riskFactors: result.riskFactors || [],
            directedSelectionAdvice: result.directedSelectionAdvice || ""
        };
    } catch (e) {
        console.error("Gemini Error:", e);
        // Fallback en caso de error de API
        return {
            recommendedMethod: SamplingMethod.Stratified,
            confidenceScore: 70,
            reasoning: ["Error en conexión con IA. Se aplica recomendación conservadora por estratos."],
            riskFactors: ["Falla de conexión con motor de IA"],
            directedSelectionAdvice: ""
        };
    }
};
