import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Film } from 'lucide-react';

interface LoaderProps {
  message?: string;
}

const STEPS = [
  'Decodificando imagem e contexto...',
  'Ativando Filtro de Ambiguidade (Tech Lemonade)...',
  'Consultando regras de neurovendas e retenção...',
  'Executando autocrítica invisível e checklist...',
  'Ajustando prompts de câmera para Google Veo3...',
  'Finalizando roteiro de alta conversão...'
];

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md shadow-2xl">
      <div className="relative mb-6">
        {/* Glowing aura */}
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-orange-500/30 to-rose-500/20 rounded-full blur-xl animate-pulse" />
        
        {/* Core animated icon */}
        <div className="relative flex items-center justify-center w-20 h-20 bg-slate-950 border border-amber-500/40 rounded-2xl shadow-inner">
          <Brain className="w-10 h-10 text-amber-400 animate-pulse" />
          <Sparkles className="w-5 h-5 text-orange-400 absolute -top-2 -right-2 animate-bounce" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-white tracking-wide mb-2 flex items-center gap-2">
        <Film className="w-5 h-5 text-amber-400" />
        {message || 'Mestre Gerador em Ação'}
      </h3>

      <p className="text-amber-300 font-medium text-sm tracking-wide h-6 transition-all duration-300 animate-fade-in">
        {STEPS[currentStepIndex]}
      </p>

      {/* Mini checklist dots */}
      <div className="flex items-center gap-2 mt-6">
        {STEPS.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentStepIndex
                ? 'w-6 bg-amber-400 shadow-sm shadow-amber-500/50'
                : idx < currentStepIndex
                ? 'w-2 bg-emerald-500'
                : 'w-2 bg-slate-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
