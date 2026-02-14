export default async function handler(req: any, res: any) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responder a OPTIONS (Preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Apenas POST é esperado para pegar o token
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const COPERNICUS_CLIENT_ID = 'sh-11c9ea5e-2705-46e4-8d84-1d2193e18d60';
    const COPERNICUS_CLIENT_SECRET = 'tD32wvcf3ZHU45rNFxeCxrZ4vCipvR1R';
    const TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', COPERNICUS_CLIENT_ID);
    params.append('client_secret', COPERNICUS_CLIENT_SECRET);

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na Copernicus:', response.status, errorText);
        res.status(response.status).json({ error: 'Falha na autenticação Copernicus', details: errorText });
        return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno no servidor de proxy' });
  }
}
