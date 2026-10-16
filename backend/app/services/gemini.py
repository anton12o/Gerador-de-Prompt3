import asyncio
import base64
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from google import genai
from google.genai import types

from app.core.config import settings
from app.prompts.system import SYSTEM_PROMPT
from app.schemas.script import (
    ScriptResult,
    ScriptModelOutput,
    ContagemBlocos,
    GenerateScriptRequest,
    ScriptPartes,
    HookOption,
    MultipleHooks,
)

logger = logging.getLogger(__name__)

# Modelos por prioridade: modelos de alta velocidade/cota primeiro, seguidos pelo default
FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",    # Alta cota gratuita (1500 req/dia), ultra-rápido (< 2s)
    "gemini-3.1-flash-lite",    # Modelo secundário leve e estável
    settings.DEFAULT_MODEL,     # gemini-3.8-flash (cota de 20 req/dia no tier gratuito)
]

# ==============================================================================
# CONSTANTES DE CALIBRAÇÃO DE LOCUÇÃO (HIPÓTESES AJUSTÁVEIS)
# ==============================================================================
MAX_WORDS_HOOK = 7
MAX_WORDS_BENEFIT = 11
MAX_WORDS_CTA = 5
MIN_WORDS_TOTAL = 18
MAX_WORDS_TOTAL = 23

MAX_CHARS_HOOK = 45
MAX_CHARS_BENEFIT = 70
MAX_CHARS_CTA = 35
MAX_CHARS_TOTAL = 150

# Timeout estrito da API Gemini no backend (para abortar antes dos 60s do React)
GEMINI_TIMEOUT_SECONDS = 50.0

# ==============================================================================
# ESQUELETO DO PROMPT VISUAL DO GOOGLE VEO (HARDCODED / CHUMBADO)
# Inclui Anchor Prompts espaciais rígidos contra alucinações físicas
# ==============================================================================
VEO_HEADER_TEMPLATE = (
    "Using the provided product photo as reference: {descricao_produto}, placed on {descricao_cenario}. "
    "Clean commercial footage, clean surfaces, plain background, "
    "all product parts firmly anchored with rigid physical connections and realistic gravity, no floating parts, no morphing structures, "
    "no phone screens, no UI interfaces, no fake app mockups, "
    "no subtitles, no on-screen text, no background music, no other voices, no text, no letters, no words."
)

VEO_BLOCK_0_3_TEMPLATE = (
    '[0-3s]: {acao_visual_0_3s} '
    'Portuguese voiceover narration says: "{fala}" in a natural, clear tone (no background music, no other voices).'
)

VEO_BLOCK_3_7_TEMPLATE = (
    '[3-7s]: {bloco_beneficio_visual} '
    'Portuguese voiceover narration says: "{fala}" in a natural, clear tone (no background music, no other voices).'
)

VEO_BLOCK_7_10_TEMPLATE = (
    '[7-10s]: {bloco_cta_visual} '
    'Portuguese voiceover narration says: "{fala}" in a natural, clear tone (no background music, no other voices).'
)


def montar_prompt_veo(partes: ScriptPartes, gancho_escolhido: HookOption) -> str:
    """
    Monta deterministicamente o prompt contínuo de 10s para o Google Veo:
    - Cabeçalho: descrição física do produto ancorada na foto + Anti-UI unificado + Anchor Prompts
    - [0-3s]: Ação com movimento dinâmico obrigatório + narração em off em PT-BR
    - [3-7s]: Benefício em ação + narração em off em PT-BR
    - [7-10s]: Hero shot glorioso macro com repetição estrutural das partes + CTA em PT-BR
    - Cada fala com diretiva 'no background music, no other voices'
    """
    cabecalho = VEO_HEADER_TEMPLATE.format(
        descricao_produto=partes.descricao_produto.strip(),
        descricao_cenario=partes.descricao_cenario.strip(),
    )
    bloco_0_3 = VEO_BLOCK_0_3_TEMPLATE.format(
        acao_visual_0_3s=gancho_escolhido.acao_visual_0_3s.strip(),
        fala=gancho_escolhido.fala.strip(),
    )
    bloco_3_7 = VEO_BLOCK_3_7_TEMPLATE.format(
        bloco_beneficio_visual=partes.bloco_beneficio_visual.strip(),
        fala=partes.fala_beneficio.strip(),
    )
    bloco_7_10 = VEO_BLOCK_7_10_TEMPLATE.format(
        bloco_cta_visual=partes.bloco_cta_visual.strip(),
        fala=partes.fala_cta.strip(),
    )
    return f"{cabecalho}\n\n{bloco_0_3}\n\n{bloco_3_7}\n\n{bloco_7_10}"


def montar_locucao_pt(gancho_fala: str, beneficio_fala: str, cta_fala: str) -> str:
    """Monta a locução textual integral em Português."""
    return f"{gancho_fala.strip()} {beneficio_fala.strip()} {cta_fala.strip()}".strip()


def validar_e_contar_palavras(result: ScriptResult) -> tuple[bool, str, ContagemBlocos]:
    """
    Validação Híbrida (Caracteres + Palavras) para caber em exatos 10s:
    - Utiliza constantes calibráveis no topo do arquivo (fáceis de calibrar).
    - Palavras: Gancho <= MAX_WORDS_HOOK, Benefício <= MAX_WORDS_BENEFIT, CTA <= MAX_WORDS_CTA, Total entre MIN_WORDS_TOTAL e MAX_WORDS_TOTAL.
    - Caracteres: Gancho <= MAX_CHARS_HOOK, Benefício <= MAX_CHARS_BENEFIT, CTA <= MAX_CHARS_CTA, Total <= MAX_CHARS_TOTAL.
    """
    if not result.partes or not result.multiple_hooks:
        return True, "", ContagemBlocos()

    hooks = result.multiple_hooks
    partes = result.partes

    f_dor = hooks.dor.fala.strip()
    f_cur = hooks.curiosidade.fala.strip()
    f_qp = hooks.quebra_de_padrao.fala.strip()
    f_ben = partes.fala_beneficio.strip()
    f_cta = partes.fala_cta.strip()

    c_dor = len(f_dor.split())
    c_cur = len(f_cur.split())
    c_qp = len(f_qp.split())
    c_ben = len(f_ben.split())
    c_cta = len(f_cta.split())

    char_dor = len(f_dor)
    char_cur = len(f_cur)
    char_qp = len(f_qp)
    char_ben = len(f_ben)
    char_cta = len(f_cta)

    # Preenche contagens calculadas diretamente nos objetos de gancho
    hooks.dor.palavras_contadas = c_dor
    hooks.dor.caracteres_contados = char_dor
    hooks.curiosidade.palavras_contadas = c_cur
    hooks.curiosidade.caracteres_contados = char_cur
    hooks.quebra_de_padrao.palavras_contadas = c_qp
    hooks.quebra_de_padrao.caracteres_contados = char_qp

    hook_ativo = hooks.dor
    char_gancho_ativo = char_dor
    if result.selected_hook_type == "curiosidade":
        hook_ativo = hooks.curiosidade
        char_gancho_ativo = char_cur
    elif result.selected_hook_type == "quebra_de_padrao":
        hook_ativo = hooks.quebra_de_padrao
        char_gancho_ativo = char_qp

    c_gancho_ativo = len(hook_ativo.fala.strip().split())
    c_total = c_gancho_ativo + c_ben + c_cta

    # Locução ativa montada
    locucao_ativa = montar_locucao_pt(hook_ativo.fala, f_ben, f_cta)
    char_total = len(locucao_ativa)

    result.total_palavras = c_total
    result.total_caracteres = char_total

    contagem_blocos = ContagemBlocos(
        gancho=c_gancho_ativo,
        beneficio=c_ben,
        cta=c_cta,
        dor=c_dor,
        curiosidade=c_cur,
        quebra_de_padrao=c_qp,
        caracteres_gancho=char_gancho_ativo,
        caracteres_beneficio=char_ben,
        caracteres_cta=char_cta,
        caracteres_total=char_total,
        caracteres_dor=char_dor,
        caracteres_curiosidade=char_cur,
        caracteres_quebra_de_padrao=char_qp,
    )
    result.contagem_blocos = contagem_blocos

    erros = []
    # 1. Validação de Palavras (usando constantes)
    if c_dor > MAX_WORDS_HOOK:
        erros.append(f"Gancho Dor tem {c_dor} palavras (máx {MAX_WORDS_HOOK})")
    if c_cur > MAX_WORDS_HOOK:
        erros.append(f"Gancho Curiosidade tem {c_cur} palavras (máx {MAX_WORDS_HOOK})")
    if c_qp > MAX_WORDS_HOOK:
        erros.append(f"Gancho Quebra de Padrão tem {c_qp} palavras (máx {MAX_WORDS_HOOK})")
    if c_ben > MAX_WORDS_BENEFIT:
        erros.append(f"Benefício tem {c_ben} palavras (máx {MAX_WORDS_BENEFIT})")
    if c_cta > MAX_WORDS_CTA:
        erros.append(f"CTA tem {c_cta} palavras (máx {MAX_WORDS_CTA})")
    if c_total > MAX_WORDS_TOTAL:
        erros.append(f"Total somado tem {c_total} palavras (máx {MAX_WORDS_TOTAL})")
    elif c_total < MIN_WORDS_TOTAL:
        erros.append(f"Total somado tem {c_total} palavras (mín {MIN_WORDS_TOTAL})")

    # 2. Validação Rígida de Caracteres com espaços (usando constantes)
    if char_dor > MAX_CHARS_HOOK:
        erros.append(f"Gancho Dor tem {char_dor} caracteres (máx {MAX_CHARS_HOOK})")
    if char_cur > MAX_CHARS_HOOK:
        erros.append(f"Gancho Curiosidade tem {char_cur} caracteres (máx {MAX_CHARS_HOOK})")
    if char_qp > MAX_CHARS_HOOK:
        erros.append(f"Gancho Quebra de Padrão tem {char_qp} caracteres (máx {MAX_CHARS_HOOK})")
    if char_ben > MAX_CHARS_BENEFIT:
        erros.append(f"Benefício tem {char_ben} caracteres (máx {MAX_CHARS_BENEFIT})")
    if char_cta > MAX_CHARS_CTA:
        erros.append(f"CTA tem {char_cta} caracteres (máx {MAX_CHARS_CTA})")
    if char_total > MAX_CHARS_TOTAL:
        erros.append(f"Total somado tem {char_total} caracteres (máx {MAX_CHARS_TOTAL})")

    # 3. Validação dos Campos de Postagem (quando status for 'completed' ou houver partes)
    if result.status == "completed" or result.partes is not None:
        if result.legenda_na_tela:
            palavras_legenda = len(result.legenda_na_tela.strip().split())
            if palavras_legenda > 5:
                erros.append(f"Legenda na tela tem {palavras_legenda} palavras (máximo 5 palavras)")
        else:
            erros.append("Campo legenda_na_tela é obrigatório e deve ter no máximo 5 palavras")

        if result.hashtags and len(result.hashtags) > 0:
            ultima_tag = result.hashtags[-1].strip().lower()
            if ultima_tag != "#publicidade":
                erros.append(f"A última hashtag deve ser obrigatoriamente '#publicidade', mas foi '{result.hashtags[-1]}'")
            else:
                result.hashtags[-1] = "#publicidade"
        else:
            erros.append("Campo hashtags é obrigatório e deve terminar com '#publicidade'")

    if erros:
        return False, "; ".join(erros), contagem_blocos

    return True, "", contagem_blocos


class GeminiService:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY não foi configurada no arquivo .env.")
        # Limite cravado configurado no cliente HTTP para abortar antes dos 60s do frontend
        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=int(GEMINI_TIMEOUT_SECONDS * 1000))
        )
        self.model = FALLBACK_MODELS[0]

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
        tempo_inicio = asyncio.get_event_loop().time()
        timeout_maximo_total = GEMINI_TIMEOUT_SECONDS

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
                "Considere a PRIMEIRA imagem como o Start Frame obrigatório e use as imagens adicionais como referência de textura, ângulos e acabamento.\n"
            )

        # Operação exclusiva para Google Veo3: estilo comercial cinematográfico vertical limpo
        prompt_parts.append(
            "ESTILO VISUAL: Comercial de Alta Conversão Otimizado para Google Veo (Foco 100% no produto físico, texturas reais, iluminação limpa e enquadramento 9:16 vertical).\n"
        )

        if request.context:
            prompt_parts.append(f"CONTEXTO DO PRODUTO / LINK / NOTA DO USUÁRIO:\n{request.context.strip()}\n")

        if request.termos_autocomplete and request.termos_autocomplete.strip():
            prompt_parts.append(
                f"TERMOS DO AUTOCOMPLETE (SHOPEE/TIKTOK):\n{request.termos_autocomplete.strip()}\n"
                "(Use ESTRITAMENTE e SOMENTE termos presentes nesta lista para compor o titulo_seo!)\n"
            )

        # Refinement turn
        if request.refinement_instruction:
            prompt_parts.append("MODO DE OPERAÇÃO: REFINAMENTO ITERATIVO")
            if request.previous_response:
                prompt_parts.append(f"ROTEIRO ANTERIOR GERADO:\n{json.dumps(request.previous_response, ensure_ascii=False, indent=2)}\n")
            prompt_parts.append(
                f"PEDIDO DE REFINAMENTO DO USUÁRIO: \"{request.refinement_instruction}\"\n"
                "INSTRUÇÕES DE REFINAMENTO:\n"
                "- Identifique com precisão qual variável estratégica você está alterando (ex: gancho de Dor para Curiosidade, ênfase em textura, ritmo).\n"
                "- Preencha o campo `refinement_summary` explicando o que foi alterado e por quê.\n"
                f"- Retorne `status: 'completed'` com as partes estruturadas e as 3 variantes de gancho respeitando rigorosamente a contagem de palavras ({MAX_WORDS_HOOK}/{MAX_WORDS_BENEFIT}/{MAX_WORDS_CTA}, total {MIN_WORDS_TOTAL}-{MAX_WORDS_TOTAL}) e caracteres ({MAX_CHARS_HOOK}/{MAX_CHARS_BENEFIT}/{MAX_CHARS_CTA}, total <= {MAX_CHARS_TOTAL}).\n"
                "- Mantenha Anchor Prompts espaciais rígidos em todas as partes e repita a ancoragem estrutural no bloco_cta_visual sem logos.\n"
                "- Mantenha ou atualize titulo_seo, legenda_na_tela (máx 5 palavras) e hashtags (terminando com #publicidade).\n"
            )

        # Follow-up with clarification answers
        elif request.clarification_answers:
            prompt_parts.append("MODO DE OPERAÇÃO: PÓS-DIAGNÓSTICO (RESPOSTAS DO USUÁRIO RECEBIDAS)")
            answers_text = "\n".join([f"- Pergunta/Opção: {ans}" for k, ans in request.clarification_answers.items()])
            prompt_parts.append(
                f"RESPOSTAS DO USUÁRIO:\n{answers_text}\n\n"
                "INSTRUÇÃO:\n"
                "O usuário já definiu o diferencial do produto. PARE de fazer perguntas de esclarecimento.\n"
                "Gere o roteiro completo no estado `status: 'completed'` preenchendo o diagnóstico, as `partes` estruturadas, as 3 opções de `multiple_hooks` e os campos de postagem (titulo_seo, legenda_na_tela <= 5 palavras, hashtags com #publicidade no final)."
            )

        # Force generation mode
        elif request.force_generation:
            prompt_parts.append("MODO DE OPERAÇÃO: GERAÇÃO DIRETA FORÇADA")
            prompt_parts.append(
                "O usuário solicitou geração direta sem perguntas adicionais.\n"
                "Defina o ângulo de venda mais promissor e retorne `status: 'completed'` com todas as partes estruturadas, as 3 opções de gancho e os campos de postagem (titulo_seo, legenda_na_tela <= 5 palavras, hashtags com #publicidade no final) respeitando os limites de palavras, caracteres e ancoragem espacial."
            )

        # First turn: Ambiguity filter active
        else:
            prompt_parts.append("MODO DE OPERAÇÃO: FILTRO DE AMBIGUIDADE ATIVO (TECH LEMONADE)")
            prompt_parts.append(
                "Avalie criticamente a imagem e o contexto fornecidos:\n"
                "1. Se o produto tiver múltiplos ângulos de venda possíveis, ou for genérico e a dor principal não estiver evidente:\n"
                "   -> Ative `status: 'needs_clarification'`.\n"
                "   -> Crie de 1 a 2 perguntas de múltipla escolha com 3 alternativas claras cada.\n"
                "   -> Deixe os campos `partes` e `multiple_hooks` como null.\n\n"
                "2. Se a imagem e o contexto já forem claros e específicos:\n"
                "   -> Avance para `status: 'completed'` preenchendo as `partes`, os `multiple_hooks` e os campos de postagem."
            )

        prompt_parts.append(
            "\nREGRAS CRÍTICAS DE VALIDAÇÃO, ANCORAGEM FÍSICA E POSTAGEM (NÃO VIOLE ESTES LIMITES):\n"
            f"- Gancho (0-3s): máximo {MAX_WORDS_HOOK} palavras e até {MAX_CHARS_HOOK} caracteres em cada uma das 3 opções de gancho.\n"
            f"- Benefício (3-7s): máximo {MAX_WORDS_BENEFIT} palavras e até {MAX_CHARS_BENEFIT} caracteres baseados somente no anúncio.\n"
            f"- CTA (7-10s): máximo {MAX_WORDS_CTA} palavras e até {MAX_CHARS_CTA} caracteres.\n"
            f"- Total somado: estritamente entre {MIN_WORDS_TOTAL} e {MAX_WORDS_TOTAL} palavras e MÁXIMO {MAX_CHARS_TOTAL} caracteres com espaços.\n"
            "- REGRA DE MOVIMENTO EXTREMO (0-3s): Proibido produto parado ou verbos lentos ('slowly rotating', 'panning', 'static shot'). Exija ação física imediata e dinâmica ('Fast, dynamic motion', 'hands quickly unfolding', 'suddenly picking up').\n"
            "- FUGA DE PROPRIEDADE INTELECTUAL: NUNCA mencione logos, marcas ou letras na descrição visual. Descreva apenas texturas ('breathable woven fabric'), cores e anatomia funcional. Como o Veo3 não pode gerar letras, pedir foco em logos causa borrões plásticos.\n"
            "- ANCHOR PROMPTS ESPACIAIS: Descreva as partes do produto sempre com coordenadas físicas rígidas (ex: 'metal blades firmly anchored to the bottom motor base', 'curved handle securely fixed to the lateral body').\n"
            "- REPETIÇÃO DE ANCORAGEM NA CENA 3: No bloco_cta_visual (7-10s), você DEVE OBRIGATORIAMENTE REPETIR essa mesma ancoragem física estrutural das partes para garantir que nada flutue ou se desconecte no corte final.\n"
            "- CAMPOS DE POSTAGEM: titulo_seo (usar SOMENTE termos de autocomplete se fornecido), legenda_na_tela (MÁXIMO 5 PALAVRAS), hashtags (lista terminando OBRIGATORIAMENTE com '#publicidade').\n"
        )

        contents.append("\n".join(prompt_parts))

        # 3. Call Gemini with Structured Outputs and automatic fallback
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=ScriptModelOutput,
            temperature=0.7,
        )

        last_error = None
        for model_candidate in FALLBACK_MODELS:
            tempo_decorrido = asyncio.get_event_loop().time() - tempo_inicio
            tempo_restante = timeout_maximo_total - tempo_decorrido

            if tempo_restante <= 1.0:
                logger.error(f"Tempo limite de {timeout_maximo_total}s atingido no backend antes de concluir chamadas aos modelos.")
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=f"Tempo limite de {int(timeout_maximo_total)} segundos esgotado no backend ao tentar gerar com a IA."
                )

            try:
                logger.info(f"Enviando requisição assíncrona para modelo: {model_candidate} (timeout restante: {tempo_restante:.1f}s)")
                response = await asyncio.wait_for(
                    self.client.aio.models.generate_content(
                        model=model_candidate,
                        contents=contents,
                        config=config,
                    ),
                    timeout=tempo_restante
                )

                if response.text:
                    data = json.loads(response.text)
                    model_out = ScriptModelOutput.model_validate(data)

                    # Se estiver em status 'needs_clarification', retorna imediatamente com o modelo utilizado
                    if model_out.status == "needs_clarification":
                        res_clarif = ScriptResult(**model_out.model_dump())
                        res_clarif.modelo_utilizado = model_candidate
                        return res_clarif

                    result = ScriptResult(**model_out.model_dump())
                    result.modelo_utilizado = model_candidate

                    # Validar e contar palavras e caracteres deterministicamente no backend
                    valido, erro_validacao, contagens = validar_e_contar_palavras(result)

                    if not valido:
                        logger.warning(f"Validação híbrida (palavras/caracteres) falhou ({erro_validacao}). Executando 1 retry corretivo...")
                        tempo_decorrido_retry = asyncio.get_event_loop().time() - tempo_inicio
                        tempo_restante_retry = timeout_maximo_total - tempo_decorrido_retry

                        if tempo_restante_retry <= 2.0:
                            raise HTTPException(
                                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                                detail=f"Tempo limite de {int(timeout_maximo_total)} segundos esgotado no backend antes de executar retry de encurtamento."
                            )

                        retry_contents = list(contents) + [
                            f"CORREÇÃO OBRIGATÓRIA (LOCUÇÃO, ANCORAGEM E POSTAGEM): O roteiro anterior violou as seguintes regras: {erro_validacao}. "
                            f"REESCREVA o JSON imediatamente corrigindo todos os pontos apontados. "
                            f"Regras obrigatórias: cada gancho <= {MAX_WORDS_HOOK} palavras e <= {MAX_CHARS_HOOK} caracteres, "
                            f"benefício <= {MAX_WORDS_BENEFIT} palavras e <= {MAX_CHARS_BENEFIT} caracteres, "
                            f"CTA <= {MAX_WORDS_CTA} palavras e <= {MAX_CHARS_CTA} caracteres, "
                            f"total somado entre {MIN_WORDS_TOTAL} e {MAX_WORDS_TOTAL} palavras e <= {MAX_CHARS_TOTAL} caracteres, "
                            f"bloco_cta_visual repetindo a ancoragem física das peças sem logos, "
                            f"legenda_na_tela com no MÁXIMO 5 palavras, e a última hashtag da lista sendo rigorosamente '#publicidade'."
                        ]
                        retry_response = await asyncio.wait_for(
                            self.client.aio.models.generate_content(
                                model=model_candidate,
                                contents=retry_contents,
                                config=config,
                            ),
                            timeout=tempo_restante_retry
                        )
                        if retry_response.text:
                            retry_data = json.loads(retry_response.text)
                            retry_out = ScriptModelOutput.model_validate(retry_data)
                            retry_result = ScriptResult(**retry_out.model_dump())
                            retry_result.modelo_utilizado = model_candidate
                            valido_retry, erro_retry, _ = validar_e_contar_palavras(retry_result)
                            if valido_retry:
                                result = retry_result
                            else:
                                logger.error(f"Retry de validação falhou: {erro_retry}")
                                raise HTTPException(
                                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                    detail=f"A resposta gerada violou as regras de validação (cadência ou postagem) mesmo após tentativa de correção: {erro_retry}."
                                )

                    # Montar prompt_veo e locucao_pt deterministicamente por código
                    if result.partes and result.multiple_hooks:
                        gancho_ativo = result.multiple_hooks.dor
                        if result.selected_hook_type == "curiosidade":
                            gancho_ativo = result.multiple_hooks.curiosidade
                        elif result.selected_hook_type == "quebra_de_padrao":
                            gancho_ativo = result.multiple_hooks.quebra_de_padrao

                        result.prompt_veo = montar_prompt_veo(result.partes, gancho_ativo)
                        result.locucao_pt = montar_locucao_pt(gancho_ativo.fala, result.partes.fala_beneficio, result.partes.fala_cta)

                    result.modelo_utilizado = model_candidate
                    return result

            except asyncio.TimeoutError:
                logger.error(f"Timeout de chamada com modelo {model_candidate} (limite global {timeout_maximo_total}s atingido).")
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=f"A chamada à API de IA excedeu o tempo limite cravado de {int(timeout_maximo_total)} segundos no backend."
                )
            except HTTPException:
                raise
            except Exception as e:
                last_error = e
                err_msg = str(e)
                logger.warning(f"Tentativa com {model_candidate} falhou: {err_msg}")
                # Se for cota esgotada ou indisponibilidade, avança para o próximo modelo sem travar
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "503" in err_msg or "quota" in err_msg.lower():
                    logger.info(f"Modelo {model_candidate} com cota esgotada ou instável. Pulando para próximo fallback.")
                    continue
                await asyncio.sleep(0.5)

        logger.error(f"Todos os modelos falharam. Último erro: {last_error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao comunicar com os modelos de IA após tentativas de fallback: {str(last_error)}"
        )

gemini_service = GeminiService()
