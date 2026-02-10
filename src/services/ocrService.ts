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

console.log("[OCR] API KEY Check:", API_KEY ? `Defined (starts with ${API_KEY.substring(0, 5)})` : "MISSING");

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

            const cleanText = text.replace(/[|~_\[\]]/g, ' ').replace(/[ ]+/g, ' '); 
            const fields: OCRResult['fields'] = { produtos: [] };

            // 1. Valor Total (Focado em termos de NF)
            const totalPatterns = [
                /VALOR TOTAL DA NOTA[^0-9]*([\d., ]+)/i,
                /VALOR TOTAL[^0-9]*([\d., ]+)/i,
                /TOTAL[^0-9]*([\d., ]+)/i,
                /PAGAR[^0-9]*([\d., ]+)/i
            ];
            
            for (const pattern of totalPatterns) {
                const match = cleanText.match(pattern);
                if (match && match[1]) {
                    const val = match[1].trim().replace(/\s/g, '').replace(/[^0-9,.]/g, '');
                    if (val.length >= 2 && val.includes(',')) {
                        fields.total = val;
                        break;
                    }
                }
            }

            // 2. Data e CNPJ
            const dateMatch = cleanText.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/);
            if (dateMatch) fields.data = dateMatch[1];
            const cnpjMatch = cleanText.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
            if (cnpjMatch) fields.cnpj = cnpjMatch[0];

            // 3. Chave de Acesso (DIFÍCIL: Detecta blocos de números com espaços)
            // A chave de acesso geralmente tem 44 dígitos, muitas vezes separados por espaços
            const potentialChave = text.match(/(\d[\d\s]{40,60}\d)/g);
            if (potentialChave) {
                for (const candidate of potentialChave) {
                    const digits = candidate.replace(/[^\d]/g, '');
                    if (digits.length === 44) {
                        fields.chave = digits;
                        break;
                    }
                }
            }
            if (!fields.chave) {
                const digitsOnly = text.replace(/[^\d]/g, '');
                const chave44 = digitsOnly.match(/(\d{44})/);
                if (chave44) fields.chave = chave44[1];
            }

            // 4. Emitente
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            const suffixes = ['LTDA', 'S/A', ' S.A', 'EPP', 'ME ', 'MEI', 'EMPRESA'];
            fields.emitente = lines.slice(0, 20).find(l => suffixes.some(s => l.toUpperCase().includes(s)));

            return { rawText: text, source: 'tesseract', fields };
        } catch (error: any) {
            throw new Error("Erro no Tesseract local.");
        }
    },

    recognizeIntelligent: async (imageFile: File): Promise<OCRResult> => {
        if (!API_KEY) throw new Error("API Key não encontrada.");
        
        // Tentamos os modelos mais prováveis de estarem ativos em AI Studio
        const MODELS = ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"];

        const tryModel = async (modelName: string) => {
            console.log(`[Gemini] Model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const base64Content = await compressImage(imageFile, 1200);

            const prompt = `Extraia dados desta Nota Fiscal/Boleto. 
            Responda APENAS JSON: {"emitente":"", "total":"", "chave":"", "data":"", "cnpj":""}.
            A chave tem 44 dígitos.`;

            const result = await model.generateContent([
                { inlineData: { mimeType: "image/jpeg", data: base64Content } },
                { text: prompt }
            ]);

            const resText = (await result.response).text();
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
                if (err.message?.includes("API_KEY_INVALID")) break;
            }
        }

        const msg = lastError?.message || "Erro desconhecido";
        throw new Error(`Erro na IA: ${msg}. Chave iniciada em ${API_KEY.substring(0, 5)}...`);
    }
};
