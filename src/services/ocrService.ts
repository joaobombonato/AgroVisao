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

const API_KEY = import.meta.env.VITE_GOOGLE_AI_KEY || "";
console.log("[OCR] API KEY Check:", API_KEY ? "Defined (len: " + API_KEY.length + ")" : "MISSING");

const genAI = new GoogleGenerativeAI(API_KEY);

// Helper para comprimir imagem antes de enviar para a IA
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

                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(e.target?.result?.toString().split(',')[1] || "");
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl.split(',')[1]);
                } catch (err) {
                    console.error("Erro no canvas:", err);
                    // Fallback para original
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
        console.log("[OCR] Iniciando Tesseract...");
        try {
            const { data: { text } } = await Tesseract.recognize(
                imageFile,
                'por', 
                { logger: m => console.log("[Tesseract]", m.status, Math.round(m.progress * 100) + "%") }
            );

            // Limpeza de ruído mas PRESERVA LINHAS para extração de campos
            const cleanText = text
                .replace(/[|~_\[\]]/g, ' ') 
                .replace(/[ ]+/g, ' '); 
            
            console.log("[OCR] Tesseract Output Length:", text.length);

            const fields: OCRResult['fields'] = { produtos: [] };

            // 1. Valor Total
            const totalKeywords = ['TOTAL', 'VALOR', 'V\\.LIQ', 'LIQ', 'PAGAR', 'VLR', 'VALOR A PAGAR'];
            const totalMatch = cleanText.match(new RegExp(`(?:${totalKeywords.join('|')})[^\\d]*R?\\$?\\s*([\\d\\.\\,\\ ]{2,10})`, 'i'));
            if (totalMatch) {
                fields.total = totalMatch[1].trim()
                    .replace(/\s/g, '')
                    .replace(/[^0-9,.]/g, ''); 
            }

            // 2. Data
            const dateMatch = cleanText.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/);
            if (dateMatch) fields.data = dateMatch[1];

            // 3. CNPJ
            const cnpjMatch = cleanText.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/);
            if (cnpjMatch) fields.cnpj = cnpjMatch[0];

            // 4. Chave de Acesso
            const digitsOnly = cleanText.replace(/[^\d]/g, '');
            const chaveMatch = digitsOnly.match(/(\d{44})/);
            if (chaveMatch) fields.chave = chaveMatch[1];

            // 5. Emitente
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            const suffixes = ['LTDA', 'S/A', ' S.A', 'EPP', 'ME ', 'MEI', 'SERVICOS', 'COMERCIO', 'INDUSTRIA'];
            const emitenteWithSuffix = lines.slice(0, 20).find(l => 
                suffixes.some(s => l.toUpperCase().includes(s)) && !l.includes('DANFE')
            );
            if (emitenteWithSuffix) {
                fields.emitente = emitenteWithSuffix.replace(/[:;]/g, '').trim();
            }

            return { rawText: text, source: 'tesseract', fields };
        } catch (error: any) {
            console.error("[OCR] Tesseract Fatal Error:", error);
            throw new Error("Erro no Tesseract: " + (error.message || "Falha local"));
        }
    },

    recognizeIntelligent: async (imageFile: File): Promise<OCRResult> => {
        console.log("[OCR] Iniciando Gemini...");
        if (!API_KEY) throw new Error("Chave Gemini não encontrada no .env");
        
        const tryModel = async (modelName: string) => {
            console.log(`[Gemini] Tentando modelo: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            let base64Content: string;
            try {
                base64Content = await compressImage(imageFile);
                console.log("[Gemini] Imagem comprimida com sucesso.");
            } catch (err) {
                console.warn("[Gemini] Falha na compressão, enviando original...");
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(imageFile);
                });
                base64Content = await base64Promise;
            }

            const prompt = `Analise esta foto de uma Nota Fiscal ou Boleto.
            IMPORTANTE: Extraia apenas dados REAIS presentes na imagem.
            Campos: "emitente", "total", "chave", "data", "cnpj", "produtos" (lista).
            Responda EXCLUSIVAMENTE em formato JSON. Se não achar, use "".`;

            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Content
                    }
                },
                { text: prompt }
            ]);

            const response = await result.response;
            const resText = response.text();
            console.log("[Gemini] Resposta recebida.");
            
            const jsonMatch = resText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : resText;
            
            let fields;
            try {
                fields = JSON.parse(jsonStr);
            } catch (e) {
                console.warn("[Gemini] Falha ao parsear JSON, usando fallback regex.");
                fields = { 
                    emitente: (resText.match(/emitente["\s:]+([^"\n,]+)/i) || [])[1] || "",
                    total: (resText.match(/total["\s:]+([^"\n,]+)/i) || [])[1] || ""
                };
            }

            return { 
                rawText: resText, 
                source: 'gemini' as const, 
                fields: {
                    ...fields,
                    produtos: Array.isArray(fields.produtos) ? fields.produtos : []
                } 
            };
        };

        try {
            return await tryModel("gemini-1.5-flash");
        } catch (error: any) {
            console.error("[Gemini] Flash Error:", error);
            if (error.message?.includes("API_KEY_INVALID")) {
                throw new Error("Chave de API do Google Inválida ou Expirada.");
            }
            console.warn("[Gemini] Tentando Fallback para Pro...");
            try {
                return await tryModel("gemini-1.5-pro");
            } catch (innerError: any) {
                console.error("[Gemini] Pro Error:", innerError);
                throw innerError;
            }
        }
    }
};
