import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.script import GenerateScriptRequest, ScriptResult
from app.services.gemini import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Scripts"])

@router.post(
    "/generate-script",
    response_model=ScriptResult,
    status_code=status.HTTP_200_OK,
    summary="Gerar ou Refinar Roteiro com Lógica Tech Lemonade"
)
async def generate_script(request: GenerateScriptRequest):
    """
    Recebe imagem (base64) e contexto do produto.
    Executa o filtro de ambiguidade do Mestre Gerador:
    - Se for ambíguo, retorna status 'needs_clarification' com perguntas de múltipla escolha.
    - Se for claro (ou se já tiver respostas/refinamento), retorna status 'completed' com o roteiro e tabela para Veo3.
    """
    try:
        result = await gemini_service.generate_script(request)
        return result
    except HTTPException:
        raise
    except ValueError as ve:
        logger.warning(f"Erro de validação: {ve}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        logger.error(f"Erro no processamento: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao processar roteiro com IA: {str(e)}"
        )

@router.get("/health", summary="Status da API")
async def health_check():
    return {
        "status": "online",
        "service": "Mestre Gerador Shopee Vídeo v3.0",
        "model": gemini_service.model
    }
