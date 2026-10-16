"""
test_validacao.py - Testes unitários do validador híbrido de roteiro.

Cobre:
- Contagem de palavras e caracteres por bloco (ganchos, benefício, CTA).
- Teto e piso totais (palavras e caracteres).
- Legenda na tela (máximo 5 palavras).
- Hashtag final obrigatória (#publicidade).
- Palavras longas em português.
- String vazia e casos de borda.
"""

import sys
from pathlib import Path

# Garante que o diretório backend esteja no sys.path mesmo ao rodar da raiz do repo
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from app.schemas.script import (
    ScriptResult,
    ScriptPartes,
    HookOption,
    MultipleHooks,
)
from app.services.gemini import (
    validar_e_contar_palavras,
    MAX_WORDS_HOOK,
    MAX_WORDS_BENEFIT,
    MAX_WORDS_CTA,
    MIN_WORDS_TOTAL,
    MAX_WORDS_TOTAL,
    MAX_CHARS_HOOK,
    MAX_CHARS_BENEFIT,
    MAX_CHARS_CTA,
    MAX_CHARS_TOTAL,
)


def _criar_script_base(
    fala_dor: str = "Cansaço nas costas todo dia?",
    fala_curiosidade: str = "O segredo da postura perfeita.",
    fala_quebra: str = "Pare de sofrer agora mesmo.",
    fala_beneficio: str = "Espuma viscoelástica alivia a pressão imediatamente ao sentar.",
    fala_cta: str = "Clica no carrinho e garante!",
    titulo_seo: str = "Almofada Ortopédica Postura",
    legenda_na_tela: str = "Olha o que achei!",
    hashtags: list[str] | None = "__DEFAULT__",
    status: str = "completed",
    selected_hook: str = "dor",
) -> ScriptResult:
    """Helper para montar uma estrutura válida de ScriptResult."""
    if hashtags == "__DEFAULT__":
        hashtags = ["#shopee", "#achadinhos", "#postura", "#publicidade"]

    hooks = MultipleHooks(
        dor=HookOption(tipo="dor", fala=fala_dor, acao_visual_0_3s="Fast action shot"),
        curiosidade=HookOption(tipo="curiosidade", fala=fala_curiosidade, acao_visual_0_3s="Fast action shot"),
        quebra_de_padrao=HookOption(tipo="quebra_de_padrao", fala=fala_quebra, acao_visual_0_3s="Fast action shot"),
    )
    partes = ScriptPartes(
        descricao_produto="Almofada ortopédica",
        descricao_cenario="Cadeira de escritório moderna",
        fala_beneficio=fala_beneficio,
        bloco_beneficio_visual="Uso prático da almofada",
        fala_cta=fala_cta,
        bloco_cta_visual="Hero shot do produto com ancoragem",
    )
    return ScriptResult(
        status=status,
        diagnosis="Diagnóstico para testes",
        partes=partes,
        multiple_hooks=hooks,
        selected_hook_type=selected_hook,
        titulo_seo=titulo_seo,
        legenda_na_tela=legenda_na_tela,
        hashtags=hashtags,
    )


# ==============================================================================
# TABELA DE CASOS 1: LIMITES DE PALAVRAS E CARACTERES POR BLOCO (GANCHO)
# ==============================================================================
@pytest.mark.parametrize(
    "fala_dor, esperado_aprovado, motivo_esperado",
    [
        # Aprovado: 5 palavras, 28 caracteres
        ("Cansaço nas costas todo dia?", True, None),
        # Aprovado no teto exato: 7 palavras, 34 caracteres
        ("Dor nas costas todo dia ao sentar?", True, None),
        # Reprovado: 8 palavras (> MAX_WORDS_HOOK)
        ("Você sente dor nas costas todo dia agora?", False, f"Gancho Dor tem 8 palavras (máx {MAX_WORDS_HOOK})"),
        # Reprovado: 4 palavras mas > 45 caracteres (palavras longas estourando caracteres)
        ("Inconstitucionalissimamente otorrinolaringologista extraordinariamente desregulamentação", False, "Gancho Dor tem"),
    ],
)
def test_validacao_gancho_dor(fala_dor, esperado_aprovado, motivo_esperado):
    script = _criar_script_base(fala_dor=fala_dor)
    valido, erro, contagens = validar_e_contar_palavras(script)
    assert valido is esperado_aprovado
    if not esperado_aprovado:
        assert motivo_esperado in erro
    else:
        assert erro == ""
        assert contagens.dor <= MAX_WORDS_HOOK
        assert contagens.caracteres_dor <= MAX_CHARS_HOOK


# ==============================================================================
# TABELA DE CASOS 2: LIMITES DE BENEFÍCIO E CTA
# ==============================================================================
@pytest.mark.parametrize(
    "fala_beneficio, fala_cta, esperado_aprovado, motivo_esperado",
    [
        # Aprovado: benefício 8 pal / 62 car, CTA 5 pal / 28 car (total: 5 dor + 8 + 5 = 18 pal)
        (
            "Espuma viscoelástica alivia a pressão imediatamente ao sentar.",
            "Clica no carrinho e garante!",
            True,
            None,
        ),
        # Reprovado: benefício com 13 palavras (> 11)
        (
            "Espuma viscoelástica alivia a pressão imediatamente ao sentar na cadeira todo dia confortavelmente",
            "Clica no carrinho e garante!",
            False,
            f"Benefício tem 13 palavras (máx {MAX_WORDS_BENEFIT})",
        ),
        # Reprovado: CTA com 6 palavras (> 5)
        (
            "Espuma viscoelástica alivia a pressão imediatamente ao sentar.",
            "Clica no carrinho e garanta agora!",
            False,
            f"CTA tem 6 palavras (máx {MAX_WORDS_CTA})",
        ),
    ],
)
def test_validacao_beneficio_e_cta(fala_beneficio, fala_cta, esperado_aprovado, motivo_esperado):
    script = _criar_script_base(fala_beneficio=fala_beneficio, fala_cta=fala_cta)
    valido, erro, _ = validar_e_contar_palavras(script)
    assert valido is esperado_aprovado
    if not esperado_aprovado:
        assert motivo_esperado in erro


# ==============================================================================
# TABELA DE CASOS 3: PISO E TETO TOTAIS DE PALAVRAS E CARACTERES
# ==============================================================================
@pytest.mark.parametrize(
    "fala_gancho, fala_beneficio, fala_cta, esperado_aprovado, motivo_esperado",
    [
        # Abaixo do piso total: 3 + 5 + 3 = 11 palavras (< 18)
        (
            "Cansaço nas costas?",
            "Espuma macia que ajuda muito.",
            "Clica e compra!",
            False,
            f"Total somado tem 11 palavras (mín {MIN_WORDS_TOTAL})",
        ),
        # Piso exato: 5 + 8 + 5 = 18 palavras
        (
            "Cansaço nas costas todo dia?",
            "Espuma viscoelástica alivia a pressão imediatamente ao sentar.",
            "Clica no carrinho e garante!",
            True,
            None,
        ),
        # Faixa média: 6 + 9 + 5 = 20 palavras (caracteres <= 150)
        (
            "Você sente dores nas costas hoje?",
            "Espuma anatômica alivia a pressão da coluna ao sentar.",
            "Clica no carrinho e garante!",
            True,
            None,
        ),
        # Teto exato: 7 + 11 + 5 = 23 palavras
        (
            "Dor nas costas todo dia ao sentar?",
            "Espuma densa alivia a dor e melhora a postura no dia.",
            "Clica no carrinho e garante!",
            True,
            None,
        ),
        # Acima do teto de palavras (> 23): 7 + 13 + 5 = 25 palavras
        (
            "Dor nas costas todo dia ao sentar?",
            "Espuma viscoelástica alivia a pressão imediatamente ao sentar na cadeira todo dia confortavelmente",
            "Clica no carrinho e garante!",
            False,
            "Total somado tem",
        ),
        # Acima do teto de caracteres somados (> 150 caracteres)
        (
            "Inconstitucionalidade?",
            "Desproporcionalissimamente extraordinariamente desregulamentação total.",
            "Otorrinolaringologista agora!",
            False,
            "Total somado tem",
        ),
    ],
)
def test_validacao_totais(fala_gancho, fala_beneficio, fala_cta, esperado_aprovado, motivo_esperado):
    script = _criar_script_base(
        fala_dor=fala_gancho,
        fala_beneficio=fala_beneficio,
        fala_cta=fala_cta,
        selected_hook="dor",
    )
    valido, erro, contagens = validar_e_contar_palavras(script)
    assert valido is esperado_aprovado
    if not esperado_aprovado:
        assert motivo_esperado in erro
    else:
        assert MIN_WORDS_TOTAL <= contagens.gancho + contagens.beneficio + contagens.cta <= MAX_WORDS_TOTAL
        assert contagens.caracteres_total <= MAX_CHARS_TOTAL


# ==============================================================================
# TABELA DE CASOS 4: LEGENDA NA TELA (MÁXIMO 5 PALAVRAS)
# ==============================================================================
@pytest.mark.parametrize(
    "legenda, esperado_aprovado, motivo_esperado",
    [
        ("Olha isso!", True, None),                         # 2 palavras
        ("Olha o que eu achei!", True, None),               # 5 palavras (teto exato)
        ("Olha o que eu achei agora!", False, "Legenda na tela tem 6 palavras (máximo 5 palavras)"), # 6 palavras (> 5)
        (None, False, "Campo legenda_na_tela é obrigatório"), # Ausente / None
        ("", False, "Campo legenda_na_tela é obrigatório"),   # String vazia
    ],
)
def test_validacao_legenda_na_tela(legenda, esperado_aprovado, motivo_esperado):
    script = _criar_script_base(legenda_na_tela=legenda)
    valido, erro, _ = validar_e_contar_palavras(script)
    assert valido is esperado_aprovado
    if not esperado_aprovado:
        assert motivo_esperado in erro


# ==============================================================================
# TABELA DE CASOS 5: HASHTAG FINAL OBRIGATÓRIA (#PUBLICIDADE)
# ==============================================================================
@pytest.mark.parametrize(
    "hashtags, esperado_aprovado, motivo_esperado",
    [
        (["#shopee", "#achadinhos", "#publicidade"], True, None),
        (["#shopee", "#achadinhos", "#Publicidade"], True, None), # Normalização case-insensitive
        (["#shopee", "#achadinhos", "#PUBLICIDADE"], True, None),
        (["#shopee", "#achadinhos"], False, "A última hashtag deve ser obrigatoriamente '#publicidade'"),
        (["#publicidade", "#shopee"], False, "A última hashtag deve ser obrigatoriamente '#publicidade'"),
        ([], False, "Campo hashtags é obrigatório"),
        (None, False, "Campo hashtags é obrigatório"),
    ],
)
def test_validacao_hashtags(hashtags, esperado_aprovado, motivo_esperado):
    script = _criar_script_base(hashtags=hashtags)
    valido, erro, _ = validar_e_contar_palavras(script)
    assert valido is esperado_aprovado
    if not esperado_aprovado:
        assert motivo_esperado in erro
    else:
        # Verifica se normalizou para canonical '#publicidade'
        assert script.hashtags[-1] == "#publicidade"


# ==============================================================================
# TABELA DE CASOS 6: PALAVRAS LONGAS E ESPAÇAMENTOS ANÔMALOS EM PORTUGUÊS
# ==============================================================================
def test_palavras_longas_aprovado():
    """Testa palavra longa em português dentro dos limites de palavras e caracteres."""
    script = _criar_script_base(
        fala_dor="Anticonstitucionalissimamente falando hoje?",  # 3 palavras, 43 chars
        fala_beneficio="Espuma anatômica alivia a dor e pressão ao sentar.", # 9 palavras, 51 chars
        fala_cta="Clica no carrinho e garante!", # 5 palavras, 28 chars
        # Total palavras: 3 + 9 + 5 = 17? Espera: precisamos de 18 palavras mínimo!
    )
    # Ajustando benefício para 10 palavras mantendo caracteres baixos:
    script.partes.fala_beneficio = "Espuma anatômica alivia a dor e toda pressão ao sentar." # 10 palavras, 56 chars
    # Total palavras: 3 + 10 + 5 = 18 palavras (piso exato!)
    # Total caracteres: 43 + 56 + 28 + 2 = 129 chars (<= 150!)
    valido, erro, contagens = validar_e_contar_palavras(script)
    assert valido is True, f"Esperado válido, mas deu erro: {erro}"
    assert contagens.dor == 3
    assert contagens.caracteres_dor == 43  # <= 45


def test_palavras_longas_estourando_caracteres():
    """Testa palavra longa em português que estoura limite de caracteres com poucas palavras."""
    script = _criar_script_base(
        fala_dor="Anticonstitucionalissimamente falando hoje aqui?",
    )
    valido, erro, contagens = validar_e_contar_palavras(script)
    # 4 palavras (passaria em palavras <= 7), mas tem 48 caracteres (> 45)
    assert contagens.dor == 4
    assert contagens.caracteres_dor == 48
    assert valido is False
    assert f"Gancho Dor tem 48 caracteres (máx {MAX_CHARS_HOOK})" in erro


def test_espacamento_e_quebras_de_linha():
    """Testa se múltiplos espaços e quebras de linha não distorcem a contagem de palavras."""
    script = _criar_script_base(
        fala_dor="  Cansaço   nas   costas \n todo   dia?  ",
    )
    valido, erro, contagens = validar_e_contar_palavras(script)
    assert valido is True
    assert contagens.dor == 5


def test_script_sem_partes_needs_clarification():
    """Se o status for 'needs_clarification' ou sem partes, não deve falhar na validação de locução."""
    script = ScriptResult(
        status="needs_clarification",
        diagnosis="Produto ambíguo",
        partes=None,
        multiple_hooks=None,
    )
    valido, erro, contagens = validar_e_contar_palavras(script)
    assert valido is True
    assert erro == ""
    assert contagens.gancho == 0
