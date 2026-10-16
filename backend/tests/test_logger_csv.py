import csv
import io
import sys
from pathlib import Path
import pytest

# Garantir que o diretório backend esteja no sys.path para importações
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.logger_csv import (
    COLUNAS_CSV,
    formatar_valores_csv,
    formatar_linha_csv,
    sintetizar_motivo_falha,
    registrar_geracao,
)


def test_colunas_totais_exatas():
    """Garante que a lista de colunas tem exatamente 15 campos especificados."""
    assert len(COLUNAS_CSV) == 15
    assert COLUNAS_CSV == [
        "data_hora",
        "tipo",
        "modelos_tentados",
        "modelo_final",
        "total_chamadas_modelo",
        "passou_de_primeira",
        "houve_retry",
        "resultado",
        "motivo_falha",
        "tempo_total_s",
        "palavras_total",
        "chars_total",
        "chars_gancho",
        "chars_beneficio",
        "chars_cta",
    ]


def test_formatar_valores_csv_sucesso():
    """Valida formatação de uma geração bem-sucedida de primeira."""
    dados = {
        "data_hora": "2026-10-15T23:00:00",
        "tipo": "geracao",
        "modelos_tentados": "gemini-3.5-flash-lite",
        "modelo_final": "gemini-3.5-flash-lite",
        "total_chamadas_modelo": 1,
        "passou_de_primeira": "sim",
        "houve_retry": "não",
        "resultado": "ok",
        "motivo_falha": "",
        "tempo_total_s": 2.45,
        "palavras_total": 21,
        "chars_total": 138,
        "chars_gancho": 40,
        "chars_beneficio": 65,
        "chars_cta": 33,
    }
    valores = formatar_valores_csv(dados)
    assert len(valores) == 15
    assert valores[0] == "2026-10-15T23:00:00"
    assert valores[1] == "geracao"
    assert valores[2] == "gemini-3.5-flash-lite"
    assert valores[3] == "gemini-3.5-flash-lite"
    assert valores[4] == "1"
    assert valores[5] == "sim"
    assert valores[6] == "não"
    assert valores[7] == "ok"
    assert valores[8] == ""
    assert valores[9] == "2.45"
    assert valores[10] == "21"
    assert valores[11] == "138"
    assert valores[12] == "40"
    assert valores[13] == "65"
    assert valores[14] == "33"


def test_formatar_valores_csv_erro_422():
    """Valida formatação quando há erro 422 de validação pós-retry."""
    dados = {
        "data_hora": "2026-10-15T23:01:00",
        "tipo": "geracao",
        "modelos_tentados": "gemini-3.5-flash-lite",
        "modelo_final": "",
        "total_chamadas_modelo": 2,
        "passou_de_primeira": "não",
        "houve_retry": "sim",
        "resultado": "erro_422",
        "motivo_falha": "excedeu_chars_beneficio",
        "tempo_total_s": 4.10,
        "palavras_total": "",
        "chars_total": "",
        "chars_gancho": "",
        "chars_beneficio": "",
        "chars_cta": "",
    }
    valores = formatar_valores_csv(dados)
    assert len(valores) == 15
    assert valores[1] == "geracao"
    assert valores[3] == ""
    assert valores[5] == "não"
    assert valores[6] == "sim"
    assert valores[7] == "erro_422"
    assert valores[8] == "excedeu_chars_beneficio"
    # Campos de contagem de roteiro devem ser vazios
    assert valores[10] == ""
    assert valores[11] == ""
    assert valores[12] == ""
    assert valores[13] == ""
    assert valores[14] == ""


def test_erro_api_deixa_passou_de_primeira_e_retry_vazios():
    """Erro de API/cota antes de validar o roteiro não pontua negativamente o modelo."""
    dados = {
        "data_hora": "2026-10-15T23:02:00",
        "tipo": "geracao",
        "modelos_tentados": "gemini-3.5-flash-lite|gemini-3.1-flash-lite|gemini-3.8-flash",
        "modelo_final": "",
        "total_chamadas_modelo": 3,
        "passou_de_primeira": "",
        "houve_retry": "",
        "resultado": "erro_api",
        "motivo_falha": "429_quota_esgotada",
        "tempo_total_s": 1.2,
    }
    valores = formatar_valores_csv(dados)
    assert len(valores) == 15
    assert valores[5] == ""
    assert valores[6] == ""
    assert valores[7] == "erro_api"
    assert valores[8] == "429_quota_esgotada"


def test_ok_esclarecimento_deixa_passou_de_primeira_e_retry_vazios():
    """Filtro de ambiguidade que retorna perguntas não passa por validação de roteiro."""
    dados = {
        "data_hora": "2026-10-15T23:03:00",
        "tipo": "geracao",
        "modelos_tentados": "gemini-3.5-flash-lite",
        "modelo_final": "gemini-3.5-flash-lite",
        "total_chamadas_modelo": 1,
        "passou_de_primeira": "",
        "houve_retry": "",
        "resultado": "ok_esclarecimento",
        "motivo_falha": "",
        "tempo_total_s": 1.8,
        "palavras_total": "",
        "chars_total": "",
    }
    valores = formatar_valores_csv(dados)
    assert len(valores) == 15
    assert valores[5] == ""
    assert valores[6] == ""
    assert valores[7] == "ok_esclarecimento"
    assert valores[10] == ""


def test_motivo_falha_com_virgula_aspas_e_quebras_mantem_colunas():
    """Mesmo com caracteres especiais (vírgulas, aspas, quebras), o CSV mantém exatamente 15 colunas."""
    dados = {
        "data_hora": "2026-10-15T23:04:00",
        "tipo": "refinamento",
        "modelos_tentados": "gemini-3.5-flash-lite",
        "modelo_final": "",
        "total_chamadas_modelo": 1,
        "passou_de_primeira": "",
        "houve_retry": "",
        "resultado": "outro",
        "motivo_falha": 'erro com "aspas", ponto; e \n quebra',
        "tempo_total_s": 0.5,
    }
    linha_formatada = formatar_linha_csv(dados)
    reader = csv.reader(io.StringIO(linha_formatada), delimiter=";")
    linhas = list(reader)
    assert len(linhas) == 1
    colunas_lidas = linhas[0]
    assert len(colunas_lidas) == 15
    assert colunas_lidas[8] == 'erro com "aspas", ponto; e \n quebra'


def test_sintetizar_motivo_falha_seguranca_e_teto_80():
    """Garante que nunca vaza roteiro nem prompt e gera códigos curtos <= 80 caracteres."""
    # Excesso de caracteres em benefício
    erro_beneficio = "Benefício tem 78 caracteres (máx 70): 'compre este incrível produto agora mesmo'"
    codigo = sintetizar_motivo_falha(erro_beneficio)
    assert codigo == "excedeu_chars_beneficio"
    assert "compre" not in codigo  # Não vaza o texto

    # Excesso de caracteres em gancho
    codigo_gancho = sintetizar_motivo_falha("Gancho Dor tem 52 caracteres (máx 45)")
    assert codigo_gancho == "excedeu_chars_gancho"

    # Excesso de palavras na legenda
    codigo_legenda = sintetizar_motivo_falha("Legenda na tela tem 7 palavras (máximo 5 palavras)")
    assert codigo_legenda == "excedeu_palavras_legenda"

    # Erro de quota 429
    codigo_quota = sintetizar_motivo_falha("429 RESOURCE_EXHAUSTED: quota exceeded for model")
    assert codigo_quota == "429_quota_esgotada"

    # Timeout 504
    codigo_timeout = sintetizar_motivo_falha("Tempo limite de 50 segundos esgotado")
    assert codigo_timeout == "timeout_504"

    # Cancelamento
    codigo_cancelado = sintetizar_motivo_falha("asyncio.CancelledError")
    assert codigo_cancelado == "cancelado_pelo_cliente"

    # String longa desconhecida
    longo = "erro_desconhecido_" + ("x" * 150)
    res_longo = sintetizar_motivo_falha(longo)
    assert len(res_longo) <= 80


def test_registrar_geracao_cria_cabecalho_uma_vez_e_acrescenta(tmp_path: Path):
    """
    Testa se o arquivo novo é criado com cabeçalho e se chamadas subsequentes
    apenas acrescentam novas linhas sem reescrever o cabeçalho.
    """
    csv_teste = tmp_path / "geracoes_teste.csv"

    dados1 = {
        "data_hora": "2026-10-15T23:05:01",
        "tipo": "geracao",
        "modelos_tentados": "gemini-3.5-flash-lite",
        "modelo_final": "gemini-3.5-flash-lite",
        "total_chamadas_modelo": 1,
        "passou_de_primeira": "sim",
        "houve_retry": "não",
        "resultado": "ok",
        "motivo_falha": "",
        "tempo_total_s": 2.1,
        "palavras_total": 20,
        "chars_total": 130,
        "chars_gancho": 38,
        "chars_beneficio": 62,
        "chars_cta": 30,
    }

    dados2 = {
        "data_hora": "2026-10-15T23:05:02",
        "tipo": "refinamento",
        "modelos_tentados": "gemini-3.5-flash-lite",
        "modelo_final": "gemini-3.5-flash-lite",
        "total_chamadas_modelo": 2,
        "passou_de_primeira": "não",
        "houve_retry": "sim",
        "resultado": "ok",
        "motivo_falha": "",
        "tempo_total_s": 4.5,
        "palavras_total": 21,
        "chars_total": 135,
        "chars_gancho": 39,
        "chars_beneficio": 65,
        "chars_cta": 31,
    }

    # Primeira chamada: deve criar arquivo com cabeçalho + linha 1
    registrar_geracao(dados1, caminho_csv=csv_teste)
    assert csv_teste.exists()

    with open(csv_teste, mode="r", encoding="utf-8-sig") as f:
        linhas = list(csv.reader(f, delimiter=";"))
    assert len(linhas) == 2  # Cabeçalho + dados1
    assert linhas[0] == COLUNAS_CSV
    assert linhas[1][0] == "2026-10-15T23:05:01"
    assert linhas[1][1] == "geracao"

    # Segunda chamada: deve apenas acrescentar dados2
    registrar_geracao(dados2, caminho_csv=csv_teste)

    with open(csv_teste, mode="r", encoding="utf-8-sig") as f:
        linhas = list(csv.reader(f, delimiter=";"))
    assert len(linhas) == 3  # Cabeçalho + dados1 + dados2
    assert linhas[0] == COLUNAS_CSV
    assert linhas[1][0] == "2026-10-15T23:05:01"
    assert linhas[2][0] == "2026-10-15T23:05:02"
    assert linhas[2][1] == "refinamento"


def test_registrar_geracao_nunca_derruba_execucao(monkeypatch):
    """Garante que falhas de sistema de arquivos são capturadas sem gerar exceção."""
    def open_com_falha(*args, **kwargs):
        raise PermissionError("Acesso negado simulado para o teste")

    monkeypatch.setattr("builtins.open", open_com_falha)

    dados = {"data_hora": "2026-10-15T23:06:00", "resultado": "ok"}
    # Não deve levantar exceção mesmo com falha grave no open()
    try:
        registrar_geracao(dados)
    except Exception as exc:
        pytest.fail(f"registrar_geracao não deveria levantar exceção, mas levantou: {exc}")
