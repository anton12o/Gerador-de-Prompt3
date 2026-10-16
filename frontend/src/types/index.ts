export interface ClarificationQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface HookOption {
  tipo: string;
  fala: string;
  acao_visual_0_3s: string;
  palavras_contadas?: number;
  caracteres_contados?: number;
}

export interface MultipleHooks {
  dor: HookOption;
  curiosidade: HookOption;
  quebra_de_padrao: HookOption;
}

export interface ScriptPartes {
  descricao_produto: string;
  descricao_cenario: string;
  fala_beneficio: string;
  bloco_beneficio_visual: string;
  fala_cta: string;
  bloco_cta_visual: string;
}

export interface ContagemBlocos {
  gancho: number;
  beneficio: number;
  cta: number;
  dor: number;
  curiosidade: number;
  quebra_de_padrao: number;
  caracteres_gancho?: number;
  caracteres_beneficio?: number;
  caracteres_cta?: number;
  caracteres_total?: number;
  caracteres_dor?: number;
  caracteres_curiosidade?: number;
  caracteres_quebra_de_padrao?: number;
}

export interface SceneItem {
  scene_number: number;
  scene_title: string;
  duration: string;
  visual_prompt: string;
  voiceover: string;
}

export interface ScriptResult {
  status: 'needs_clarification' | 'completed';
  diagnosis: string;
  category?: string;
  clarification_questions?: ClarificationQuestion[];
  partes?: ScriptPartes;
  multiple_hooks?: MultipleHooks;
  selected_hook_type?: string;
  prompt_veo?: string;
  locucao_pt?: string;
  total_palavras?: number;
  total_caracteres?: number;
  contagem_blocos?: ContagemBlocos;
  modelo_utilizado?: string;
  scenes?: SceneItem[]; // Suporte a registros legados
  refinement_summary?: string;
  titulo_seo?: string;
  legenda_na_tela?: string;
  hashtags?: string[];
}

export interface GenerateScriptPayload {
  image_base64?: string;
  images_base64?: string[];
  image_mime_type?: string;
  context?: string;
  termos_autocomplete?: string;
  style_preset?: 'ugc_realista' | 'cinematic_studio' | 'macro_produto';
  video_engine?: 'veo3' | 'dreamina' | 'kling' | 'luma';
  force_generation?: boolean;
  clarification_answers?: Record<string, string>;
  previous_response?: ScriptResult;
  refinement_instruction?: string;
}

export interface SavedScriptItem {
  id: string;
  createdAt: string;
  productSummary: string;
  category?: string;
  result: ScriptResult;
}
