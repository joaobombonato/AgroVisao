import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface OCRResult {
    rawText: string;
    source: 'tesseract' | 'gemini';
    fields: {
        total?: string;
        data?: string;
        cnpj?: string;
        chave?: string;
        produtos?: string[];
        emitente?: string;
    };
}

// Chave fornecida pelo usuario para fallback caso o .env falhe no deploy
const USER_KEY_FALLBACK = "AIzaSyBRRHp4pdro2x4S0Pn8r8tPnlTYMC6cjZk";
const API_KEY = import.meta.env.VITE_GOOGLE_AI_KEY || USER_KEY_FALLBACK;

console.log("[OCR] SDK Init. Key:", API_KEY ? `(starts with ${API_KEY.substring(0, 5)})` : "MISSING");

const genAI = new GoogleGenerativeAI(API_KEY);

const compressImage = async (file: File, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Falha ao ler arquivo da imagem"));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Falha ao carregar imagem para compressão"));
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const scale = Math.min(1, maxWidth / width);
                    width *= scale;
                    height *= scale;

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(e.target?.result?.toString().split(',')[1] || "");
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
                } catch (err) {
                    resolve(e.target?.result?.toString().split(',')[1] || "");
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

export const ocrService = {
    recognize: async (imageFile: File): Promise<OCRResult> => {
        try {
            const { data: { text } } = await Tesseract.recognize(
                imageFile,
                'por', 
                { logger: m => console.log("[Tesseract]", m.status) }
            );

            // Preservamos as linhas para análise de contexto
            const lines = text.split('\n').map(l => l.trim().toUpperCase());
            const fields: OCRResult['fields'] = { produtos: [] };

            console.log("[OCR] Tesseract Lines Count:", lines.length);

            // 1. CHAVE DE ACESSO (Prioridade 44 dígitos)
            // Procuramos a linha que contém "CHAVE DE ACESSO" e o número nela ou abaixo
            const chaveKeywordIndex = lines.findIndex(l => l.includes('CHAVE DE ACESSO') || l.includes('CHAVE DE AC'));
            if (chaveKeywordIndex !== -1) {
                // Tenta na mesma linha ou nas 2 próximas
                for (let i = chaveKeywordIndex; i <= chaveKeywordIndex + 2 && i < lines.length; i++) {
                    const digits = lines[i].replace(/[^\d]/g, '');
                    if (digits.length === 44) {
                        fields.chave = digits;
                        break;
                    }
                }
            }
            if (!fields.chave) {
                // Fallback global mas SEM concatenar aleatoriamente
                const allDigits = text.replace(/[^\d]/g, '');
                const chaveMatch = allDigits.match(/(\d{44})/);
                if (chaveMatch) fields.chave = chaveMatch[1];
            }

            // 2. VALOR TOTAL (Busca contextual)
            const valorKeywords = ['VALOR TOTAL DA NOTA', 'VALOR TOTAL', 'TOTAL DA NOTA', 'TOTAL', 'LIQUIDO', 'PAGAR'];
            for (const kw of valorKeywords) {
                const idx = lines.findIndex(l => l.includes(kw));
                if (idx !== -1) {
                    // Busca um padrão de decimal (ex: 326,00) na linha ou na próxima
                    for (let i = idx; i <= idx + 1 && i < lines.length; i++) {
                        const match = lines[i].match(/(\d{1,6}[\.,]\d{2})/);
                        if (match) {
                            fields.total = match[1].replace(/\./g, '').replace(',', '.').trim();
                            break;
                        }
                    }
                }
                if (fields.total) break;
            }

            // 3. DATA EMISSÃO (Prioridade sobre vencimento)
            const dataKeywords = ['DATA EMISSÃO', 'DATA DE EMISSÃO', 'DATA EMISSAO', 'EMISSAO'];
            for (const kw of dataKeywords) {
                const idx = lines.findIndex(l => l.includes(kw));
                if (idx !== -1) {
                    const match = lines[idx].match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/);
                    if (match) {
                        fields.data = match[1];
                        break;
                    }
                }
            }
            if (!fields.data) {
                // Fallback primeira data encontrada
                const firstDate = text.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/);
                if (firstDate) fields.data = firstDate[1];
            }

            // 4. CNPJ
            const cnpjMatch = text.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
            if (cnpjMatch) fields.cnpj = cnpjMatch[0];

            // 5. Emitente (Primeiras linhas com LTDA/SA)
            const suffixes = ['LTDA', 'S/A', ' S.A', 'EPP', 'ME ', 'MEI', 'EMPRESA'];
            fields.emitente = lines.slice(0, 15).find(l => suffixes.some(s => l.includes(s)));

            return { rawText: text, source: 'tesseract', fields };
        } catch (error: any) {
            console.error("[OCR] Erro Tesseract:", error);
            throw new Error("Erro no Tesseract local.");
        }
    },

    recognizeIntelligent: async (imageFile: File): Promise<OCRResult> => {
        if (!API_KEY) throw new Error("API Key não encontrada.");
        
        // Tentativa de contornar erro 404 (tentando o modelo mais padrão possível)
        // O erro 404 para gemini-1.5-flash no v1beta pode indicar que o SDK está pedindo algo errado ou o modelo não existe nesse endpoint.
        const MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];

        const tryModel = async (modelName: string) => {
            console.log(`[Gemini] Tentando: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            // Comprimimos mais para garantir que não seja erro de payload
            const base64Content = await compressImage(imageFile, 1024);

            const prompt = `Extraia dados desta Nota Fiscal. 
            Responda APENAS JSON: {"emitente":"", "total":"", "chave":"", "data":"", "cnpj":""}.
            Total deve ser número com ponto decimal. 
            A chave tem 44 dígitos.`;

            // Tentativa manual de ver se v1 funciona (o SDK infelizmente abstrai o endpoint)
            const result = await model.generateContent([
                { inlineData: { mimeType: "image/jpeg", data: base64Content } },
                { text: prompt }
            ]);

            const response = await result.response;
            const resText = response.text();
            
            const jsonStr = resText.match(/\{[\s\S]*\}/)?.[0] || resText;
            const fields = JSON.parse(jsonStr);

            return { 
                rawText: resText, 
                source: 'gemini' as const, 
                fields: { ...fields, produtos: [] } 
            };
        };

        let lastError: any = null;
        for (const model of MODELS) {
            try {
                return await tryModel(model);
            } catch (err: any) {
                console.warn(`Falha no ${model}:`, err.message);
                lastError = err;
            }
        }

        throw new Error(`Erro na IA: ${lastError?.message || "Erro desconhecido"}.`);
    }
};
