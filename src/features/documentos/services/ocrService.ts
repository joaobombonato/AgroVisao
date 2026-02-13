import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface OCRResult {
    rawText: string;
    source: 'tesseract' | 'gemini';
    fields: {
        total?: string;
        dataEmissao?: string;
        cnpjEmitente?: string;
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

const cleanNumericField = (text: string, allowedChars: string): string => {
    const regex = new RegExp(`[^${allowedChars}]`, 'g');
    return text.replace(regex, '');
};

export const ocrService = {
    recognize: async (imageFile: File): Promise<OCRResult> => {
        try {
            const { data: { text } } = await Tesseract.recognize(imageFile, 'por', { logger: m => console.log("[Tesseract]", m.status) });
            const lines = text.split('\n').map(l => l.trim().toUpperCase());
            const fields: OCRResult['fields'] = { produtos: [], vencimentos: [] };

            // Helper to determine if a field is likely "garbage"
            const isGarbage = (raw: string, cleaned: string) => {
                if (!cleaned || cleaned.length < 2) return true;
                // If more than 60% of original chars were removed, it's likely noise
                if (cleaned.length / raw.replace(/\s/g, '').length < 0.4) return true;
                return false;
            };

            // 1. CHAVE DE ACESSO
            let rawChave = text.toUpperCase().replace(/[^0-9OISBZA]/g, '');
            let cleanChave = rawChave
                .replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5')
                .replace(/B/g, '8').replace(/Z/g, '2').replace(/A/g, '4')
                .replace(/[^0-9]/g, '');

            const chaveMatch = cleanChave.match(/(\d{44})/);
            if (chaveMatch) fields.chave = chaveMatch[1];
            else if (cleanChave.length > 10) fields.chave = cleanChave;

            // 2. VALOR TOTAL
            const valorKeywords = ['VALOR TOTAL DA NOTA', 'VALOR TOTAL', 'TOTAL DA NOTA', 'TOTAL', 'LIQUIDO', 'PAGAR', 'VALOR TOTAL DA NF'];
            for (const kw of valorKeywords) {
                const idx = lines.findIndex(l => l.includes(kw));
                if (idx !== -1) {
                    for (let i = idx; i <= idx + 2 && i < lines.length; i++) {
                        const match = lines[i].match(/(?:R\$?\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})/);
                        if (match) {
                            fields.total = match[1].replace(/\./g, '').replace(',', '.').trim();
                            break;
                        }
                        const altMatch = lines[i].match(/(\d{1,6}\.\d{2})/);
                        if (altMatch) {
                            fields.total = altMatch[1].trim();
                            break;
                        }
                    }
                }
                if (fields.total) break;
            }

            // 3. DATA EMISSÃO
            const dataEmissaoKeywords = ['DATA EMISSÃO', 'DATA DE EMISSÃO', 'DATA DA EMISSÃO', 'EMISSAO'];
            for (const kw of dataEmissaoKeywords) {
                const idx = lines.findIndex(l => l.includes(kw));
                if (idx !== -1) {
                    const match = lines[idx].match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/);
                    if (match) { fields.dataEmissao = match[1]; break; }
                }
            }

            // 4. VENCIMENTOS
            text.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/g)?.forEach(d => {
                if (d !== fields.dataEmissao && !fields.vencimentos?.includes(d)) {
                    fields.vencimentos?.push(d);
                }
            });

            // 5. NÚMERO NF
            const nfMatch = text.match(/N[º°].?\s*(\d{3}[\d\.]*)/i);
            if (nfMatch) fields.numeroNF = nfMatch[1].replace(/\D/g, '');

            // 6. EMITENTE E CNPJ
            const cnpjMatch = text.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
            if (cnpjMatch) fields.cnpjEmitente = cnpjMatch[1];

            const emitKeywords = ['RAZÃO SOCIAL', 'IDENTIFICAÇÃO DO EMITENTE', 'EMITENTE'];
            const emitIdx = lines.findIndex(l => emitKeywords.some(kw => l.includes(kw)));
            if (emitIdx !== -1) {
                fields.emitente = lines[emitIdx + 1] || lines[emitIdx];
            } else {
                const suffixes = ['LTDA', 'S/A', ' S.A', 'EPP', 'ME ', 'MEI', 'EMPRESA'];
                fields.emitente = lines.slice(0, 20).find(l => suffixes.some(s => l.includes(s)));
            }

            // Aplicar Filtros Estritos (Shield)
            if (fields.numeroNF) fields.numeroNF = cleanNumericField(fields.numeroNF, '0-9.');
            if (fields.cnpjEmitente) fields.cnpjEmitente = cleanNumericField(fields.cnpjEmitente, '0-9./-');
            if (fields.dataEmissao) fields.dataEmissao = cleanNumericField(fields.dataEmissao, '0-9/');
            if (fields.total) fields.total = cleanNumericField(fields.total, '0-9.');
            if (fields.chave) fields.chave = cleanNumericField(fields.chave, '0-9 ');

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
            {"emitente":"", "cnpjEmitente":"", "numeroNF":"", "dataEmissao":"", "total":"", "chave":"", "vencimentos":[], "produtos":[]}
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
