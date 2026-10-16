# Manual de Regras do Sistema: Tudo o que Rege o Mestre Gerador v3.0

Este documento consolida **todas as regras, restrições visuais, guardrails de inteligência artificial e convenções arquiteturais** que governam o projeto de ponta a ponta.

> [!NOTE]
> Os limites numéricos de contagem de palavras, limites de caracteres e timeouts são hipóteses calibráveis centralizadas no código. Para consultar os valores vigentes, **ver constantes em `backend/app/services/gemini.py`**.

---

## 1. Regras de Negócio e Neurovendas (Lógica Tech Lemonade)

### 1.1. Regra da Ambiguidade Ativa (Zero Presunção)
* **Condição**: Se o usuário enviar apenas a foto de um produto sem contexto claro, ou se o produto possuir múltiplos ângulos/usos possíveis (ex: produto genérico, blusa preta, suporte comum) e a dor principal não for óbvia.
* **Comportamento**: A IA **não pode presumir** nem gerar um roteiro genérico. Deve ativar `status: 'needs_clarification'`, gerando de 1 a 2 perguntas diagnósticas com 3 opções cada, mantendo os campos de roteiro como `null`.
* **Bypass de Força**: Se o usuário fornecer contexto claro, já tiver respondido às perguntas, ou selecionar **"Geração Direta (Sem Perguntas)"** (`force_generation=True`), o filtro é ignorado e o roteiro gerado imediatamente com a melhor suposição mercadológica.

### 1.2. Regra da Tríade de Ganchos (A/B/C)
Todo roteiro completo deve gerar **obrigatoriamente 3 variações de gancho para o bloco inicial (0-3s)**:
1. **Gancho A - Dor/Problema**: Ataca a fricção cotidiana imediata ou o desconforto que o produto resolve.
2. **Gancho B - Curiosidade/Segredo**: Desperta curiosidade com uma revelação inusitada ou detalhe oculto.
3. **Gancho C - Quebra de Padrão**: Interrupção de padrão extrema (visual e auditiva) para reter quem rola o feed rapidamente.

### 1.3. Regra de Zero Alucinações Factuais
* **Restrição**: Toda afirmação de benefício na locução deve se originar **estritamente das informações comprovadas** no anúncio ou fornecidas pelo usuário no campo de contexto.
* **Proibições Expressas**: Proibido inventar métricas ou especificações não citadas (ex: *"ampola térmica de vidro duplo"*, *"conserva por 24 horas"*, *"aço cirúrgico 316"*, *"frete grátis"* ou garantia inexistente).
* **Solução Neutra**: Caso falte informação técnica específica, o modelo deve usar frases neutras e verdadeiras focadas no acabamento, elegância, ergonomia ou praticidade de uso visível.

---

## 2. Regras de Cadência da Locução (Vídeo de 10s no Veo)

A narração em português deve sincronizar milimetricamente com a duração máxima de 10 segundos do Google Veo, respeitando a cadência natural de fala humana ($\sim 2.5\text{ palavras por segundo}$).

### 2.1. Limites por Bloco e Totais
As regras são validadas de forma **híbrida (palavras e caracteres com espaços)**:

| Bloco | Janela Temporal | Limite de Palavras | Limite de Caracteres (com espaços) | Objetivo do Bloco |
| :--- | :---: | :---: | :---: | :--- |
| **Gancho** (A, B e C) | 0 a 3s | *(ver constantes em `backend/app/services/gemini.py`)* | *(ver constantes em `backend/app/services/gemini.py`)* | Interrupção imediata do scroll |
| **Benefício** | 3 a 7s | *(ver constantes em `backend/app/services/gemini.py`)* | *(ver constantes em `backend/app/services/gemini.py`)* | Demonstração do diferencial real |
| **CTA** | 7 a 10s | *(ver constantes em `backend/app/services/gemini.py`)* | *(ver constantes em `backend/app/services/gemini.py`)* | Chamada direta para o carrinho |
| **TOTAL SOMADO** | **10 segundos** | *(ver constantes em `backend/app/services/gemini.py`)* | *(ver constantes em `backend/app/services/gemini.py`)* | Cadência fluida sem atropelo |

### 2.2. Regra da Contagem em Código (Backend Authority)
* **Regra**: O modelo de IA **nunca** calcula as contagens de palavras ou caracteres. Modelos de linguagem falham frequentemente em contagens exatas.
* **Execução**: O backend em Python calcula deterministicamente `len(fala.strip().split())` e `len(fala.strip())` para cada um dos 3 ganchos, para o benefício, para o CTA e para a locução somada ativa.

---

## 3. Diretrizes de Renderização Visual no Google Veo (Veo3)

### 3.1. Regra de Movimento Extremo (Ação em 0-3s)
* **Proibição Absoluta**: É terminantemente proibido qualquer produto estático, parado ou o uso de verbos passivos e lentos (*"slowly rotating"*, *"panning"*, *"slow pan"*, *"static camera"*, *"slow motion"*).
* **Obrigatoriedade**: A IA deve descrever **ação física brusca, dinâmica e imediata** já no primeiro frame (ex: *"Fast, dynamic motion: hands quickly unfolding..."*, *"suddenly picking up the product firmly..."*, *"dynamic POV shot as hands rapidly reveal..."*).
* **Interação Tátil POV**: Proibido segurar smartphones; usar sempre primeira pessoa POV das mãos interagindo diretamente com o produto físico.

### 3.2. Regra de Anchor Prompts Espaciais (Combate a Alucinações)
Para evitar que partes do produto flutuem soltas, se desconectem ou mudem de forma durante os 10 segundos:
* **Descrição Rígida das Conexões**: Toda descrição de produto deve detalhar como as partes estão fisicamente presas (ex: *"metal blades firmly anchored to the bottom motor base"*, *"curved handle securely fixed to the lateral body"*, *"lid resting tightly sealed on the threaded top rim"*).
* **Cláusula de Gravidade Realista**: `"all product parts firmly anchored with rigid physical connections and realistic gravity, no floating parts, no morphing structures"`.

### 3.3. Repetição Obrigatória de Ancoragem na Cena 3 (7-10s)
* No bloco do Hero Shot final (`bloco_cta_visual`), a IA **deve obrigatoriamente repetir a ancoragem estrutural** das partes descritas no início. Isso impede o corte final do Veo de renderizar componentes soltos ou flutuando.

### 3.4. Regra de Fuga de Propriedade Intelectual (Blocos 3-7s e 7-10s)
* **Proibição**: A descrição visual **nunca deve mencionar** logotipos, marcas registradas, escudos de times ou painéis tipográficos.
* **O que Descrever**: Focar 100% na **textura pura do material** (*"breathable woven fabric"*, *"matte brushed stainless steel"*, *"textured silicone grip"*), na cor e na anatomia funcional.
* **Por que essa regra existe?** O Veo3 está configurado para não renderizar letras; tentar forçar logos faz o gerador de vídeo derreter o material e renderizar borrões plásticos disformes.

### 3.5. Blindagem Anti-UI e Anti-Telas
* É estritamente proibido incluir qualquer imagem de celular, telas de aplicativo da Shopee, botões de interface gráfica (botão de compra falso) ou elementos de aplicativo móvel.
* O vídeo deve parecer um **comercial limpo de produto físico real**, em bancada minimalista, com iluminação de estúdio comercial.

### 3.6. Diretiva Auditiva e de Legendas Chumbada no Cabeçalho
Todo prompt de vídeo do Veo gerado pelo sistema embute a cláusula negativa no cabeçalho e em cada fala:
```text
"no subtitles, no on-screen text, no background music, no other voices, no text, no letters, no words"
```
Evita que o Veo insira legendas automáticas em inglês na imagem ou misture trilhas musicais estranhas por cima da locução em português.

---

## 4. Regras dos Campos de Postagem (Shopee & TikTok Shop)

Todo roteiro completo (`status: 'completed'`) gera obrigatoriamente os dados de publicação:

### 4.1. `titulo_seo` (Título Otimizado para Busca)
* **Se o usuário colou `termos_autocomplete`**: O modelo **deve usar SOMENTE e ESTRITAMENTE** as palavras e termos fornecidos. É proibido inventar palavras-chave ou marcas fictícias que não estejam no autocomplete.
* **Se o campo estiver vazio**: Gerar um título simples, limpo e descritivo do produto sem invenções.

### 4.2. `legenda_na_tela` (Gancho Visual / Sticker)
* **Teto Rígido**: **No máximo 5 palavras** (`len(legenda.split()) <= 5`).
* **Finalidade**: Texto curto de alto impacto para ser usado como texto sobreposto/sticker no início do Reels/TikTok/Shopee Vídeo (ex: *"Olha o que achei!"*, *"Isso resolve seu problema"*, *"Você precisa ver isso"*).

### 4.3. `hashtags` (Marcação de Nicho e Regulatória)
* **Lista**: 4 a 6 hashtags relevantes para o nicho do produto.
* **Regra Obrigatória**: A **última hashtag da lista deve ser sempre `#publicidade`** (em conformidade com as diretrizes do CONAR, Shopee Afiliados e TikTok Shop).
* O backend normaliza e valida essa tag estritamente.

---

## 5. Regras de Validação, Retries e Resiliência da API

### 5.1. Validador Automático no Backend
Antes de qualquer resposta ser devolvida ao cliente, o backend executa `validar_e_contar_palavras`:
1. Testa todos os tetos de palavras por bloco e total *(ver constantes em `backend/app/services/gemini.py`)*.
2. Testa todos os tetos de caracteres por bloco e total *(ver constantes em `backend/app/services/gemini.py`)*.
3. Testa se `len(legenda_na_tela.split()) <= 5`.
4. Testa se `hashtags[-1].lower() == "#publicidade"`.

### 5.2. Regra de 1 Retry Corretivo sem Loop
* Se qualquer validação falhar:
  - O backend **não devolve erro imediatamente** ao usuário.
  - Monta uma instrução corretiva contendo a lista exata dos erros cometidos e dispara **exatamente 1 tentativa corretiva (retry)** para o modelo Gemini.
* Se a segunda resposta ainda violar as regras:
  - O sistema aborta e retorna erro `HTTP 422 Unprocessable Entity` com mensagem descritiva.
  - **Proibido loop infinito**: o teto de retry é cravado em 1 chamada corretiva por modelo.

### 5.3. Sincronia de Timeouts (Prevenção de Timeout Fantasma)
* **Timeout do Frontend**: O React aborta requisições após 60 segundos.
* **Timeout do Backend**: A API FastAPI impõe um teto estrito *(ver constantes em `backend/app/services/gemini.py`)*.
* **Regra**: O backend deve desistir e interromper a conexão antes que o frontend corte. O tempo consumido na primeira chamada é abatido do saldo do retry:
  $$\text{tempo\_restante\_retry} = \text{timeout\_total} - \text{tempo\_decorrido}$$
  Se o tempo restante for $\le 2$ segundos, o sistema aborta com `HTTP 504 Gateway Timeout` em vez de gastar cota em vão.

### 5.4. Cascata de Fallback de Modelos de IA
O sistema tenta os modelos na ordem de prioridade definida em `FALLBACK_MODELS` *(ver constantes em `backend/app/services/gemini.py`)*:
1. Modelo primário de alta velocidade e cota gratuita generosa.
2. Modelo secundário leve e estável.
3. Modelo default de alta precisão.
* **Regra de Falha de Cota**: Se qualquer modelo retornar erro `429`, `RESOURCE_EXHAUSTED` ou `503`, o sistema salta automaticamente para o próximo sem interromper a experiência do usuário.

---

## 6. Regras Arquiteturais e de Frontend

### 6.1. Montagem Determinística por Código
* O modelo de IA **nunca** devolve o `prompt_veo` pronto como texto único.
* O modelo devolve os campos modulares (`ScriptPartes` e `MultipleHooks`).
* A montagem do cabeçalho, anti-UI e blocos com tempos chumbados `[0-3s]`, `[3-7s]`, `[7-10s]` é feita exclusivamente por **código Python no backend e TypeScript no frontend**.

### 6.2. Troca de Gancho com Zero Latência
* Ao clicar nos botões de alternância de gancho (Dor, Curiosidade ou Quebra de Padrão) no frontend, o prompt do Veo e a locução textual são **remontados instantaneamente no cliente**.
* **Regra**: Não disparar nova requisição de rede para trocar de gancho.

### 6.3. Compressão de Mídia no Navegador
* Antes de enviar imagens em base64 pela rede:
  - O cliente carrega as fotos em um elemento `<canvas>`.
  - Redimensiona proporcionalmente para no máximo 1280px.
  - Converte em JPEG com qualidade 85%.
* **Regra**: Reduzir tráfego e latência, mantendo nitidez visual suficiente para a visão computacional do Gemini.

### 6.4. Retrocompatibilidade Inviolável do Histórico
* Entradas antigas armazenadas no `localStorage` sob o formato legado de 3 cenas (geradas antes da versão Veo3) **não podem quebrar a tela**.
* O frontend detecta registros legados através de `result.scenes` e renderiza a tabela de 3 cenas apropriada quando não houver `prompt_veo`.

---

## 7. Módulo Utilitário de Pós-Produção ([`montador.py`](../montador.py)) *(Legado)*

> [!WARNING]
> **Utilitário Legado**: O `montador.py` foi concebido para o formato anterior com 3 clipes separados. No fluxo padrão atual do Mestre Gerador v3.0, o Veo gera **1 clipe único contínuo de 10s** com locução embutida, tornando a montagem externa desnecessária para a maioria dos casos.

Quando o usuário optar pela montagem legada com 3 clipes:
1. **Formato do Vídeo**: Proporção 9:16 vertical, resolução exata $1080\times 1920$ pixels, taxa de quadros uniforme em $30\text{ fps}$, codec `libx264`.
2. **Formato do Áudio TTS**: Modelo `gemini-3.8-flash-tts`, voz `"Puck"`, taxa de amostragem $24\text{ kHz}$, 16-bit PCM mono.
3. **Margem de Respiro (Padding)**: Folga obrigatória de **0.3 segundos** de silêncio ao final de cada cena para evitar cortes abruptos entre a fala e a transição do vídeo.
4. **Sincronia Temporal**: O script não acelera nem desacelera o vídeo; ele corta cada clipe de vídeo para coincidir com a duração da fala mais 0.3s de respiro.
