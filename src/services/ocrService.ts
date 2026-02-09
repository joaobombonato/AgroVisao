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
if (!API_KEY) {
    console.error("VITE_GOOGLE_AI_KEY is MISSING in process.env / import.meta.env");
} else {
    console.log("VITE_GOOGLE_AI_KEY is defined (length: " + API_KEY.length + ")");
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Helper para comprimir imagem antes de enviar para a IA
const compressImage = async (file: File, maxWidth: number = 1200): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
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
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
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
                'por', // Portuguese
                { logger: m => console.log(m) }
            );

            // Limpeza de ruído comum do Tesseract
            const cleanText = text
                .replace(/[|~_\[\]]/g, ' ') // Remove caracteres de ruído
                .replace(/\s+/g, ' '); // Normaliza espaços
            
            console.log("Tesseract Clean Output:", cleanText);

            const fields: OCRResult['fields'] = { produtos: [] };

            // 1. Valor Total (Mais agressivo e focado em valores decimais)
            const totalKeywords = ['TOTAL', 'VALOR', 'V\\.LIQ', 'LIQ', 'PAGAR', 'VLR', 'VALOR A PAGAR'];
            const totalMatch = cleanText.match(new RegExp(`(?:${totalKeywords.join('|')})[^\\d]*R?\\$?\\s*([\\d\\.\\,\\ ]{2,10})`, 'i'));
            if (totalMatch) {
                const valueStr = totalMatch[1].trim()
                    .replace(/\s/g, '')
                    .replace(/[^0-9,.]/g, ''); 
                fields.total = valueStr;
            }

            // 2. Data
            const dateMatch = cleanText.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/);
            if (dateMatch) fields.data = dateMatch[1];

            // 3. CNPJ / CPF
            const cnpjMatch = cleanText.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/);
            if (cnpjMatch) fields.cnpj = cnpjMatch[0];

            // 4. Chave de Acesso
            const digitsOnly = cleanText.replace(/[^\d]/g, '');
            const chaveMatch = digitsOnly.match(/(\d{44})/);
            if (chaveMatch) {
                fields.chave = chaveMatch[1];
            }

            // 5. Emitente (Suffixes comuns)
            const lines = cleanText.split('\n').concat(text.split('\n')).map(l => l.trim()).filter(l => l.length > 5);
            const suffixes = ['LTDA', 'S/A', ' S.A', 'EPP', 'ME ', 'MEI', 'SERVICOS', 'COMERCIO', 'INDUSTRIA'];
            const emitenteWithSuffix = lines.slice(0, 20).find(l => 
                suffixes.some(s => l.toUpperCase().includes(s)) && !l.includes('DANFE')
            );
            if (emitenteWithSuffix) {
                fields.emitente = emitenteWithSuffix.replace(/[:;]/g, '').trim();
            }

            return { rawText: text, source: 'tesseract', fields };
        } catch (error) {
            console.error("OCR Error:", error);
            throw new Error("Falha ao processar imagem.");
        }
    },

    recognizeIntelligent: async (imageFile: File): Promise<OCRResult> => {
        if (!API_KEY) throw new Error("API Key do Gemini não configurada.");
        
        const tryModel = async (modelName: string) => {
            console.log(`Tentando Gemini com modelo: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Comprime a imagem para evitar estouro de banda e melhorar performance
            const base64Content = await compressImage(imageFile);

            const prompt = `Analise esta foto de uma Nota Fiscal ou Boleto.
            IMPORTANTE: Extraia apenas dados REAIS presentes na imagem.
            
            Campos específicos:
            1. "emitente": Razão Social da empresa (busque por LTDA, S/A, etc).
            2. "total": O valor final (Ex: "1.234,56"). Nunca invente valores.
            3. "chave": A sequência de 44 dígitos da NFe (se houver).
            4. "data": Data de emissão (DD/MM/AAAA).
            5. "cnpj": O CNPJ do emitente.

            Responda EXCLUSIVAMENTE em formato JSON puro, sem textos extras:
            {
                "emitente": "string",
                "cnpj": "string",
                "data": "string",
                "total": "string",
                "chave": "string",
                "produtos": []
            }
            Se não encontrar algo, deixe "".`;

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
            
            const jsonMatch = resText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : resText;
            
            let fields;
            try {
                fields = JSON.parse(jsonStr);
            } catch (e) {
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
                    produtos: fields.produtos || []
                } 
            };
        };

        try {
            return await tryModel("gemini-1.5-flash");
        } catch (error: any) {
            console.warn("Gemini Flash falhou, tentando Pro:", error);
            try {
                return await tryModel("gemini-1.5-pro");
            } catch (innerError: any) {
                console.error("Gemini Fallback Error:", innerError);
                throw innerError;
            }
        }
    }
};
