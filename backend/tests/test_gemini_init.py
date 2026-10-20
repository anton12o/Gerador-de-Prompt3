import asyncio
import importlib
import sys
from pathlib import Path
import pytest
from fastapi import HTTPException

# Garante que o diretório backend esteja no sys.path mesmo ao rodar da raiz do repo
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.schemas.script import GenerateScriptRequest


def test_import_gemini_sem_api_key_nao_levanta_excecao(monkeypatch):
    """
    Importar app.services.gemini sem GEMINI_API_KEY no ambiente
    não pode levantar exceção.
    """
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    import app.services.gemini as gemini_mod
    # Forçar recarregamento do módulo para simular importação limpa
    reloaded = importlib.reload(gemini_mod)

    assert hasattr(reloaded, "GeminiService")
    assert hasattr(reloaded, "get_gemini_service")

    # Obter o serviço sob demanda não deve levantar exceção
    service = reloaded.get_gemini_service()
    assert service.model == "gemini-3.5-flash-lite"


def test_geracao_sem_api_key_devolve_erro_claro(monkeypatch):
    """
    A tentativa de geração de roteiro sem chave de API configurada
    deve devolver erro claro indicando a ausência em backend/.env.
    """
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    import app.services.gemini as gemini_mod
    service = gemini_mod.GeminiService()

    request = GenerateScriptRequest(
        product_context="Camiseta térmica masculina para academia",
        image_base64=""
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(service.generate_script(request))

    assert exc_info.value.status_code == 500
    assert "GEMINI_API_KEY não configurada em backend/.env" in exc_info.value.detail
    assert "GEMINI_API_KEY não configurada em backend/.env" in str(exc_info.value)


def test_routes_health_sem_api_key(monkeypatch):
    """
    A rota /api/health deve responder com sucesso mesmo sem chave configurada.
    """
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    from app.api.routes import health_check

    response = asyncio.run(health_check())
    assert response["status"] == "online"
    assert response["model"] == "gemini-3.5-flash-lite"
