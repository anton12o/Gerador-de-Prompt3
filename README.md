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

## 📋 Formato de Saída Gerado (Para o Veo3)

| Cena | Duração | Prompt Visual para Veo3 (Inglês) | Locução/Áudio (Português) |
| :--- | :--- | :--- | :--- |
| **1. GANCHO** | 0-3s | Close-up tracking shot, cinematic lighting, start frame... | Gancho POV de retenção extrema |
| **2. USO/BENEFÍCIO** | 3-8s | Dolly-in shot destacando benefício prático... | Resolução do problema visualmente |
| **3. CTA** | 8-10s | Dynamic whip-pan direcionando para o canto inferior... | Escassez e urgência para o carrinho |

Além da tabela, o sistema entrega:
- **Diagnóstico da IA**: Justificativa em 1 linha da escolha do ângulo.
- **3 Opções de Ganchos**: Dor, Curiosidade e Quebra de Padrão (prontos para teste A/B/C).
- **Botões de Cópia com 1 Clique** em cada célula e botão para **Copiar Roteiro Completo**.
