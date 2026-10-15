import React, { useState, useRef, useEffect } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  Link as LinkIcon,
  Sparkles,
  Zap,
  Plus
} from 'lucide-react';

interface ImageDropProps {
  onGenerate: (
    imagesBase64: string[],
    mimeType: string | undefined,
    context: string,
    force: boolean
  ) => void;
  isLoading: boolean;
}

const MAX_IMAGES = 4;

export const ImageDrop: React.FC<ImageDropProps> = ({ onGenerate, isLoading }) => {
  const [images, setImages] = useState<string[]>([]);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [context, setContext] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Allow global Ctrl+V paste of images
  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    setMimeType('image/jpeg');
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        let finalDataUrl = rawDataUrl;
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          finalDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }

        setImages((prev) => {
          if (prev.length >= MAX_IMAGES) {
            alert(`Você já atingiu o limite de ${MAX_IMAGES} imagens.`);
            return prev;
          }
          return [...prev, finalDataUrl];
        });
      };
      img.onerror = () => {
        setImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, rawDataUrl];
        });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      files.slice(0, MAX_IMAGES - images.length).forEach((file) => processFile(file));
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
      files.slice(0, MAX_IMAGES - images.length).forEach((file) => processFile(file));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (force: boolean = false) => {
    if (images.length === 0 && !context.trim()) {
      alert('Por favor, envie ao menos uma foto do produto ou descreva o produto no campo de contexto.');
      return;
    }
    onGenerate(images, mimeType, context, force);
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Upload Drop Zone & Gallery */}
        <div className="w-full md:w-1/2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/*"
            multiple
            className="hidden"
          />

          {images.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : 'border-slate-700 hover:border-amber-500/60 bg-slate-950/50 hover:bg-slate-900/50'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="font-semibold text-slate-200 text-base mb-1">
                Arraste até 4 prints da Shopee aqui
              </h4>
              <p className="text-slate-400 text-xs mb-3">
                Foto principal, close no detalhe, ângulo de uso ou tabela de medidas
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-[11px] font-medium text-slate-300">
                <Zap className="w-3 h-3 text-amber-400" /> Dica: Cole com <kbd className="font-mono bg-slate-700 px-1 rounded text-amber-300">Ctrl+V</kbd>
              </span>
            </div>
          ) : (
            <div className="h-64 bg-slate-950/80 border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              
              {/* Gallery Grid */}
              <div className="grid grid-cols-2 gap-2.5 h-[180px] overflow-hidden">
                {images.map((imgSrc, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-lg overflow-hidden border bg-slate-900 flex items-center justify-center group ${
                      idx === 0 ? 'border-amber-500/70 shadow-sm shadow-amber-500/20' : 'border-slate-800'
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={`Produto ${idx + 1}`}
                      className="h-full w-full object-contain p-1"
                    />

                    {/* Tag identifying role */}
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-950/90 text-slate-200 border border-slate-800">
                      {idx === 0 ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <ImageIcon className="w-2.5 h-2.5" /> Start Frame
                        </span>
                      ) : (
                        `Ref ${idx + 1}`
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add more slot if < 4 */}
                {images.length < MAX_IMAGES && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-700 hover:border-amber-400/60 rounded-lg flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-amber-400 transition-colors p-2 text-center"
                  >
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-medium">+ Adicionar Foto</span>
                    <span className="text-[9px] text-slate-500">({images.length}/{MAX_IMAGES})</span>
                  </div>
                )}
              </div>

              {/* Bottom footer status */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <span>
                  <strong className="text-amber-400">{images.length}</strong> de {MAX_IMAGES} fotos carregadas
                </span>
                <button
                  type="button"
                  onClick={() => setImages([])}
                  className="text-rose-400 hover:text-rose-300 font-medium text-[11px]"
                >
                  Limpar todas
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Context and Notes Column */}
        <div className="w-full md:w-1/2 flex flex-col justify-between">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-amber-400" />
              Link ou Instrução de Venda (Opcional):
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Cole o link do produto da Shopee ou adicione notas específicas:&#10;Ex: 'Foco no tecido térmico', 'Preço de R$ 39,90 com frete grátis', 'Público: pessoas com dor nas costas'..."
              rows={7}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-500 resize-none transition-all outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Otimizado exclusivamente para Google Veo: vídeo contínuo de 10s com locução embutida.
            </p>
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          disabled={isLoading || (images.length === 0 && !context.trim())}
          onClick={() => handleSubmit(false)}
          className="flex-1 py-3 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          {isLoading ? 'Analisando...' : 'Diagnosticar & Gerar Roteiro'}
        </button>

        <button
          type="button"
          disabled={isLoading || (images.length === 0 && !context.trim())}
          onClick={() => handleSubmit(true)}
          title="Pula as perguntas de esclarecimento e gera direto com a melhor suposição"
          className="py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 text-slate-300 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Geração Direta (Sem Perguntas)
        </button>
      </div>

    </div>
  );
};
