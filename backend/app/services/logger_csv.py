import csv
import io
import re
import sys
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# Diretório e arquivo ancorados rigorosamente no arquivo de código,
# independente da pasta de onde o servidor ou start.bat for iniciado.
LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
CSV_FILE_PATH = LOG_DIR / "geracoes.csv"

COLUNAS_CSV = [
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


def sintetizar_motivo_falha(erro: Any) -> str:
    """
    Sintetiza um erro em um código curto (máx. 80 caracteres).
    NUNCA inclui o texto do roteiro, prompts nem o corpo cru de respostas da API.
    """
    if not erro:
        return ""

    txt = str(erro).lower()

    # Cancelamento
    if "cancelled" in txt or "cancelado" in txt:
        return "cancelado_pelo_cliente"

    # Timeout
    if "timeout" in txt or "tempo limite" in txt or "504" in txt:
        return "timeout_504"

    # Quota / Limite de API
    if "429" in txt or "resource_exhausted" in txt or "quota" in txt:
        return "429_quota_esgotada"
    if "503" in txt or "unavailable" in txt or "indisponível" in txt:
        return "503_servico_indisponivel"

    # Validações de limites de caracteres
    if "caracteres" in txt or "chars" in txt:
        if "benefício" in txt or "beneficio" in txt:
            return "excedeu_chars_beneficio"
        elif "cta" in txt:
            return "excedeu_chars_cta"
        elif "dor" in txt or "curiosidade" in txt or "quebra" in txt or "gancho" in txt:
            return "excedeu_chars_gancho"
        elif "total" in txt:
            return "excedeu_chars_total"
        return "excedeu_limite_caracteres"

    # Validações de limites de palavras
    if "palavras" in txt:
        if "mín" in txt or "min" in txt:
            return "abaixo_min_palavras_total"
        if "benefício" in txt or "beneficio" in txt:
            return "excedeu_palavras_beneficio"
        elif "cta" in txt:
            return "excedeu_palavras_cta"
        elif "dor" in txt or "curiosidade" in txt or "quebra" in txt or "gancho" in txt:
            return "excedeu_palavras_gancho"
        elif "total" in txt:
            return "excedeu_palavras_total"
        elif "legenda" in txt:
            return "excedeu_palavras_legenda"
        return "excedeu_limite_palavras"

    # Validações de campos de postagem
    if "legenda" in txt:
        return "falha_legenda"
    if "hashtag" in txt or "publicidade" in txt:
        return "falha_hashtag_publicidade"

    # JSON / Parse / Base64
    if "json" in txt or "validationerror" in txt:
        return "json_invalido"
    if "imagem" in txt or "base64" in txt:
        return "imagem_invalida"

    # Fallback seguro: limpa caracteres especiais e trunca em 80 caracteres
    sanitizado = "".join(c if (c.isalnum() or c in "_-") else "_" for c in txt.strip())
    sanitizado = re.sub(r"_+", "_", sanitizado).strip("_")
    return sanitizado[:80]


def formatar_valores_csv(dados: Dict[str, Any]) -> List[str]:
    """
    Recebe o dicionário de métricas e devolve a lista de valores na ordem exata de COLUNAS_CSV.
    Trata campos nulos/vazios como string vazia.
    """
    valores = []
    for col in COLUNAS_CSV:
        val = dados.get(col, "")
        if val is None:
            valores.append("")
        elif isinstance(val, (int, float)):
            valores.append(str(val))
        else:
            valores.append(str(val))
    return valores


def formatar_linha_csv(dados: Dict[str, Any]) -> str:
    """
    Formata uma linha com separador ';' e escape padrão de CSV.
    Mantém consistência mesmo se houver caracteres especiais.
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", lineterminator="")
    writer.writerow(formatar_valores_csv(dados))
    return output.getvalue()


def registrar_geracao(dados: Dict[str, Any], caminho_csv: Path | None = None) -> None:
    """
    Registra uma linha no arquivo CSV de métricas de geração.
    - Separador: ';'
    - Encoding: utf-8-sig (compatível com Excel em português e Google Sheets)
    - Se o arquivo não existir, cria o diretório e escreve o cabeçalho.
    - Se falhar (disco, permissão), captura a exceção e apenas avisa no terminal,
      NUNCA interrompendo a requisição.
    """
    destino = caminho_csv or CSV_FILE_PATH
    try:
        destino.parent.mkdir(parents=True, exist_ok=True)
        escrever_cabecalho = not destino.exists() or destino.stat().st_size == 0

        with open(destino, mode="a", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f, delimiter=";", lineterminator="\n")
            if escrever_cabecalho:
                writer.writerow(COLUNAS_CSV)
            writer.writerow(formatar_valores_csv(dados))
    except Exception as e:
        print(f"[AVISO] Falha ao registrar log de geração em CSV: {e}", file=sys.stderr)
        logger.warning(f"Falha ao registrar log de geração em CSV: {e}")
