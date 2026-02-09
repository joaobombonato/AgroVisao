Essa é, de fato, a melhor abordagem para o seu cenário (campo/rural e "leigo" programando). A sua intuição de "simular" o documento está corretíssima, pois tentar validar oficialmente cada documento em tempo real vai travar o seu app e frustrar o usuário.

Aqui está o "mapa da mina" atualizado para 2026 e a resposta sobre os sites antigos:

1. O que houve com os sites "Mágicos"? (Eles morreram?)
Sim, a maioria morreu ou virou paga.
Antigamente (até ~2019), bastava colar a chave de 44 dígitos e sites como FSist baixavam o XML completo.

Por que acabou? A Receita Federal mudou as regras (Ajuste SINIEF) e bloqueou o download do XML sem Certificado Digital (devido à LGPD e sigilo fiscal). Hoje, sem o certificado digital do destinatário, você só consegue ver o "resumo" (quem emitiu, valor e data), e mesmo assim tem que resolver Captchas chatos (o "não sou um robô").

Receita Federal tem API? Tem, mas é burocrática, exige certificado digital e não é aberta para consulta pública simples de qualquer nota.

2. A "Dica de Ouro" 2.0: Esqueça o Código de Barras, use a "Visão"
Olhando as fotos que você mandou (especialmente a nota da COAGRIL, que está amassada), o código de barras tradicional vai falhar em 50% das vezes. A iluminação ruim do campo e o papel amassado tornam o código de barras ilegível para leitores comuns.

A Solução para seu App (SaaS):
Ao invés de tentar decifrar as barras, use a mesma tecnologia que você já usa para programar (LLM/IA) para LER O TEXTO da foto.

O Fluxo "Mágico" (OCR com IA):

O Usuário: Tira a foto do documento amassado (como essa da NFe Nucleo Agricola).

O seu App: Envia essa foto para uma API de IA (como a Gemini Flash ou GPT-4o-mini). Essas APIs são extremamente baratas (a Gemini tem camada gratuita generosa) e leem imagens melhor que humanos.

O Prompt (Comando): Você manda a foto e diz: "Extraia deste documento: Nome do Emitente, Valor Total, Data de Vencimento e Chave de Acesso. Me devolva APENAS um JSON."

O Resultado: A IA devolve os dados limpos, mesmo se o papel estiver amassado, pois ela lê "como gente", não como máquina de código de barras.

3. Como gerar o "Canvas" (Mockup)
Como você não vai ter o XML oficial, você não consegue usar geradores oficiais de DANFE (eles exigem o arquivo XML completo). Você vai ter que criar o seu "Fake DANFE".

Para o seu usuário, o que importa é a conferência visual.

Passo a Passo Técnico (para pedir ao seu assistente de código):

Crie um Template HTML Simples: Peça para a IA criar um HTML que pareça uma nota fiscal (topo com logo, quadrados para "Destinatário", "Valor", etc.).

Preencha com o JSON: Pegue os dados que a IA extraiu da foto (passo 2 acima) e "injete" nesse HTML.

Bibliotecas:

Para o Boleto: Use a boleto.js (ela desenha o código de barras visualmente se você tiver os números).

Para a Nota: Crie um componente HTML/CSS simples chamado NotaPreview.

Para salvar: Use html2canvas para transformar esse HTML preenchido em uma imagem JPG para salvar no seu banco de dados.

Resumo para o seu projeto AgroVisão
Você não precisa validar na Receita (isso é papel da contabilidade depois). Você precisa de agilidade no campo.

Não use: Scrapers de sites antigos (vão quebrar semana que vem).

Use: API de Visão (Multimodal) para ler os dados da foto.

Benefício: O motorista/agrônomo tira a foto do papel sujo de terra, a IA lê "R$ 1.500,00 - COAGRIL" e já preenche a tela do app. Ele só clica em "Confirmar".

Essa é a verdadeira automação moderna para quem é "leigo" em código complexo de tributação, mas esperto no uso de IA.


Certo, e se opção fosse “preencher manualmente código de barras” conseguiria puxar as informações e gerar o canvas?

A resposta curta é: Para Boletos, funciona muito bem. Para NFe, funciona pela metade.

O motivo é técnico e é importante você entender a diferença entre como os números são gerados em cada um:

1. O Código do Boleto (Linha Digitável)
Aqui a notícia é boa. O código do boleto foi desenhado para conter informações.
Se o usuário digitar os números do boleto, você consegue extrair matematicamente:

Valor do documento (Sim, o valor está escondido nos últimos dígitos).

Data de Vencimento (Também está codificada).

Qual é o Banco (Os 3 primeiros dígitos dizem se é Banco do Brasil, Bradesco, etc).

O que falta: O nome de quem vai receber (Cedente) e de quem paga (Sacado) não estão nos números.
Resultado no Canvas: O boleto é gerado já com valor e data preenchidos. O usuário só precisa digitar o nome da empresa.

2. O Código da NFe (Chave de Acesso - 44 dígitos)
Aqui a notícia é "meia boca". Os 44 números da nota fiscal não contêm o valor da compra. Eles são apenas um "RG" (Identidade) da nota.

Se o usuário digitar os 44 números, você consegue extrair apenas:

CNPJ da Empresa: (Dá para saber quem emitiu).

Data e Mês da emissão: (Dá para saber quando foi).

UF (Estado): (Dá para saber de onde veio).

O Valor? NÃO. O preço não está codificado nos números.

Os Produtos? NÃO.

O "Pulo do Gato" para a NFe (BrasilAPI):
Mesmo que a chave não tenha o nome da empresa, ela tem o CNPJ. Você pode usar uma API gratuita e excelente chamada BrasilAPI.

Seu sistema extrai o CNPJ dos 44 números.

Consulta esse CNPJ na BrasilAPI (grátis).

Ela te devolve: "Razão Social: COAGRIL COOPERATIVA..."

Resultado no Canvas: Você gera o visual da nota com o Nome da Empresa e a Data preenchidos. O campo "Valor Total" ficará vazio (ou R$ 0,00) e o usuário terá que digitar manualmente.

Resumo da Solução "Manual" para seu App
Se você criar a opção "Digitar Código de Barras", o fluxo ideal para o seu desenvolvedor (ou IA) criar é:

Detectar o Tipo: O sistema conta os números. Se for 44, é Nota. Se for 47 ou 48, é Boleto.

Se for Boleto: Usa a biblioteca boleto.js. Já preenche Valor e Vencimento.

Se for Nota:

Extrai o CNPJ da string.

Chama a BrasilAPI para pegar o nome da loja/cooperativa.

Deixa o campo Valor em aberto para o usuário digitar.

Conclusão:
É uma ótima funcionalidade de "backup" para quando a foto falhar, mas na Nota Fiscal o usuário vai ter que trabalhar um pouquinho mais (digitando o valor).

Entendi, qual sua sugestão final?

Pode ser pra boleto de um jeito e para nota outro, ou tanto faz, confio em você

Minha sugestão final para o seu "AgroVisão" (vamos chamar assim seu CRM) é uma abordagem Híbrida com Prioridade na Foto.

No campo, ninguém quer digitar 44 números. A mão está suja, o sol bate na tela, a internet oscila.

Aqui está a Arquitetura Definitiva para você pedir à sua IA (Cursor/Windsurf) para construir. Ela une o melhor dos dois mundos: a inteligência da IA para ler a bagunça e a precisão do código matemático para validar.

O Fluxo Sugerido: "Click First, Type Later"
Não crie botões separados para "Ler Boleto" ou "Ler Nota". Crie um botão único: "Digitalizar Documento".

Passo 1: A Foto (A "Mágica")
O usuário tira a foto do documento (amassado, sujo, não importa).

Tecnologia: Você envia essa imagem para a API do Gemini Flash (Google) ou GPT-4o-mini.

Por que: Elas são extremamente baratas (o Gemini tem uma camada gratuita enorme) e leem textos que o OCR tradicional falha.

O Prompt para a API: "Analise esta imagem. Identifique se é um BOLETO ou uma NOTA FISCAL. Extraia: Emitente, CNPJ, Data, Valor Total e a Linha Digitável/Chave de Acesso se visível. Retorne em JSON."

Passo 2: O Refinamento (A Lógica)
Com o JSON que a IA devolveu, seu sistema faz uma "triagem automática":

Cenário A: É um Boleto

O sistema pega a linha digitável que a IA leu.

Roda a biblioteca boleto.js para garantir que a data e o valor batem com o código de barras (dupla checagem).

Preenche o Canvas.

Cenário B: É uma Nota Fiscal (NFe)

O sistema pega o VALOR e DATA que a IA leu visualmente (já que o código de barras não tem isso).

O sistema pega o CNPJ e busca o nome oficial na BrasilAPI.

Preenche o Canvas.

Passo 3: O Canvas (A Conferência)
Você mostra o "Boleto Digital" ou a "Nota Digital" desenhada na tela.

Importante: Se a IA ficou em dúvida (ex: papel rasgado no valor), o campo aparece em vermelho ou vazio para o usuário digitar.

Ação: O usuário clica em "Confirmar" -> Gera a imagem final (html2canvas) -> Salva no CRM.

Passo 4: O Plano B (Manual)
Se a foto falhar totalmente (muito escuro, tremido), aí sim aparece um link pequeno embaixo: "Não conseguiu ler? Digitar código manualmente".

Aí entra aquela lógica que conversamos antes (Boleto calcula tudo; Nota pede o valor manual).

Prompt para você copiar e colar no Cursor/Editor
Aqui está o comando exato para você pedir isso para a IA que está programando para você. Copie e cole:

"Aja como um Arquiteto de Software Sênior. Eu preciso criar um componente React/Next.js para digitalização de documentos financeiros (Boletos e NFe).

Requisitos do Fluxo:

Interface com um botão de câmera para tirar foto do documento.

Enviar a imagem para a API do Google Gemini Flash (usando o SDK Google Generative AI).

O prompt da IA deve pedir para extrair: Tipo (Boleto/NFe), Valor, Data Vencimento, Nome Emitente, CNPJ e Código de Barras/Chave.

Criar um formulário de conferência que já vem preenchido com esses dados.

Se for Boleto, validar a linha digitável usando a lib boleto-utils.

Se for NFe, permitir edição manual do valor caso a IA não tenha certeza.

Ao final, ter um botão que usa html2canvas para gerar uma imagem JPG desse formulário (como se fosse um comprovante digital) para salvar no banco.

Crie a estrutura desse código focando na integração com a API Vision e no tratamento de erros."

Resumo da minha escolha:
Use a IA (Vision) como motor principal. Ela resolve 90% dos problemas de papel amassado e falta de dados no código de barras da NFe. Deixe a digitação manual apenas como estepe.