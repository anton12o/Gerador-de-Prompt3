import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  History,
  Trash2,
  X,
  ChevronRight
} from 'lucide-react';
import { ImageDrop } from './components/ImageDrop';
import { ClarificationBox } from './components/ClarificationBox';
import { ScriptTable } from './components/ScriptTable';
import { RefinementBox } from './components/RefinementBox';
import { Loader } from './components/Loader';
import { generateScriptApi, checkBackendHealth } from './services/api';
import type { ScriptResult, SavedScriptItem } from './types';

const STORAGE_KEY_V4 = 'mestre_gerador_saved_scripts_v4';
const STORAGE_KEY_LEGACY = 'mestre_gerador_saved_scripts_v3';

export function App() {
  const [currentImagesBase64, setCurrentImagesBase64] = useState<string[]>([]);
  const [currentMimeType, setCurrentMimeType] = useState<string | undefined>();
  const [currentContext, setCurrentContext] = useState<string>('');
  const [currentStylePreset, setCurrentStylePreset] = useState<'ugc_realista' | 'cinematic_studio' | 'macro_produto'>('ugc_realista');
  const [currentVideoEngine, setCurrentVideoEngine] = useState<'veo3' | 'dreamina' | 'kling' | 'luma'>('veo3');
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  // History state
  const [savedScripts, setSavedScripts] = useState<SavedScriptItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  useEffect(() => {
    checkBackendHealth().then((healthy) => setIsBackendHealthy(healthy));

    const interval = setInterval(() => {
      checkBackendHealth().then((healthy) => setIsBackendHealthy(healthy));
    }, 4000);

    // Load saved scripts from localStorage (v4 with fallback to legacy v3)
    try {
      let stored = localStorage.getItem(STORAGE_KEY_V4);
      if (!stored) {
        stored = localStorage.getItem(STORAGE_KEY_LEGACY);
      }
      if (stored) {
        setSavedScripts(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }

    return () => clearInterval(interval);
  }, []);

  const saveToHistory = (result: ScriptResult, contextText?: string) => {
    if (result.status !== 'completed') return;
    const newItem: SavedScriptItem = {
      id: `${Date.now()}`,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      productSummary: contextText?.slice(0, 50) || result.diagnosis.slice(0, 50) || 'Produto Shopee',
      category: result.category || 'Geral',
      result,
    };
    setSavedScripts((prev) => {
      const updated = [newItem, ...prev.slice(0, 19)]; // keep last 20
      localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    if (confirm('Deseja limpar todo o histórico de roteiros salvos?')) {
      setSavedScripts([]);
      localStorage.removeItem(STORAGE_KEY_V4);
      localStorage.removeItem(STORAGE_KEY_LEGACY);
    }
  };

  const loadSavedScript = (item: SavedScriptItem) => {
    setScriptResult(item.result);
    setIsHistoryOpen(false);
  };

  // 1. Initial Generation
  const handleGenerate = async (
    imagesBase64: string[],
    mimeType?: string,
    context?: string,
    force: boolean = false,
    stylePreset: 'ugc_realista' | 'cinematic_studio' | 'macro_produto' = 'ugc_realista',
    videoEngine: 'veo3' | 'dreamina' | 'kling' | 'luma' = 'veo3'
  ) => {
    if (isBackendHealthy === false) {
      setErrorMessage(
        'O Backend está offline! Por favor, inicie o servidor executando o start.bat ou verificando a janela do FastAPI na porta 8000.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCurrentImagesBase64(imagesBase64);
    setCurrentMimeType(mimeType);
    setCurrentContext(context || '');
    setCurrentStylePreset(stylePreset);
    setCurrentVideoEngine(videoEngine);

    try {
      const result = await generateScriptApi({
        images_base64: imagesBase64,
        image_mime_type: mimeType,
        context: context,
        style_preset: stylePreset,
        video_engine: videoEngine,
        force_generation: force,
      });
      setScriptResult(result);
      if (result.status === 'completed') {
        saveToHistory(result, context);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao conectar com o gerador.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Answer Clarification Questions
  const handleClarificationAnswers = async (answers: Record<string, string>) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateScriptApi({
        images_base64: currentImagesBase64,
        image_mime_type: currentMimeType,
        context: currentContext,
        style_preset: currentStylePreset,
        video_engine: currentVideoEngine,
        clarification_answers: answers,
      });
      setScriptResult(result);
      if (result.status === 'completed') {
        saveToHistory(result, currentContext);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar respostas de esclarecimento.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Force Direct Generation (Skip clarification)
  const handleForceGeneration = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateScriptApi({
        images_base64: currentImagesBase64,
        image_mime_type: currentMimeType,
        context: currentContext,
        style_preset: currentStylePreset,
        video_engine: currentVideoEngine,
        force_generation: true,
      });
      setScriptResult(result);
      if (result.status === 'completed') {
        saveToHistory(result, currentContext);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na geração direta.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Refinement Loop
  const handleRefine = async (instruction: string) => {
    if (!scriptResult) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateScriptApi({
        images_base64: currentImagesBase64,
        image_mime_type: currentMimeType,
        context: currentContext,
        style_preset: currentStylePreset,
        video_engine: currentVideoEngine,
        previous_response: scriptResult,
        refinement_instruction: instruction,
      });
      setScriptResult(result);
      if (result.status === 'completed') {
        saveToHistory(result, `${currentContext} (Refinado: ${instruction})`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao refinar roteiro.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Reset to New Product
  const handleReset = () => {
    setScriptResult(null);
    setCurrentImagesBase64([]);
    setCurrentContext('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
              🍋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white">
                  Mestre Gerador Shopee Vídeo
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  v3.0 Tech Lemonade
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Filtro de Ambiguidade • Autocrítica • Veo3 Prompts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isBackendHealthy !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isBackendHealthy ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'
                  }`}
                />
                {isBackendHealthy ? 'API Conectada' : 'Backend Offline'}
              </div>
            )}

            {/* History Toggle Button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors relative"
              title="Ver histórico de roteiros salvos"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Histórico</span>
              {savedScripts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {savedScripts.length}
                </span>
              )}
            </button>

            {scriptResult && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Novo Produto
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-start justify-between gap-3 text-rose-200 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 rounded-lg text-white font-medium"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Input Drop Area */}
        {!scriptResult && !isLoading && (
          <div className="space-y-4">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Consultor Ativo de Neurovendas
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Crie Roteiros & Prompts para o Google Veo
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Envie a foto ou link do produto. O Mestre Gerador diagnostica o diferencial, faz perguntas de esclarecimento se for ambíguo e entrega o prompt único de 10s para Veo com locução embutida.
              </p>
            </div>

            <ImageDrop onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
        )}

        {/* Loading State */}
        {isLoading && <Loader />}

        {/* State A: Clarification Needed (Tech Lemonade Ambiguity Filter) */}
        {!isLoading && scriptResult?.status === 'needs_clarification' && scriptResult.clarification_questions && (
          <ClarificationBox
            diagnosis={scriptResult.diagnosis}
            category={scriptResult.category}
            questions={scriptResult.clarification_questions}
            onSubmitAnswers={handleClarificationAnswers}
            onForceGeneration={handleForceGeneration}
            isLoading={isLoading}
          />
        )}

        {/* State B: Script Ready (Completed) */}
        {!isLoading && scriptResult?.status === 'completed' && (
          <div className="space-y-8 animate-fade-in">
            <ScriptTable result={scriptResult} />
            <RefinementBox onRefine={handleRefine} isLoading={isLoading} />
          </div>
        )}

      </main>

      {/* History Slide-over Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-base">Roteiros Salvos</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {savedScripts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nenhum roteiro salvo ainda. Gere um novo roteiro para salvá-lo aqui.
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-1">
                  {savedScripts.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadSavedScript(item)}
                      className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-xl cursor-pointer transition-all group flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded">
                            {item.category || 'Shopee'}
                          </span>
                          <span className="text-[10px] text-slate-500">{item.createdAt}</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium line-clamp-2">
                          {item.productSummary}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 shrink-0 mt-1 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {savedScripts.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={clearHistory}
                  className="w-full py-2.5 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  Limpar Histórico
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>
          Mestre Gerador Shopee Vídeo v3.0 • Inspirado na lógica Tech Lemonade🍋 • Otimizado para Veo3, Dreamina, Kling e TikTok Shop
        </p>
      </footer>
    </div>
  );
}

export default App;
