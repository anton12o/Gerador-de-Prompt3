export interface ClarificationQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface SceneItem {
  scene_number: number;
  scene_title: string;
  duration: string;
  visual_prompt: string;
  voiceover: string;
}

export interface MultipleHooks {
  dor: string;
  curiosidade: string;
  quebra_de_padrao: string;
}

export interface ScriptResult {
  status: 'needs_clarification' | 'completed';
  diagnosis: string;
  category?: string;
  clarification_questions?: ClarificationQuestion[];
  multiple_hooks?: MultipleHooks;
  selected_hook_type?: string;
  scenes?: SceneItem[];
  internal_checklist?: string[];
  refinement_summary?: string;
}

export interface GenerateScriptPayload {
  image_base64?: string;
  images_base64?: string[];
  image_mime_type?: string;
  context?: string;
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
