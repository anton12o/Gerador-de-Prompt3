import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import type { ClarificationQuestion } from '../types';

interface ClarificationBoxProps {
  diagnosis: string;
  category?: string;
  questions: ClarificationQuestion[];
  onSubmitAnswers: (answers: Record<string, string>) => void;
  onForceGeneration: () => void;
  isLoading: boolean;
}

export const ClarificationBox: React.FC<ClarificationBoxProps> = ({
  diagnosis,
  category,
  questions,
  onSubmitAnswers,
  onForceGeneration,
  isLoading,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const handleSelectOption = (questionId: string, option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleCustomChange = (questionId: string, value: string) => {
    setCustomAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    if (value.trim()) {
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: value,
      }));
    }
  };

  const handleSubmit = () => {
    // If not all answered, fill with selected or fallback
    const answers: Record<string, string> = {};
    questions.forEach((q) => {
      answers[q.id] = selectedAnswers[q.id] || q.options[0] || 'Opção Padrão';
    });
    onSubmitAnswers(answers);
  };

  return (
    <div className="w-full bg-gradient-to-b from-amber-950/30 to-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md animate-fade-in">
      {/* Decorative top badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-amber-500/20">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
          <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
            <HelpCircle className="w-5 h-5 text-amber-400" />
          </div>
          <span>Filtro de Ambiguidade Ativo (Tech Lemonade)</span>
        </div>

        {category && (
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-full">
            Categoria: {category}
          </span>
        )}
      </div>

      {/* Diagnosis message */}
      <div className="mb-6 p-4 bg-slate-950/70 border border-amber-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            Diagnóstico do Consultor de Neurovendas
          </h4>
          <p className="text-slate-200 text-sm leading-relaxed">
            {diagnosis}
          </p>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-6 mb-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-3">
            <h5 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                {idx + 1}
              </span>
              {q.question}
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {q.options.map((option, optIdx) => {
                const isSelected = selectedAnswers[q.id] === option;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(q.id, option)}
                    className={`text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        Opção {optIdx + 1}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                    </div>
                    <span className="text-xs text-slate-200 font-medium leading-relaxed">
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional write-in answer */}
            <div className="mt-2">
              <input
                type="text"
                placeholder="Ou escreva uma instrução própria para esta pergunta..."
                value={customAnswers[q.id] || ''}
                onChange={(e) => handleCustomChange(q.id, e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-all"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-400">
          Escolha uma das opções acima para alimentar o roteiro exato no Veo3.
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={isLoading}
            onClick={onForceGeneration}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Pular e Gerar Direto
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <span>{isLoading ? 'Gerando Roteiro...' : 'Confirmar Escolha & Gerar Roteiro'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
