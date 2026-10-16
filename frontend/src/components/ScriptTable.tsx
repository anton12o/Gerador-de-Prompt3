import React, { useState } from 'react';
import {
  Copy,
  Check,
  Video,
  Mic,
  Clock,
  Sparkles,
  Share2,
  CheckCircle2,
  Zap,
  Flame,
  Download,
  Film,
  FileText,
  Type,
  Hash
} from 'lucide-react';
import type { ScriptResult, HookOption, ScriptPartes } from '../types';

interface ScriptTableProps {
  result: ScriptResult;
}

function countWords(str: string): number {
  return str && str.trim() ? str.trim().split(/\s+/).length : 0;
}

function assemblePromptVeo(partes: ScriptPartes, hook: HookOption): string {
  const header = `Using the provided product photo as reference: ${partes.descricao_produto}, placed on ${partes.descricao_cenario}. Clean commercial footage, clean surfaces, plain background, all product parts firmly anchored with rigid physical connections and realistic gravity, no floating parts, no morphing structures, no phone screens, no UI interfaces, no fake app mockups, no subtitles, no on-screen text, no background music, no other voices, no text, no letters, no words.`;
  const block_0_3 = `[0-3s]: ${hook.acao_visual_0_3s}. Portuguese voiceover narration says: "${hook.fala}" in a natural, clear tone (no background music, no other voices).`;
  const block_3_7 = `[3-7s]: ${partes.bloco_beneficio_visual}. Portuguese voiceover narration says: "${partes.fala_beneficio}" in a natural, clear tone (no background music, no other voices).`;
  const block_7_10 = `[7-10s]: ${partes.bloco_cta_visual}. Portuguese voiceover narration says: "${partes.fala_cta}" in a natural, clear tone (no background music, no other voices).`;
  return `${header}\n\n${block_0_3}\n\n${block_3_7}\n\n${block_7_10}`;
}

function assembleLocucaoPt(partes: ScriptPartes, hook: HookOption): string {
  return `${hook.fala} ${partes.fala_beneficio} ${partes.fala_cta}`.trim();
}

export const ScriptTable: React.FC<ScriptTableProps> = ({ result }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Hook selector state (dor | curiosidade | quebra_de_padrao)
  const initialHookKey =
    result.selected_hook_type &&
    ['dor', 'curiosidade', 'quebra_de_padrao'].includes(result.selected_hook_type)
      ? (result.selected_hook_type as 'dor' | 'curiosidade' | 'quebra_de_padrao')
      : 'dor';

  const [activeHookKey, setActiveHookKey] = useState<'dor' | 'curiosidade' | 'quebra_de_padrao'>(
    initialHookKey
  );

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Extract active hook option
  const activeHookOption: HookOption | undefined = (() => {
    if (!result.multiple_hooks) return undefined;
    const raw = (result.multiple_hooks as any)[activeHookKey];
    if (!raw) return undefined;
    if (typeof raw === 'string') {
      return {
        tipo: activeHookKey,
        fala: raw,
        acao_visual_0_3s: 'Dynamic motion highlighting product.',
      };
    }
    return raw as HookOption;
  })();

  // Dynamically assemble Veo prompt & voiceover when hook is switched
  const activePromptVeo: string = (() => {
    if (result.partes && activeHookOption) {
      return assemblePromptVeo(result.partes, activeHookOption);
    }
    return result.prompt_veo || '';
  })();

  const activeLocucaoPt: string = (() => {
    if (result.partes && activeHookOption) {
      return assembleLocucaoPt(result.partes, activeHookOption);
    }
    return result.locucao_pt || '';
  })();

  // Word and character counts
  const totalWords = countWords(activeLocucaoPt);
  const totalChars = activeLocucaoPt.length;
  const hookWords = activeHookOption ? countWords(activeHookOption.fala) : 0;
  const hookChars = activeHookOption ? activeHookOption.fala.length : 0;
  const beneficioWords = result.partes ? countWords(result.partes.fala_beneficio) : 0;
  const beneficioChars = result.partes ? result.partes.fala_beneficio.length : 0;
  const ctaWords = result.partes ? countWords(result.partes.fala_cta) : 0;
  const ctaChars = result.partes ? result.partes.fala_cta.length : 0;

  const generateFormattedText = () => {
    // 10s Veo Format
    if (activePromptVeo || activeLocucaoPt) {
      let text = `========================================================\n`;
      text += `   ROTEIRO VÍDEO 10s VEO (Tech Lemonade Logic v3.0)\n`;
      text += `========================================================\n\n`;
      text += `DIAGNÓSTICO DO CONSULTOR: ${result.diagnosis}\n`;
      if (result.category) text += `CATEGORIA: ${result.category}\n`;
      if (result.modelo_utilizado) text += `MODELO IA: ${result.modelo_utilizado}\n`;
      if (result.refinement_summary) text += `REFINAMENTO APLICADO: ${result.refinement_summary}\n`;
      text += `\n`;

      if (result.multiple_hooks) {
        text += `--------------------------------------------------------\n`;
        text += `1. ALTERNATIVAS DE GANCHOS (0-3s)\n`;
        text += `--------------------------------------------------------\n`;
        const d = result.multiple_hooks.dor;
        const c = result.multiple_hooks.curiosidade;
        const q = result.multiple_hooks.quebra_de_padrao;

        if (d && typeof d === 'object') {
          text += `[A - DOR]: "${d.fala}" (${countWords(d.fala)} pal. / ${d.fala.length} car.)\nVisual 0-3s: ${d.acao_visual_0_3s}\n\n`;
        } else if (typeof d === 'string') {
          text += `[A - DOR]: "${d}"\n\n`;
        }

        if (c && typeof c === 'object') {
          text += `[B - CURIOSIDADE]: "${c.fala}" (${countWords(c.fala)} pal. / ${c.fala.length} car.)\nVisual 0-3s: ${c.acao_visual_0_3s}\n\n`;
        } else if (typeof c === 'string') {
          text += `[B - CURIOSIDADE]: "${c}"\n\n`;
        }

        if (q && typeof q === 'object') {
          text += `[C - QUEBRA DE PADRÃO]: "${q.fala}" (${countWords(q.fala)} pal. / ${q.fala.length} car.)\nVisual 0-3s: ${q.acao_visual_0_3s}\n\n`;
        } else if (typeof q === 'string') {
          text += `[C - QUEBRA DE PADRÃO]: "${q}"\n\n`;
        }
      }

      text += `--------------------------------------------------------\n`;
      text += `2. PROMPT DE VÍDEO 10s (GOOGLE VEO)\n`;
      text += `--------------------------------------------------------\n`;
      text += `${activePromptVeo}\n\n`;

      text += `--------------------------------------------------------\n`;
      text += `3. LOCUÇÃO EM PORTUGUÊS (${totalWords} palavras • ${totalChars} caracteres)\n`;
      text += `--------------------------------------------------------\n`;
      text += `"${activeLocucaoPt}"\n`;

      if (result.titulo_seo || result.legenda_na_tela || (result.hashtags && result.hashtags.length > 0)) {
        text += `\n--------------------------------------------------------\n`;
        text += `4. DADOS DE POSTAGEM (SHOPEE & TIKTOK SHOP)\n`;
        text += `--------------------------------------------------------\n`;
        if (result.titulo_seo) {
          text += `📌 TÍTULO SEO:\n${result.titulo_seo}\n\n`;
        }
        if (result.legenda_na_tela) {
          text += `💬 LEGENDA NA TELA (${countWords(result.legenda_na_tela)} palavras):\n"${result.legenda_na_tela}"\n\n`;
        }
        if (result.hashtags && result.hashtags.length > 0) {
          text += `🏷️ HASHTAGS:\n${result.hashtags.join(' ')}\n`;
        }
      }

      return text;
    }

    // Legacy 3 Scenes Format
    if (result.scenes && result.scenes.length > 0) {
      let text = `========================================================\n`;
      text += `   ROTEIRO SHOPEE VÍDEO (Formato Legado 3 Cenas)\n`;
      text += `========================================================\n\n`;
      text += `DIAGNÓSTICO DO CONSULTOR: ${result.diagnosis}\n`;
      if (result.category) text += `CATEGORIA: ${result.category}\n`;
      if (result.refinement_summary) text += `REFINAMENTO APLICADO: ${result.refinement_summary}\n\n`;
      result.scenes.forEach((scene) => {
        text += `\n[${scene.scene_title}] (${scene.duration})\n`;
        text += `🎥 PROMPT VISUAL (Inglês):\n${scene.visual_prompt}\n`;
        text += `🎙️ LOCUÇÃO / ÁUDIO (Português):\n"${scene.voiceover}"\n`;
      });

      if (result.titulo_seo || result.legenda_na_tela || (result.hashtags && result.hashtags.length > 0)) {
        text += `\n--------------------------------------------------------\n`;
        text += `DADOS DE POSTAGEM (SHOPEE & TIKTOK SHOP)\n`;
        text += `--------------------------------------------------------\n`;
        if (result.titulo_seo) text += `📌 TÍTULO SEO:\n${result.titulo_seo}\n\n`;
        if (result.legenda_na_tela) text += `💬 LEGENDA NA TELA:\n"${result.legenda_na_tela}"\n\n`;
        if (result.hashtags && result.hashtags.length > 0) text += `🏷️ HASHTAGS:\n${result.hashtags.join(' ')}\n`;
      }

      return text;
    }

    return '';
  };

  const copyEntireScript = () => {
    const text = generateFormattedText();
    if (text) copyToClipboard(text, 'all');
  };

  const downloadScriptFile = () => {
    const text = generateFormattedText();
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roteiro_veo_${result.category || 'produto'}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLegacyFormat = !activePromptVeo && result.scenes && result.scenes.length > 0;

  return (
    <div className="w-full space-y-6">
      
      {/* 1. Header & Diagnosis Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                1. Diagnóstico do Diretor de Vídeo
              </h3>
              <p className="text-xs text-slate-400">
                Estratégia de neurovendas e adaptação para vídeo de 10s (Veo)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Model Traceability Badge */}
            {result.modelo_utilizado && (
              <span className="px-2.5 py-1 bg-slate-800/90 border border-slate-700 text-slate-300 font-mono text-[11px] rounded-xl flex items-center gap-1.5 shadow-sm" title="Modelo de IA utilizado">
                <span>⚙️ Gerado por:</span>
                <strong className="text-amber-400 font-semibold">{result.modelo_utilizado}</strong>
              </span>
            )}

            {result.category && (
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs rounded-full">
                {result.category}
              </span>
            )}
            
            <button
              type="button"
              onClick={downloadScriptFile}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              title="Baixar roteiro em arquivo .txt"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Baixar .TXT</span>
            </button>

            <button
              type="button"
              onClick={copyEntireScript}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              {copiedKey === 'all' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  <span>Roteiro Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-950" />
                  <span>Copiar Roteiro Completo</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 leading-relaxed">
          <strong className="text-amber-400 font-semibold">Ângulo Escolhido: </strong>
          {result.diagnosis}
        </div>

        {/* Refinement Note if present */}
        {result.refinement_summary && (
          <div className="mt-3 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Rastreabilidade de Refinamento:</strong> {result.refinement_summary}
            </span>
          </div>
        )}

        {/* Internal checklist badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Diretrizes Validadas:
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            10s Google Veo
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            18-23 Palavras
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            ≤ 150 Caracteres
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            Movimento Dinâmico 0-3s
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            Zero Alucinações
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-md font-semibold">
            Anti-UI (Zero Telas & Textos)
          </span>
        </div>
      </div>

      {/* 2. Multiple Hooks Selector (0-3s) */}
      {result.multiple_hooks && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  2. Alternativas de Ganchos (Bloco 0-3s)
                </h3>
                <p className="text-xs text-slate-400">
                  Clique para alternar o gancho ativo. O prompt Veo e a locução serão remontados instantaneamente.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Hook 1: Dor */}
            {(() => {
              const raw = result.multiple_hooks.dor;
              const fala = typeof raw === 'object' ? raw.fala : (raw as string);
              const acao = typeof raw === 'object' ? raw.acao_visual_0_3s : '';
              const words = countWords(fala);
              const chars = fala.length;
              const isSelected = activeHookKey === 'dor';

              return (
                <div
                  onClick={() => setActiveHookKey('dor')}
                  className={`p-4 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-rose-950/30 border-rose-500 ring-1 ring-rose-500/50 shadow-lg shadow-rose-950/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded flex items-center gap-1.5">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                        Gancho A: Dor / Problema
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {words}/7 pal. • {chars}/45 car.
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(fala, 'hook-dor');
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="Copiar fala do gancho"
                        >
                          {copiedKey === 'hook-dor' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-100 font-semibold mb-2 leading-relaxed">
                      "{fala}"
                    </p>

                    {acao && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <strong className="text-slate-300">Ação Visual (0-3s): </strong>
                        {acao}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 text-[10px] font-medium flex items-center justify-between text-slate-500">
                    <span>{isSelected ? '✓ Ativo no Prompt' : 'Clique para ativar'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Hook 2: Curiosidade */}
            {(() => {
              const raw = result.multiple_hooks.curiosidade;
              const fala = typeof raw === 'object' ? raw.fala : (raw as string);
              const acao = typeof raw === 'object' ? raw.acao_visual_0_3s : '';
              const words = countWords(fala);
              const chars = fala.length;
              const isSelected = activeHookKey === 'curiosidade';

              return (
                <div
                  onClick={() => setActiveHookKey('curiosidade')}
                  className={`p-4 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded flex items-center gap-1.5">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        Gancho B: Curiosidade
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {words}/7 pal. • {chars}/45 car.
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(fala, 'hook-curiosidade');
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="Copiar fala do gancho"
                        >
                          {copiedKey === 'hook-curiosidade' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-100 font-semibold mb-2 leading-relaxed">
                      "{fala}"
                    </p>

                    {acao && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <strong className="text-slate-300">Ação Visual (0-3s): </strong>
                        {acao}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 text-[10px] font-medium flex items-center justify-between text-slate-500">
                    <span>{isSelected ? '✓ Ativo no Prompt' : 'Clique para ativar'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Hook 3: Quebra de Padrão */}
            {(() => {
              const raw = result.multiple_hooks.quebra_de_padrao;
              const fala = typeof raw === 'object' ? raw.fala : (raw as string);
              const acao = typeof raw === 'object' ? raw.acao_visual_0_3s : '';
              const words = countWords(fala);
              const chars = fala.length;
              const isSelected = activeHookKey === 'quebra_de_padrao';

              return (
                <div
                  onClick={() => setActiveHookKey('quebra_de_padrao')}
                  className={`p-4 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded flex items-center gap-1.5">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                        Gancho C: Quebra de Padrão
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {words}/7 pal. • {chars}/45 car.
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(fala, 'hook-quebra');
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="Copiar fala do gancho"
                        >
                          {copiedKey === 'hook-quebra' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-100 font-semibold mb-2 leading-relaxed">
                      "{fala}"
                    </p>

                    {acao && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <strong className="text-slate-300">Ação Visual (0-3s): </strong>
                        {acao}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 text-[10px] font-medium flex items-center justify-between text-slate-500">
                    <span>{isSelected ? '✓ Ativo no Prompt' : 'Clique para ativar'}</span>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* 3. Single 10s Prompt for Google Veo */}
      {activePromptVeo && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  3. Prompt de Vídeo de 10s (Google Veo / Kling / Dreamina)
                </h3>
                <p className="text-xs text-slate-400">
                  Prompt único estruturado por blocos de tempo com locução embutida e ancoragem no produto
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(activePromptVeo, 'prompt-veo')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
              title="Copiar prompt completo para Veo"
            >
              {copiedKey === 'prompt-veo' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  <span>Prompt Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-950" />
                  <span>Copiar Prompt Veo</span>
                </>
              )}
            </button>
          </div>

          <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
            {activePromptVeo}
          </div>
        </div>
      )}

      {/* 4. Complete Voiceover in Portuguese (Hybrid Validation) */}
      {activeLocucaoPt && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-orange-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  4. Locução / Áudio em Português
                </h3>
                <p className="text-xs text-slate-400">
                  Texto da narração contínua sincronizada com a ação do vídeo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(activeLocucaoPt, 'locucao-pt')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
                title="Copiar locução em português"
              >
                {copiedKey === 'locucao-pt' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Locução Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Locução</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 font-medium leading-relaxed italic select-all">
            "{activeLocucaoPt}"
          </div>

          {/* Word and Character counts breakdown per block */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-3 border-t border-slate-800/80 text-xs">
            <span className="font-semibold text-slate-400">Contagens por Bloco:</span>

            <div className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 font-mono text-[11px] text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-400">Gancho (0-3s):</span>
              <strong className={hookWords <= 7 && hookChars <= 45 ? "text-emerald-400" : "text-amber-400"}>
                {hookWords}/7 pal.
              </strong>
              <span className="text-slate-500">•</span>
              <strong className={hookChars <= 45 ? "text-emerald-400" : "text-amber-400"}>
                {hookChars}/45 car.
              </strong>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 font-mono text-[11px] text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-400">Benefício (3-7s):</span>
              <strong className={beneficioWords <= 11 && beneficioChars <= 70 ? "text-emerald-400" : "text-amber-400"}>
                {beneficioWords}/11 pal.
              </strong>
              <span className="text-slate-500">•</span>
              <strong className={beneficioChars <= 70 ? "text-emerald-400" : "text-amber-400"}>
                {beneficioChars}/70 car.
              </strong>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 font-mono text-[11px] text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-400">CTA (7-10s):</span>
              <strong className={ctaWords <= 5 && ctaChars <= 35 ? "text-emerald-400" : "text-amber-400"}>
                {ctaWords}/5 pal.
              </strong>
              <span className="text-slate-500">•</span>
              <strong className={ctaChars <= 35 ? "text-emerald-400" : "text-amber-400"}>
                {ctaChars}/35 car.
              </strong>
            </div>

            <div className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 ${
              totalWords >= 18 && totalWords <= 23 && totalChars <= 150
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            }`}>
              <span>Total:</span>
              <span>{totalWords} pal. (18-23)</span>
              <span className="text-slate-500">•</span>
              <span>{totalChars}/150 car.</span>
              {totalWords >= 18 && totalWords <= 23 && totalChars <= 150 && <span>✓</span>}
            </div>

            <span className="text-slate-500 text-[11px] ml-auto">
              Ritmo: ~2.5 pal/s (~{(totalWords / 2.5).toFixed(1)}s de áudio)
            </span>
          </div>
        </div>
      )}

      {/* 5. Posting Data (Shopee & TikTok Shop) */}
      {(result.titulo_seo || result.legenda_na_tela || (result.hashtags && result.hashtags.length > 0)) && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  5. Campos de Postagem (Shopee & TikTok Shop)
                </h3>
                <p className="text-xs text-slate-400">
                  Título SEO otimizado, legenda na tela/sticker e hashtags estratégicas terminando em #publicidade
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título SEO */}
            {result.titulo_seo && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Título SEO do Anúncio / Post
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(result.titulo_seo!, 'titulo-seo')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-700"
                      title="Copiar título SEO"
                    >
                      {copiedKey === 'titulo-seo' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-white select-all">
                    {result.titulo_seo}
                  </p>
                </div>
              </div>
            )}

            {/* Legenda na Tela */}
            {result.legenda_na_tela && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-amber-400" />
                        Legenda na Tela / Sticker
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                        {countWords(result.legenda_na_tela)}/5 pal.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(result.legenda_na_tela!, 'legenda-na-tela')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-700"
                      title="Copiar legenda na tela"
                    >
                      {copiedKey === 'legenda-na-tela' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-amber-300 italic select-all">
                    "{result.legenda_na_tela}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hashtags */}
          {result.hashtags && result.hashtags.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  Hashtags Recomendadas ({result.hashtags.length} tags)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(result.hashtags!.join(' '), 'hashtags')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-700"
                  title="Copiar todas as hashtags"
                >
                  {copiedKey === 'hashtags' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copiadas!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar Hashtags</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {result.hashtags.map((tag, idx) => {
                  const isPublicidade = tag.toLowerCase() === '#publicidade';
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium ${
                        isPublicidade
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-slate-800/90 border border-slate-700 text-slate-300'
                      }`}
                    >
                      {tag}
                      {isPublicidade && <span className="ml-1 text-[10px] text-amber-400 font-bold">★ obrigatório</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Legacy 3-Scene Table (Backward Compatibility for Saved Items) */}
      {isLegacyFormat && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Tabela de Geração (Formato Anterior de 3 Cenas)
                </h3>
                <span className="text-[11px] text-amber-400 font-medium">
                  Item salvo em formato legado
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              3 Cenas • 10-15 segundos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 w-32">Cena & Tempo</th>
                  <th className="py-3 px-4 w-1/2">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-amber-400" />
                      Prompt Visual (Inglês)
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-orange-400" />
                      Locução / Áudio (Português)
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {result.scenes!.map((scene, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-4 px-4 align-top">
                      <div className="font-bold text-xs text-white mb-1.5">
                        {scene.scene_title}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        {scene.duration}
                      </span>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="relative group bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 font-mono text-xs text-slate-200 leading-relaxed">
                        <p className="pr-8 select-all">
                          {scene.visual_prompt}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(scene.visual_prompt, `scene-prompt-${idx}`)}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shadow"
                          title="Copiar prompt"
                        >
                          {copiedKey === `scene-prompt-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="relative group bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 text-xs text-slate-100 leading-relaxed font-sans">
                        <p className="pr-8 select-all italic font-medium">
                          "{scene.voiceover}"
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(scene.voiceover, `scene-audio-${idx}`)}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shadow"
                          title="Copiar locução"
                        >
                          {copiedKey === `scene-audio-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
