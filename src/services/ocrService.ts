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
const genAI = new GoogleGenerativeAI(API_KEY);

export const ocrService = {
    recognize: async (imageFile: File): Promise<OCRResult> => {
        try {
            const { data: { text } } = await Tesseract.recognize(
                imageFile,
                'por', // Portuguese
                { logger: m => console.log(m) }
            );

            console.log("Tesseract Raw Output:", text);

            const fields: OCRResult['fields'] = { produtos: [] };

            // 1. Valor Total (Mais agressivo)
            const totalKeywords = ['TOTAL', 'VALOR', 'V\\.LIQ', 'LIQ', 'DOC', 'PAGAR', 'VLR', 'NFE', 'NOTA'];
            const totalMatch = text.match(new RegExp(`(?:${totalKeywords.join('|')})[^\\d]*R?\\$?\\s*([\\d\\.\\,\\ ]{2,7})`, 'i'));
            if (totalMatch) {
                // Pega apenas números e o ponto/vírgula decimal
                const valueStr = totalMatch[1].trim()
                    .replace(/\s/g, '')
                    .replace(/[^0-9,.]/g, ''); // Garante limpeza de caracteres estranhos
                fields.total = valueStr;
            }

            // 2. Data
            const dateMatch = text.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/);
            if (dateMatch) fields.data = dateMatch[1];

            // 3. CNPJ / CPF
            const cnpjMatch = text.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/);
            if (cnpjMatch) fields.cnpj = cnpjMatch[0];

            // 4. Chave de Acesso (Processamento especial com faxina de espaços)
            const digitsOnly = text.replace(/[^\d]/g, '');
            const chaveMatch = digitsOnly.match(/(\d{44})/);
            if (chaveMatch) {
                fields.chave = chaveMatch[1];
            } else {
                // Se não achou 44 seguidos, tenta pegar uma sequência longa que pareça chave
                const longSequence = digitsOnly.match(/(\d{20,44})/);
                if (longSequence) fields.chave = longSequence[1];
            }

            // 5. Emitente (Melhorado: busca palavras chave de empresa primeiro)
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            if (lines.length > 0) {
                // Prioridade 1: Linhas que contém suffixes de empresa
                const suffixes = ['LTDA', 'S/A', ' S.A', 'EPP', 'ME ', 'MEI', 'SERVICOS', 'COMERCIO', 'INDUSTRIA'];
                const emitenteWithSuffix = lines.slice(0, 15).find(l => 
                    suffixes.some(s => l.toUpperCase().includes(s)) && !l.includes('DANFE')
                );

                if (emitenteWithSuffix) {
                    fields.emitente = emitenteWithSuffix.replace(/[:;]/g, '').trim();
                } else {
                    // Prioridade 2: Primeira linha em caixa alta que não seja título
                    const possibleEmitente = lines.slice(0, 10).find(l => 
                        !l.includes('DANFE') && 
                        !l.includes('NOTA') && 
                        !l.includes('DOCUMENTO') &&
                        l === l.toUpperCase()
                    );
                    if (possibleEmitente) fields.emitente = possibleEmitente;
                }
            }

            // 6. Produtos
            lines.forEach(line => {
                const upper = line.toUpperCase();
                if (upper.includes('GL') || upper.includes('UN') || upper.includes('KG') || line.match(/^\d{2,3}\s+[A-Z]/)) {
                    fields.produtos?.push(line.trim());
                }
            });

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

            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(imageFile);
            });
            const base64Data = await base64Promise;
            const base64Content = base64Data.split(',')[1];

            const prompt = `Analise esta foto de uma Nota Fiscal (DANFE) ou Boleto. 
            Extraia o máximo de informações possível.
            No campo "total", procure o Valor Total da Nota (número com vírgula).
            No campo "chave", procure a Chave de Acesso de 44 dígitos.
            Extraia os seguintes campos em formato JSON puro:
            {
                "emitente": "nome da empresa",
                "cnpj": "00.000.000/0000-00",
                "data": "DD/MM/AAAA",
                "total": "0,00",
                "chave": "44 digitos",
                "produtos": ["lista de produtos"]
            }
            Responda APENAS o JSON. Se não encontrar um campo, deixe null.`;

            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: imageFile.type,
                        data: base64Content
                    }
                },
                { text: prompt }
            ]);

            const response = await result.response;
            const resText = response.text();
            console.log(`Gemini (${modelName}) Raw Response:`, resText);
            
            const jsonMatch = resText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : resText;
            
            let fields;
            try {
                fields = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Erro ao converter JSON do Gemini:", e, "Texto:", jsonStr);
                // Fallback: se não for JSON, tenta pegar campos via regex ou retorna vazio
                fields = { 
                    emitente: (resText.match(/emitente["\s:]+([^"\n,]+)/i) || [])[1] || null,
                    total: (resText.match(/total["\s:]+([^"\n,]+)/i) || [])[1] || null
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
