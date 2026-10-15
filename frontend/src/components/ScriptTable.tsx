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
  Download
} from 'lucide-react';
import type { ScriptResult } from '../types';

interface ScriptTableProps {
  result: ScriptResult;
}

export const ScriptTable: React.FC<ScriptTableProps> = ({ result }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const generateFormattedText = () => {
    if (!result.scenes) return '';

    let text = `========================================================\n`;
    text += `   ROTEIRO SHOPEE VÍDEO (Tech Lemonade Logic v3.0)\n`;
    text += `========================================================\n\n`;
    text += `DIAGNÓSTICO DO CONSULTOR: ${result.diagnosis}\n`;
    if (result.category) text += `CATEGORIA: ${result.category}\n`;
    if (result.refinement_summary) text += `REFINAMENTO APLICADO: ${result.refinement_summary}\n`;
    text += `\n`;

    if (result.multiple_hooks) {
      text += `--------------------------------------------------------\n`;
      text += `1. ALTERNATIVAS DE GANCHOS (TESTE A/B/C PARA CENA 1)\n`;
      text += `--------------------------------------------------------\n`;
      text += `[A - DOR]: ${result.multiple_hooks.dor}\n`;
      text += `[B - CURIOSIDADE]: ${result.multiple_hooks.curiosidade}\n`;
      text += `[C - QUEBRA DE PADRÃO]: ${result.multiple_hooks.quebra_de_padrao}\n\n`;
    }

    text += `--------------------------------------------------------\n`;
    text += `2. TABELA DE CENAS PARA IA DE VÍDEO (VEO3 / DREAMINA / KLING)\n`;
    text += `--------------------------------------------------------\n`;
    result.scenes.forEach((scene) => {
      text += `\n[${scene.scene_title}] (${scene.duration})\n`;
      text += `🎥 PROMPT VISUAL (Inglês):\n${scene.visual_prompt}\n`;
      text += `🎙️ LOCUÇÃO / ÁUDIO (Português):\n"${scene.voiceover}"\n`;
    });

    return text;
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
    link.download = `roteiro_shopee_${result.category || 'produto'}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
                Estratégia de neurovendas e adaptação cinematográfica
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Checklist Interno Validado:
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            10-15s Total
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            Prompts Veo3 em Inglês
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            3 Cenas Modulares
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
            Zero Alucinações
          </span>
          <span className="text-[11px] px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-md font-semibold">
            Hero Shot na CTA (Zero Telas/Textos)
          </span>
        </div>
      </div>

      {/* 2. Multiple Hooks Section */}
      {result.multiple_hooks && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              2. Múltiplos Ganchos para Cena 1 (Teste A/B/C)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Hook 1: Dor */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded">
                    Gancho 1: Dor / Problema
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.multiple_hooks!.dor, 'hook-dor')}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title="Copiar gancho"
                  >
                    {copiedKey === 'hook-dor' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  "{result.multiple_hooks.dor}"
                </p>
              </div>
            </div>

            {/* Hook 2: Curiosidade */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded">
                    Gancho 2: Curiosidade / Segredo
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.multiple_hooks!.curiosidade, 'hook-curiosidade')}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title="Copiar gancho"
                  >
                    {copiedKey === 'hook-curiosidade' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  "{result.multiple_hooks.curiosidade}"
                </p>
              </div>
            </div>

            {/* Hook 3: Quebra de Padrão */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded">
                    Gancho 3: Quebra de Padrão
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.multiple_hooks!.quebra_de_padrao, 'hook-quebra')}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title="Copiar gancho"
                  >
                    {copiedKey === 'hook-quebra' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  "{result.multiple_hooks.quebra_de_padrao}"
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. The Veo3 3-Scene Table */}
      {result.scenes && result.scenes.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white tracking-wide">
                3. Tabela de Geração (Pronta para Veo3 / Dreamina)
              </h3>
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
                      Prompt Visual Veo3 (Inglês)
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
                {result.scenes.map((scene, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/40 transition-colors">
                    
                    {/* Scene & Time */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-bold text-xs text-white mb-1.5">
                        {scene.scene_title}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        {scene.duration}
                      </span>
                    </td>

                    {/* Veo3 Visual Prompt in English */}
                    <td className="py-4 px-4 align-top">
                      <div className="relative group bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 font-mono text-xs text-slate-200 leading-relaxed">
                        <p className="pr-8 select-all">
                          {scene.visual_prompt}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(scene.visual_prompt, `scene-prompt-${idx}`)}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shadow"
                          title="Copiar prompt em inglês para Veo3"
                        >
                          {copiedKey === `scene-prompt-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Portuguese Voiceover Copy */}
                    <td className="py-4 px-4 align-top">
                      <div className="relative group bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 text-xs text-slate-100 leading-relaxed font-sans">
                        <p className="pr-8 select-all italic font-medium">
                          "{scene.voiceover}"
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(scene.voiceover, `scene-audio-${idx}`)}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shadow"
                          title="Copiar locução em português"
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
