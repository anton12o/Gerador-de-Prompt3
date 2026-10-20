"""
test_cors.py - Testes de verificação da política de CORS do backend.

Garante:
- Requisições originadas do frontend local (http://localhost:5173 e http://127.0.0.1:5173)
  recebem o cabeçalho Access-Control-Allow-Origin correspondente.
- Requisições originadas de domínios externos não autorizados (ex: https://exemplo.com)
  NÃO recebem o cabeçalho Access-Control-Allow-Origin.
- Preflight OPTIONS com métodos e cabeçalhos permitidos e bloqueio de credenciais.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Garante que o diretório backend esteja no sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app

client = TestClient(app)


def test_cors_origem_permitida_localhost():
    """Requisição com Origin http://localhost:5173 recebe o cabeçalho Access-Control-Allow-Origin."""
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_origem_permitida_ip_loopback():
    """Requisição com Origin http://127.0.0.1:5173 recebe o cabeçalho Access-Control-Allow-Origin."""
    response = client.get("/api/health", headers={"Origin": "http://127.0.0.1:5173"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"


def test_cors_origem_nao_permitida():
    """Requisição com Origin https://exemplo.com NÃO recebe o cabeçalho Access-Control-Allow-Origin."""
    response = client.get("/api/health", headers={"Origin": "https://exemplo.com"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_cors_preflight_origem_permitida():
    """Preflight OPTIONS de origem autorizada devolve cabeçalhos corretos sem permitir credenciais."""
    response = client.options(
        "/api/generate-script",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") != "true"


def test_cors_preflight_origem_nao_permitida():
    """Preflight OPTIONS de origem externa é rejeitado sem Access-Control-Allow-Origin."""
    response = client.options(
        "/api/generate-script",
        headers={
            "Origin": "https://exemplo.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert "access-control-allow-origin" not in response.headers
