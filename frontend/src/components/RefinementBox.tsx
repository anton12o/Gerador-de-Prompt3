import React, { useState } from 'react';
import { Send, RefreshCw, Wand2, MessageSquare } from 'lucide-react';

interface RefinementBoxProps {
  onRefine: (instruction: string) => void;
  isLoading: boolean;
}

const QUICK_ACTIONS = [
  { label: '🎯 Trocar Gancho para Curiosidade', instruction: 'Troque o gancho da Cena 1 para a opção de Curiosidade e ajuste a locução mantendo a coerência.' },
  { label: '⚡ Mais Dinâmico / Rápido', instruction: 'Deixe o ritmo do vídeo mais dinâmico, com cortes rápidos e locução mais ágil e impactante.' },
  { label: '🔥 Gancho de Quebra de Padrão', instruction: 'Altere o início para um gancho de Quebra de Padrão visual e auditiva extrema.' },
  { label: '🎥 Focar em Macro e Textura (Veo3)', instruction: 'Ajuste os prompts visuais do Veo3 para focar em close-up macro, textura do material e iluminação de produto.' },
  { label: '🛍️ CTA com Mais Urgência', instruction: 'Reescreva a Cena 3 focando em escassez extrema (últimas unidades com frete grátis).' },
];

export const RefinementBox: React.FC<RefinementBoxProps> = ({ onRefine, isLoading }) => {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;
    onRefine(instruction);
    setInstruction('');
  };

  const handleQuickAction = (actionText: string) => {
    if (isLoading) return;
    onRefine(actionText);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 mb-3">
        <Wand2 className="w-5 h-5 text-amber-400" />
        <h3 className="text-base font-bold text-white tracking-wide">
          Refinamento Iterativo (Tech Lemonade Logic)
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Diga o que deseja alterar. A IA aplicará uma regra de refinamento rastreada sem desmanchar a coerência do roteiro.
      </p>

      {/* Quick refinement pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_ACTIONS.map((action, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleQuickAction(action.instruction)}
            className="px-3 py-1.5 bg-slate-950 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 text-xs font-medium rounded-lg transition-all"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Custom input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={isLoading}
            placeholder="Ex: 'Mude o tom para algo mais bem-humorado', 'Foque no problema de suor excessivo'..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all pr-10"
          />
          <MessageSquare className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
        </div>

        <button
          type="submit"
          disabled={isLoading || !instruction.trim()}
          className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all shrink-0"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
          ) : (
            <Send className="w-4 h-4 text-slate-950" />
          )}
          <span>{isLoading ? 'Refinando...' : 'Refinar'}</span>
        </button>
      </form>
    </div>
  );
};
