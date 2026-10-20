# 🍋 Mestre Gerador de Vídeos: Shopee & TikTok Shop v3.0
> **Engenharia Reversa da Lógica Tech Lemonade** aplicada à geração de roteiros de alta conversão e prompts cinematográficos para o **Google Veo3** e **Dreamina**.

---

## 🎯 O que torna o "Mestre Gerador" superior?

Um gerador de prompts comum é passivo: você joga uma foto e ele cospe um texto genérico. O **Mestre Gerador** atua como um **consultor ativo e iterativo de neurovendas** com recursos de ponta:

1. **O Filtro de Ambiguidade (Perguntas de Esclarecimento)**:
   - Se você enviar uma foto genérica (ex: camiseta preta básica), a IA **interrompe a geração** e diagnostica que o ângulo de venda está vago.
   - Devolve de 1 a 2 perguntas de múltipla escolha (ex: *1. Caimento/Shape*, *2. Tecido respirável*, *3. Custo-benefício*) para você escolher com 1 clique antes de redigir o roteiro final.
2. **A Autocrítica Invisível Pré-Geração**:
   - Roda um checklist interno rígido antes da entrega: garante exatamente 3 blocos temporais (10s somadas: 0-3s, 3-7s, 7-10s), prompts visuais em inglês técnico com movimentos de câmera para o Veo3, locução persuasiva em PT-BR e zero alucinações.
3. **A Estrutura de Refinamento Rastreado**:
   - Se você pedir uma alteração (ex: *"não gostei do gancho"*, *"deixe mais dinâmico"*), a IA não joga outro texto aleatório: ela registra qual variável estratégica foi modificada em `refinement_summary` e reconstrói o roteiro com total coerência.
4. **Seletor de Estilo Visual (UGC vs Cinematográfico)**:
   - 📱 **UGC Realista (iPhone / TikTok Orgânico)**: visual natural de comprador real que mais converte na Shopee.
   - 🎬 **Comercial Cinematográfico de Estúdio 4K**: iluminação de estúdio e tracking de gimbal.
   - 🔍 **Macro & Textura**: foco extremo em detalhes do produto.
5. **Histórico Local e Exportação em CSV**:
   - Histórico salvo no navegador com instantâneo exato do texto enviado para cópia e exportação estruturada em CSV pronta para análise no Excel ou Google Sheets.

---

## 💻 Pré-requisitos

- **Python**: versão **3.11** ou superior (desenvolvido e testado com Python 3.14 no Windows).
- **Node.js**: versão **18** ou **20+** (com npm).
- **Chave de API do Google Gemini**: obtenha gratuitamente no [Google AI Studio](https://aistudio.google.com/).

---

## 📦 Instalação

### 1. Backend (Python / FastAPI)
A partir da raiz do projeto:

1. Crie o ambiente virtual:
   - **No Windows**:
     ```cmd
     py -3.14 -m venv backend\.venv
     ```
   - **No Linux / macOS**:
     ```bash
     python3 -m venv backend/.venv
     ```

2. Instale as dependências principais e de desenvolvimento dentro dele:
   - **No Windows**:
     ```cmd
     backend\.venv\Scripts\pip install -r backend\requirements.txt
     backend\.venv\Scripts\pip install -r backend\requirements-dev.txt
     ```
   - **No Linux / macOS**:
     ```bash
     backend/.venv/bin/pip install -r backend/requirements.txt
     backend/.venv/bin/pip install -r backend/requirements-dev.txt
     ```

3. Configure o arquivo de variáveis de ambiente:
   Copie o modelo `backend/.env.example` para `backend/.env`:
   - **No Windows**:
     ```cmd
     copy backend\.env.example backend\.env
     ```
   - **No Linux / macOS**:
     ```bash
     cp backend/.env.example backend/.env
     ```

   Edite o arquivo `backend/.env` e insira sua chave da API:
   ```ini
   GEMINI_API_KEY=sua_chave_aqui
   ```

### 2. Frontend (React / Vite)
A partir da raiz do projeto:
```bash
cd frontend
npm install
```

---

## 🚀 Como Rodar o Projeto

### Opção 1: Inicializador Rápido (Exclusivo para Windows)
Dê um duplo clique no arquivo:
```cmd
start.bat
```
*(O script `start.bat` é um inicializador batch exclusivo para o ambiente Windows. Ele abre os terminais do backend e do frontend e aciona seu navegador padrão em http://localhost:5173).*

---

### Opção 2: Execução Manual

#### 1. Iniciar o Backend
```bash
cd backend
```
- **No Windows (usando o Python Launcher)**:
  ```cmd
  py -3.14 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **No Linux / macOS**:
  ```bash
  uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- Documentação interativa da API (Swagger): `http://127.0.0.1:8000/docs`

#### 2. Iniciar o Frontend
```bash
cd frontend
npm run dev
```
- Acesse a interface web em: `http://localhost:5173`

---

## 🧪 Como Rodar os Testes

A suíte de testes cobre a validação de regras de neurovendas, limites estritos de texto, logging e exportação CSV.

### Testes do Backend (Pytest)
A partir da raiz do projeto, executando com o Python do ambiente virtual:
- **No Windows**:
  ```cmd
  backend\.venv\Scripts\python -m pytest backend/tests/
  ```
  *(ou com o ambiente ativado: `pytest backend/tests/`)*
- **No Linux / macOS**:
  ```bash
  backend/.venv/bin/pytest backend/tests/
  ```

### Testes do Frontend (Vitest)
A partir da pasta do frontend:
```bash
cd frontend
npm test
```

---

## 👥 Regras de Colaboração

Ao contribuir ou rodar o projeto em equipe, siga estritamente as diretrizes abaixo:

1. **Chaves de API Individuais**:
   - Cada colaborador deve utilizar a sua própria chave da API Gemini configurada exclusivamente no seu arquivo local `backend/.env`.
   - **Nunca compartilhe, commite ou envie sua chave de API para o repositório.**
2. **Não Versionar Dados Gerados**:
   - Planilhas exportadas (`historico_roteiros_veo_*.csv`), logs de geração (`backend/logs/`), vídeos gerados (`*.mp4`, etc.) e fotos de produtos são descartáveis e locais. O `.gitignore` está configurado para mantê-los fora do controle de versão.
3. **Prompts e Limites Congelados**:
   - O System Prompt (`backend/app/prompts/system.py`) e as regras e limites de validação de texto (`backend/app/schemas/script.py`) estão **congelados** e calibrados para os tempos exatos do Veo3.
   - Qualquer proposta de modificação nesses arquivos deve ser formulada formalmente, acompanhada de hipótese documentada e testes prévios antes de qualquer alteração no código.

---

## 🏗️ Arquitetura do Projeto

```
Gerador/
├── backend/                      # Motor de IA e Regras de Negócio (FastAPI)
│   ├── app/
│   │   ├── api/routes.py         # Endpoints REST (/api/generate-script, /api/health)
│   │   ├── core/config.py        # Configurações e variáveis de ambiente
│   │   ├── prompts/system.py     # System Prompt Tech Lemonade
│   │   ├── schemas/script.py     # Modelos de validação Pydantic (Strict JSON)
│   │   ├── services/gemini.py    # Integração Google GenAI SDK (com fallback)
│   │   ├── services/logger_csv.py# Registro de métricas e auditoria técnica
│   │   └── main.py               # Ponto de entrada FastAPI com CORS
│   ├── tests/                    # Suíte de testes do backend
│   ├── requirements.txt          # Dependências principais de produção
│   ├── requirements-dev.txt      # Dependências de desenvolvimento e testes
│   └── .env.example              # Modelo de variáveis de ambiente
│
├── frontend/                     # Interface do Usuário (React 19 + TypeScript + Tailwind v4)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageDrop.tsx     # Drag & Drop, colar com Ctrl+V e preview
│   │   │   ├── ClarificationBox.tsx # Perguntas interativas de neurovendas
│   │   │   ├── ScriptTable.tsx   # Tabela Veo3 com botões de cópia e 3 ganchos
│   │   │   ├── RefinementBox.tsx # Pílulas rápidas e refinamento livre
│   │   │   └── Loader.tsx        # Animação de checklist de neurovendas
│   │   ├── services/api.ts       # Comunicação com o backend
│   │   ├── utils/                # Utilitários de métricas de texto e exportação CSV
│   │   ├── types/index.ts        # Tipagem TypeScript estrita
│   │   ├── App.tsx               # Orquestrador de fluxo de estados
│   │   └── index.css             # Tailwind CSS v4
│   └── package.json
│
├── montador.py                   # Utilitário legado (exige 3 clipes)
├── start.bat                     # Inicializador rápido para Windows
└── README.md
```

---

## 📋 Fluxo Atual de Produção (Operação Veo3)

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

> **montador.py: utilitário legado (exige 3 clipes)**
> 
> O script `montador.py` é um utilitário legado concebido para o formato anterior, que exigia a renderização de **3 clipes separados de vídeo** e sincronização local via FFmpeg e Gemini TTS.
> No fluxo atual do **Mestre Gerador v3.0**, o Google Veo gera **1 clipe único contínuo de 10 segundos** com a fala embutida, tornando a montagem externa desnecessária para o fluxo regular de publicação.

---

## 📚 Documentação Técnica Adicional

- [Visão Geral de Ponta a Ponta](docs/visao_geral_projeto.md)
- [Manual de Regras do Sistema](docs/regras_do_sistema.md)
