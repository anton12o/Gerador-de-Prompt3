import base64
import json
import logging
import time
from typing import Optional, List, Dict, Any
from google import genai
from google.genai import types

from app.core.config import settings
from app.prompts.system import SYSTEM_PROMPT
from app.schemas.script import ScriptResult, GenerateScriptRequest

logger = logging.getLogger(__name__)

# List of models in order of preference for high-availability
FALLBACK_MODELS = [
    settings.DEFAULT_MODEL,     # gemini-3.8-flash
    "gemini-3.5-flash-lite",    # High-throughput, fast, low latency
    "gemini-3.1-flash-lite"
]

class GeminiService:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY não foi configurada no arquivo .env.")
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.DEFAULT_MODEL

    def _decode_image(self, image_data: str, fallback_mime: str = "image/jpeg"):
        try:
            if "," in image_data:
                header, base64_str = image_data.split(",", 1)
                mime = fallback_mime
                if "data:" in header and ";base64" in header:
                    mime = header.split(";")[0].replace("data:", "").strip()
                return base64.b64decode(base64_str), mime
            return base64.b64decode(image_data), fallback_mime
        except Exception as e:
            logger.error(f"Erro ao decodificar imagem base64: {e}")
            raise ValueError("Formato de imagem base64 inválido.")

    async def generate_script(self, request: GenerateScriptRequest) -> ScriptResult:
        contents: List[Any] = []

        # 1. Process multiple or single images if provided
        all_images: List[str] = []
        if request.images_base64 and len(request.images_base64) > 0:
            all_images = request.images_base64
        elif request.image_base64:
            all_images = [request.image_base64]

        for idx, img_b64 in enumerate(all_images):
            try:
                img_bytes, mime = self._decode_image(img_b64, request.image_mime_type or "image/jpeg")
                image_part = types.Part.from_bytes(data=img_bytes, mime_type=mime)
                contents.append(image_part)
            except Exception as e:
                logger.warning(f"Falha ao carregar imagem {idx + 1}: {e}")

        # 2. Build the instruction prompt based on the state
        prompt_parts: List[str] = []

        if len(all_images) > 1:
            prompt_parts.append(
                f"OBSERVAÇÃO MULTI-IMAGEM: O usuário forneceu {len(all_images)} fotos de ângulos/detalhes diferentes do produto. "
                "Considere a PRIMEIRA imagem como o Start Frame obrigatório para a Cena 1 (Gancho) e use as imagens adicionais como referência de textura, ângulos secundários e benefícios para as Cenas 2 e 3.\n"
            )

        if request.style_preset:
            presets = {
                "ugc_realista": "ESTILO VISUAL OBRIGATÓRIO: UGC REALISTA ORGÂNICO (POV amador gravado com iPhone, câmera na mão com leve movimento natural, iluminação ambiente realista de casa/quarto, visual de review autêntico de cliente do TikTok/Shopee que gera alta identificação e confiança imediata).",
                "cinematic_studio": "ESTILO VISUAL OBRIGATÓRIO: COMERCIAL CINEMATOGRÁFICO (4K Ultra-HD, estúdio profissional, iluminação dramática de 3 pontos, tracking suave de gimbal, profundidade de campo f/1.8, visual premium de marca).",
                "macro_produto": "ESTILO VISUAL OBRIGATÓRIO: MACRO & TEXTURA (Foco extremo nos detalhes de fabricação, acabamento, close-ups de 100mm, iluminação reflexiva de produto, rotação de mesa giratória)."
            }
            prompt_parts.append(presets.get(request.style_preset, presets["ugc_realista"]) + "\n")

        if request.video_engine:
            engine_notes = {
                "veo3": "FERRAMENTA DE VÍDEO ALVO: Google Veo3. Use descrições completas de câmera (macro, dolly-in, whip-pan, cinematic lighting) e mencione o produto como start frame.",
                "dreamina": "FERRAMENTA DE VÍDEO ALVO: CapCut Dreamina. Mantenha os prompts concisos em inglês, focando no primeiro segundo de impacto visual e adicione a tag vertical '9:16 vertical video'.",
                "kling": "FERRAMENTA DE VÍDEO ALVO: Kling AI. Especifique dinamicidade de movimento corporal e físico detalhado em inglês.",
                "luma": "FERRAMENTA DE VÍDEO ALVO: Luma Dream Machine. Priorize continuidade de movimento de câmera em primeira pessoa (first-person POV camera movement)."
            }
            prompt_parts.append(engine_notes.get(request.video_engine, engine_notes["veo3"]) + "\n")

        if request.context:
            prompt_parts.append(f"CONTEXTO DO PRODUTO / LINK / NOTA DO USUÁRIO:\n{request.context.strip()}\n")

        # Refinement turn
        if request.refinement_instruction:
            prompt_parts.append("MODO DE OPERAÇÃO: REFINAMENTO ITERATIVO")
            if request.previous_response:
                prompt_parts.append(f"ROTEIRO ANTERIOR GERADO:\n{json.dumps(request.previous_response, ensure_ascii=False, indent=2)}\n")
            prompt_parts.append(
                f"PEDIDO DE REFINAMENTO DO USUÁRIO: \"{request.refinement_instruction}\"\n"
                "INSTRUÇÕES DE REFINAMENTO:\n"
                "- Identifique com precisão qual variável estratégica você está alterando (ex: Gancho de Dor para Curiosidade, duração, ritmo, câmera Veo3).\n"
                "- Preencha o campo `refinement_summary` explicando detalhadamente o que foi mudado e por quê.\n"
                "- Retorne `status: 'completed'` com o roteiro atualizado, 3 ganchos ajustados e a tabela de 3 cenas (0-3s, 3-8s, 8-10s).\n"
            )

        # Follow-up with clarification answers
        elif request.clarification_answers:
            prompt_parts.append("MODO DE OPERAÇÃO: PÓS-DIAGNÓSTICO (RESPOSTAS DO USUÁRIO RECEBIDAS)")
            answers_text = "\n".join([f"- Pergunta/Opção: {ans}" for k, ans in request.clarification_answers.items()])
            prompt_parts.append(
                f"RESPOSTAS DO USUÁRIO:\n{answers_text}\n\n"
                "INSTRUÇÃO:\n"
                "O usuário já definiu o diferencial do produto. PARE de fazer perguntas de esclarecimento.\n"
                "Execute o checklist interno e gere o roteiro final completo com `status: 'completed'`.\n"
                "Inclua o diagnóstico em 1 linha, as 3 opções de ganchos (Dor, Curiosidade, Quebra de Padrão) e a tabela com as 3 cenas para Veo3 e locução em PT-BR."
            )

        # Force generation mode
        elif request.force_generation:
            prompt_parts.append("MODO DE OPERAÇÃO: GERAÇÃO DIRETA FORÇADA")
            prompt_parts.append(
                "O usuário solicitou geração direta sem perguntas adicionais.\n"
                "Defina o ângulo de venda mais promissor e persuasivo a partir da imagem/contexto.\n"
                "Execute a autocrítica interna e retorne `status: 'completed'` com a tabela completa das 3 cenas (10-15s), os 3 ganchos e os prompts em inglês para Veo3."
            )

        # First turn: Ambiguity filter active
        else:
            prompt_parts.append("MODO DE OPERAÇÃO: FILTRO DE AMBIGUIDADE ATIVO (TECH LEMONADE)")
            prompt_parts.append(
                "Avalie criticamente a imagem e o contexto fornecidos:\n"
                "1. Se o produto tiver múltiplos ângulos de venda possíveis, ou se for genérico (ex: blusa básica, copo térmico comum, organizador) e não estiver evidente a dor específica a ser atacada:\n"
                "   -> Ative `status: 'needs_clarification'`.\n"
                "   -> Crie de 1 a 2 perguntas de múltipla escolha com 3 alternativas claras cada (ex: 1. Caimento e fit, 2. Tecido térmico e proteção, 3. Custo-benefício) para que o usuário decida o ângulo.\n"
                "   -> Deixe os campos `scenes` e `multiple_hooks` como null neste momento.\n\n"
                "2. Se a imagem e o contexto já forem claros, específicos e com diferencial evidente (ex: produto com função única comprovada):\n"
                "   -> Execute a autocrítica interna e retorne `status: 'completed'` com a tabela completa de 3 cenas (0-3s, 3-8s, 8-10s) e os 3 ganchos para a Cena 1."
            )

        prompt_parts.append(
            "\nDIRETRIZES TÉCNICAS OBRIGATÓRIAS (ATUALIZAÇÃO DE MOTOR):\n"
            "1. ALINHAMENTO ESPACIAL DE PERIFÉRICOS: Em itens de tecnologia/setup (mouse, teclado, headset), defina a posição física exata.\n"
            "   - Mouse na Cena 2: 'gaming mouse naturally positioned on the right side of the keyboard, facing forward, properly aligned on the mousepad'.\n"
            "   - Mouse no Hero Shot (Cena 3): 'front-three-quarter view of the gaming mouse, facing forward towards the camera, clean desk alignment, perfectly centered'.\n"
            "2. ILUMINAÇÃO DRAMÁTICA (ZERO LUZ LAVADA): Proibido iluminação amarelada ou fraca. Use sempre: 'dramatic cinematic lighting, high-contrast RGB neon highlights, rim lighting on metallic and plastic textures, 4k photorealistic product shoot'.\n"
            "3. BLINDAGEM DE CTA (HERO SHOT RÍGIDO): A Cena 3 NUNCA deve pedir telas de celular, apps ou textos. Deve ser uma tomada fechada épica do produto físico.\n"
            "   - Cláusula Negativa Obrigatória no final do prompt da Cena 3: 'clean commercial footage, no text, no letters, no words, no phone screens, no UI interfaces, no fake app mockups'.\n"
            "4. SINTAXE DE LOCUÇÃO (ÁUDIO LIMPO): Use frases curtas, objetivas e gramaticalmente perfeitas para que sintetizadores de voz (TTS) não engasguem nem cortem palavras.\n"
        )

        contents.append("\n".join(prompt_parts))

        # 3. Call Gemini with Structured Outputs and automatic fallback
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=ScriptResult,
            temperature=0.7,
        )

        last_error = None
        for model_candidate in FALLBACK_MODELS:
            for attempt in range(2):
                try:
                    logger.info(f"Enviando requisição para modelo: {model_candidate} (tentativa {attempt + 1})")
                    response = self.client.models.generate_content(
                        model=model_candidate,
                        contents=contents,
                        config=config,
                    )

                    if response.text:
                        data = json.loads(response.text)
                        result = ScriptResult.model_validate(data)
                        return result
                except Exception as e:
                    last_error = e
                    logger.warning(f"Tentativa com {model_candidate} falhou: {e}")
                    time.sleep(1)

        logger.error(f"Todos os modelos falharam. Último erro: {last_error}")
        raise RuntimeError(f"Falha ao gerar roteiro após tentativas de fallback: {str(last_error)}")

gemini_service = GeminiService()
