import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface OCRResult {
    rawText: string;
    source: 'tesseract' | 'gemini';
    fields: {
        total?: string;
        dataEmissao?: string;
        cnpj?: string;
        chave?: string;
        produtos?: string[];
        emitente?: string;
        numeroNF?: string;
        vencimentos?: string[];
    };
}

const USER_KEY_FALLBACK = "AIzaSyBRRHp4pdro2x4S0Pn8r8tPnlTYMC6cjZk";
const API_KEY = import.meta.env.VITE_GOOGLE_AI_KEY || USER_KEY_FALLBACK;

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
                    if (!ctx) { resolve(e.target?.result?.toString().split(',')[1] || ""); return; }
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
                } catch (err) { resolve(e.target?.result?.toString().split(',')[1] || ""); }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

export const ocrService = {
    recognize: async (imageFile: File): Promise<OCRResult> => {
        try {
            const { data: { text } } = await Tesseract.recognize(imageFile, 'por', { logger: m => console.log("[Tesseract]", m.status) });
            const lines = text.split('\n').map(l => l.trim().toUpperCase());
            const fields: OCRResult['fields'] = { produtos: [], vencimentos: [] };

            // 1. CHAVE DE ACESSO (EXATAMENTE 44 DÍGITOS)
            const allDigits = text.replace(/[^\d]/g, '');
            const chaveMatch = allDigits.match(/(\d{44})/);
            if (chaveMatch) {
                fields.chave = chaveMatch[1];
            } else {
                // Tenta reconstruir se houver espaços entre blocos de 4
                const blocks = text.match(/\d{4}\s\d{4}\s\d{4}/g);
                if (blocks) {
                    const merged = text.replace(/[^\d]/g, '').match(/(\d{44})/);
                    if (merged) fields.chave = merged[1];
                }
            }

            // 2. VALOR TOTAL
            const valorKeywords = ['VALOR TOTAL DA NOTA', 'VALOR TOTAL', 'TOTAL DA NOTA', 'TOTAL', 'LIQUIDO', 'PAGAR'];
            for (const kw of valorKeywords) {
                const idx = lines.findIndex(l => l.includes(kw));
                if (idx !== -1) {
                    for (let i = idx; i <= idx + 2 && i < lines.length; i++) {
                        const match = lines[i].match(/(\d{1,6}[\.,]\d{2})/);
                        if (match) {
                            fields.total = match[1].replace(/\./g, '').replace(',', '.').trim();
                            break;
                        }
                    }
                }
                if (fields.total) break;
            }

            // 3. DATA EMISSÃO (Contextual)
            const dataEmissaoKeywords = ['DATA EMISSÃO', 'DATA DE EMISSÃO', 'DATA DA EMISSÃO', 'EMISSAO'];
            for (const kw of dataEmissaoKeywords) {
                const idx = lines.findIndex(l => l.includes(kw));
                if (idx !== -1) {
                    const match = lines[idx].match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/);
                    if (match) { fields.dataEmissao = match[1]; break; }
                }
            }

            // 4. VENCIMENTOS
            const vencKeywords = ['VENCIMENTO', 'VENC', 'DUPLICATA'];
            text.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/g)?.forEach(d => {
                if (d !== fields.dataEmissao && !fields.vencimentos?.includes(d)) {
                    fields.vencimentos?.push(d);
                }
            });

            // 5. NÚMERO NF
            const nfMatch = text.match(/N[º°].?\s*(\d{3}[\d\.]*)/i);
            if (nfMatch) fields.numeroNF = nfMatch[1].replace(/\D/g, '');

            // 6. EMITENTE
            const emitKeywords = ['RAZÃO SOCIAL', 'IDENTIFICAÇÃO DO EMITENTE', 'EMITENTE'];
            const emitIdx = lines.findIndex(l => emitKeywords.some(kw => l.includes(kw)));
            if (emitIdx !== -1) {
                fields.emitente = lines[emitIdx + 1] || lines[emitIdx];
            } else {
                const suffixes = ['LTDA', 'S/A', ' S.A', 'EPP', 'ME ', 'MEI', 'EMPRESA'];
                fields.emitente = lines.slice(0, 20).find(l => suffixes.some(s => l.includes(s)));
            }

            return { rawText: text, source: 'tesseract', fields };
        } catch (error: any) {
            throw new Error("Erro no Tesseract local.");
        }
    },

    recognizeIntelligent: async (imageFile: File): Promise<OCRResult> => {
        const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];
        const tryModel = async (modelName: string) => {
            const model = genAI.getGenerativeModel({ model: modelName });
            const base64Content = await compressImage(imageFile, 1024);
            const prompt = `Extraia os dados desta Nota Fiscal. Responda APENAS JSON:
            {"emitente":"", "numeroNF":"", "dataEmissao":"", "total":"", "chave":"", "vencimentos":[], "produtos":[]}
            Total deve ser número decimal. A chave tem 44 dígitos.`;
            const result = await model.generateContent([{ inlineData: { mimeType: "image/jpeg", data: base64Content } }, { text: prompt }]);
            const resText = (await result.response).text();
            const fields = JSON.parse(resText.match(/\{[\s\S]*\}/)?.[0] || resText);
            return { rawText: resText, source: 'gemini' as const, fields };
        };
        let lastError: any = null;
        for (const model of MODELS) {
            try { return await tryModel(model); } catch (err: any) { lastError = err; }
        }
        throw new Error(`Erro na IA: ${lastError?.message || "Falha"}`);
    }
};
