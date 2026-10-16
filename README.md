# 🍋 Mestre Gerador de Vídeos: Shopee & TikTok Shop v3.0
> **Engenharia Reversa da Lógica Tech Lemonade** aplicada à geração de roteiros de alta conversão e prompts cinematográficos para o **Google Veo3** e **Dreamina**.

---

## 🎯 O que torna o "Mestre Gerador" superior?

Um gerador de prompts comum é passivo: você joga uma foto e ele cospe um texto genérico. O **Mestre Gerador** atua como um **consultor ativo e iterativo de neurovendas** com 3 funcionalidades exclusivas:

1. **O Filtro de Ambiguidade (Perguntas de Esclarecimento)**:
   - Se você enviar uma foto genérica (ex: camiseta preta básica), a IA **interrompe a geração** e diagnostica que o ângulo de venda está vago.
   - Devolve de 1 a 2 perguntas de múltipla escolha (ex: *1. Caimento/Shape*, *2. Tecido respirável*, *3. Custo-benefício*) para você escolher com 1 clique antes de redigir o roteiro final.
2. **A Autocrítica Invisível Pré-Geração**:
   - Roda um checklist interno rígido antes da entrega: garante exatamente 3 cenas modulares (10 a 15s somadas), prompts visuais em inglês técnico com movimentos de câmera para o Veo3, locução persuasiva em PT-BR e zero alucinações.
3. **A Estrutura de Refinamento Rastreado**:
   - Se você pedir uma alteração (ex: *"não gostei do gancho"*, *"deixe mais dinâmico"*), a IA não joga outro texto aleatório: ela registra qual variável estratégica foi modificada em `refinement_summary` e reconstrói o roteiro com total coerência.
4. **Seletor de Estilo Visual (UGC vs Cinematográfico)**:
   - 📱 **UGC Realista (iPhone / TikTok Orgânico)**: visual amador e natural de comprador real que mais converte na Shopee.
   - 🎬 **Comercial Cinematográfico de Estúdio 4K**: iluminação de estúdio e tracking de gimbal.
   - 🔍 **Macro & Textura**: foco extremo em detalhes do produto.
5. **Compatibilidade Multi-Engine**:
   - Otimizado para **Google Veo3**, **CapCut Dreamina**, **Kling AI** e **Luma Machine**.
6. **Histórico Local de Roteiros (LocalStorage)**:
   - Os últimos 20 roteiros gerados ficam salvos no navegador para você alternar, comparar e copiar sem gastar novas chamadas.
7. **Exportação com 1 Clique**:
   - Botões para copiar prompts e locuções individuais, copiar o roteiro completo ou baixar em arquivo `.txt`.

---

## 🏗️ Arquitetura do Projeto

```
Gerador/
├── backend/                      # Motor de IA e Regras de Negócio (FastAPI)
│   ├── app/
│   │   ├── api/routes.py         # Endpoints REST (/api/generate-script, /api/health)
│   │   ├── core/config.py        # Configurações e variáveis de ambiente
│   │   ├── prompts/system.py     # O System Prompt Tech Lemonade
│   │   ├── schemas/script.py     # Modelos de validação Pydantic (Strict JSON)
│   │   ├── services/gemini.py    # Integração oficial Google GenAI SDK (com fallback)
│   │   └── main.py               # Ponto de entrada FastAPI com CORS
│   ├── requirements.txt          # Dependências Python
│   └── .env                      # Chave da API Gemini (GEMINI_API_KEY)
│
├── frontend/                     # Interface do Usuário (React 19 + TypeScript + Tailwind v4)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageDrop.tsx     # Drag & Drop, colar com Ctrl+V e preview
│   │   │   ├── ClarificationBox.tsx # Caixa interativa de perguntas do consultor
│   │   │   ├── ScriptTable.tsx   # Tabela Veo3 com botões de cópia e 3 ganchos
│   │   │   ├── RefinementBox.tsx # Pílulas rápidas e input livre de refinamento
│   │   │   └── Loader.tsx        # Animação de checklist de neurovendas
│   │   ├── services/api.ts       # Comunicação com o backend
│   │   ├── types/index.ts        # Tipagem TypeScript estrita
│   │   ├── App.tsx               # Orquestrador de fluxo de estados
│   │   └── index.css             # Tailwind CSS v4
│   └── package.json
│
├── start.bat                     # Inicializador automático para Windows
└── README.md
```

---

## 🚀 Como Rodar o Projeto

### Opção 1: Inicializador Rápido (Recomendado no Windows)
Basta dar um duplo clique no arquivo:
```cmd
start.bat
```
Ele iniciará automaticamente o backend em `http://localhost:8000`, o frontend em `http://localhost:5173` e abrirá seu navegador padrão.

---

### Opção 2: Execução Manual

#### 1. Iniciar o Backend:
```bash
cd backend
py -3.14 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Acesse a documentação Swagger em: `http://localhost:8000/docs`

#### 2. Iniciar o Frontend:
```bash
cd frontend
npm run dev
```
- Acesse a aplicação em: `http://localhost:5173`

---

## 📋 Fluxo Atual de Produção (Operação Veo3)

O fluxo de ponta a ponta é desenhado para publicação ágil:

```text
Fotos do Produto + Contexto / Autocomplete Shopee
                      ↓
  Diagnóstico Neurovendas & Filtro de Ambiguidade
                      ↓
  1 Prompt de Vídeo Único de 10s com Locução embutida (Google Veo)
                      ↓
  Geração de 1 Clipe Contínuo de 10s no Google Veo
                      ↓
  Postagem Imediata com Título SEO, Legenda na Tela e Hashtags (#publicidade)
```

### Saída Gerada:
1. **Prompt Único de Vídeo de 10s (Veo3)**: Ancorado na foto de referência, com anti-UI unificado e blocos temporais estruturados (`[0-3s]`, `[3-7s]`, `[7-10s]`) com narração em off embutida.
2. **Locução em Português com Validação Híbrida**: Texto fluido sincronizado com limites estritos de palavras e caracteres calculados pelo backend.
3. **Seletor Dinâmico de 3 Ganchos (0-3s)**: Dor, Curiosidade e Quebra de Padrão (alternáveis no cliente com latência zero).
4. **Campos de Postagem (Shopee & TikTok)**:
   - **Título SEO**: Restrito aos termos do autocomplete pesquisados pelo usuário.
   - **Legenda na Tela / Sticker**: Máximo de 5 palavras para gancho visual.
   - **Hashtags de Nicho**: Finalizando sempre com a tag obrigatória `#publicidade`.

---

## ⚠️ Módulo de Montagem (`montador.py`) — Utilitário Legado

> **Aviso**: O script `montador.py` é um **utilitário legado** concebido para o formato anterior, que exigia a renderização de **3 clipes separados de vídeo** e sincronização local via FFmpeg e Gemini TTS.
> No fluxo atual do **Mestre Gerador v3.0**, o Google Veo gera **1 clipe único contínuo de 10 segundos** com a fala embutida, tornando a montagem externa desnecessária para o fluxo de publicação.

---

## 📚 Documentação Técnica Adicional

- [Visão Geral de Ponta a Ponta](docs/visao_geral_projeto.md)
- [Manual de Regras do Sistema](docs/regras_do_sistema.md)
