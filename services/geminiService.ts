
import { GoogleGenAI } from "@google/genai";
import { ALL_KEYWORDS, APP_CONFIG } from "../constants";

export const geminiService = {
  /**
   * Protects programming keywords with tags.
   */
  markKeywords: (text: string): string => {
    let result = text;
    // Sort by length descending to match longer keywords first (e.g., 'async await' before 'async')
    const sortedKeywords = [...ALL_KEYWORDS].sort((a, b) => b.length - a.length);
    
    // Using a set of already marked words to avoid double tagging
    const escapedText = result;
    
    // Optimized approach: use a regex for all keywords
    const pattern = new RegExp(`\\b(${sortedKeywords.join('|')})\\b`, 'g');
    return escapedText.replace(pattern, '<PRESERVE>$1</PRESERVE>');
  },

  unmarkKeywords: (text: string): string => {
    // This is used for internal display, not for the prompt result which should have them removed
    return text.replace(/<PRESERVE>(.*?)<\/PRESERVE>/g, '$1');
  },

  /**
   * Main translation call with explicit technical constraints.
   */
  translate: async (text: string, contentType: string = 'desenvolvimento de software'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
Traduza o seguinte texto técnico de ${contentType} para português brasileiro (pt-BR).

REGRAS CRÍTICAS:
1. **PRESERVAÇÃO**: Nunca traduza termos contidos entre <PRESERVE> e </PRESERVE>. No resultado final, remova as tags, mas mantenha o termo idêntico.
2. **CONTEXTO**: Mantenha termos técnicos em inglês se forem o padrão (ex: backend, frontend, commit, merge, workflow, stack).
3. **CÓDIGO**: Se houver blocos de código ou trechos que pareçam sintaxe de programação, mantenha-os intactos.
4. **FORMATO**: Preserve a estrutura de parágrafos e quebras de linha.
5. **ESTILO**: Use um tom profissional, técnico e direto.

TEXTO:
${text}

TRADUÇÃO:
`;

    const response = await ai.models.generateContent({
      model: APP_CONFIG.GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
        topP: 0.8,
      }
    });

    return (response.text || '').trim();
  }
};
