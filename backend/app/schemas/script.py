from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class ClarificationQuestion(BaseModel):
    id: str = Field(description="Identificador único da pergunta (ex: 'q1')")
    question: str = Field(description="Texto da pergunta de esclarecimento diagnóstica")
    options: List[str] = Field(description="Lista de até 3 opções de resposta objetivas (ex: ['1. Foco no caimento...', '2. Foco no tecido...'])")

class HookOption(BaseModel):
    tipo: str = Field(description="Tipo de gancho: 'Dor', 'Curiosidade' ou 'Quebra de Padrão'")
    fala: str = Field(description="Texto da locução para este gancho em Português (máximo 7 palavras)")
    acao_visual_0_3s: str = Field(
        description="Descrição em inglês da ação visual do bloco 0-3s com movimento dinâmico obrigatório (mão pegando o produto, líquido servido, rotação suave, etc.)"
    )
    palavras_contadas: Optional[int] = Field(
        default=None,
        description="Contagem real de palavras calculada pelo backend"
    )
    caracteres_contados: Optional[int] = Field(
        default=None,
        description="Contagem real de caracteres com espaços calculada pelo backend (máximo 45)"
    )

class MultipleHooks(BaseModel):
    dor: HookOption = Field(description="Opção de gancho inicial focada na Dor/Problema que o produto resolve")
    curiosidade: HookOption = Field(description="Opção de gancho inicial focada em Curiosidade/Segredo/Revelação")
    quebra_de_padrao: HookOption = Field(description="Opção de gancho inicial com quebra de padrão visual e auditiva extrema")

class ScriptPartes(BaseModel):
    """Partes estruturadas retornadas pelo modelo para montagem determinística do prompt Veo 10s."""
    descricao_produto: str = Field(
        description="Descrição física detalhada em inglês do produto (cor, material, textura, acabamentos) ancorada na foto de referência com Anchor Prompts espaciais rígidos (ex: blades firmly anchored to motor base, handle securely fixed to body)"
    )
    descricao_cenario: str = Field(
        description="Descrição em inglês da bancada/superfície/ambiente limpo mantido ao longo de todo o vídeo"
    )
    fala_beneficio: str = Field(
        description="Texto da locução para o bloco 3-7s em Português (máximo 11 palavras e até 70 caracteres, derivado exclusivamente da descrição do produto)"
    )
    bloco_beneficio_visual: str = Field(
        description="Descrição em inglês da ação visual de demonstração de benefício/uso prático (3-7s) no mesmo cenário com integridade das partes"
    )
    fala_cta: str = Field(
        description="Texto da locução para o bloco 7-10s em Português (máximo 5 palavras e até 35 caracteres, chamada de ação direta para o carrinho/link)"
    )
    bloco_cta_visual: str = Field(
        description="Descrição em inglês do Hero Shot (7-10s) que OBRIGATORIAMENTE REPETE a ancoragem física das partes do produto (ex: blades anchored to base, handle fixed to body) para evitar peças flutuando no corte final"
    )

class ContagemBlocos(BaseModel):
    gancho: int = Field(default=0, description="Palavras no gancho ativo")
    beneficio: int = Field(default=0, description="Palavras no benefício")
    cta: int = Field(default=0, description="Palavras no CTA")
    dor: int = Field(default=0, description="Palavras no gancho Dor")
    curiosidade: int = Field(default=0, description="Palavras no gancho Curiosidade")
    quebra_de_padrao: int = Field(default=0, description="Palavras no gancho Quebra de Padrão")
    caracteres_gancho: int = Field(default=0, description="Caracteres no gancho ativo (máx 45)")
    caracteres_beneficio: int = Field(default=0, description="Caracteres no benefício (máx 70)")
    caracteres_cta: int = Field(default=0, description="Caracteres no CTA (máx 35)")
    caracteres_total: int = Field(default=0, description="Caracteres totais da locução ativa (máx 150)")
    caracteres_dor: int = Field(default=0, description="Caracteres no gancho Dor (máx 45)")
    caracteres_curiosidade: int = Field(default=0, description="Caracteres no gancho Curiosidade (máx 45)")
    caracteres_quebra_de_padrao: int = Field(default=0, description="Caracteres no gancho Quebra de Padrão (máx 45)")

class ScriptModelOutput(BaseModel):
    """Schema estrito para o retorno do modelo Gemini (sem dicionários genéricos)."""
    status: Literal["needs_clarification", "completed"] = Field(
        description="Indica se a IA precisa de esclarecimento do usuário ('needs_clarification') ou se entregou o roteiro pronto ('completed')"
    )
    diagnosis: str = Field(
        description="Diagnóstico da IA em 1-2 linhas explicando o ângulo de venda, categoria identificada e estratégia de câmera"
    )
    category: Optional[str] = Field(
        default="Geral",
        description="Categoria identificada do produto: Eletrônicos, Moda, Casa/Praticidade, Beleza ou Outros"
    )
    clarification_questions: Optional[List[ClarificationQuestion]] = Field(
        default=None,
        description="Perguntas de múltipla escolha se o status for 'needs_clarification'"
    )
    partes: Optional[ScriptPartes] = Field(
        default=None,
        description="Partes modulares estruturadas para montagem do prompt Veo de 10s e falas"
    )
    multiple_hooks: Optional[MultipleHooks] = Field(
        default=None,
        description="As 3 alternativas de gancho (Dor, Curiosidade, Quebra de Padrão) com fala e ação visual 0-3s"
    )
    selected_hook_type: Optional[str] = Field(
        default="dor",
        description="Qual gancho está ativo no prompt ('dor', 'curiosidade' ou 'quebra_de_padrao')"
    )
    refinement_summary: Optional[str] = Field(
        default=None,
        description="Explicação da variável alterada caso este resultado seja fruto de um refinamento"
    )

class SceneItem(BaseModel):
    """Modelo legado de cena única (mantido para retrocompatibilidade do histórico)."""
    scene_number: int = Field(default=1)
    scene_title: str = Field(default="")
    duration: str = Field(default="")
    visual_prompt: str = Field(default="")
    voiceover: str = Field(default="")

class ScriptResult(ScriptModelOutput):
    """Resultado final enriquecido retornado pela API para o frontend."""
    prompt_veo: Optional[str] = Field(
        default=None,
        description="Prompt contínuo de 10s para Veo com cabeçalho ancorado, anti-UI unificado e blocos temporais com fala embutida"
    )
    locucao_pt: Optional[str] = Field(
        default=None,
        description="Texto integral da locução em Português (soma do gancho selecionado + benefício + CTA)"
    )
    total_palavras: Optional[int] = Field(
        default=None,
        description="Contagem real total de palavras calculada pelo backend (estritamente entre 18 e 23 palavras)"
    )
    total_caracteres: Optional[int] = Field(
        default=None,
        description="Contagem real total de caracteres com espaços calculada pelo backend (máximo 150 caracteres)"
    )
    contagem_blocos: Optional[ContagemBlocos] = Field(
        default=None,
        description="Contagens individuais de palavras e caracteres calculadas pelo backend"
    )
    modelo_utilizado: Optional[str] = Field(
        default=None,
        description="Modelo de IA utilizado com sucesso para gerar o roteiro (ex: gemini-3.5-flash-lite ou gemini-3.8-flash)"
    )
    scenes: Optional[List[SceneItem]] = Field(
        default=None,
        description="Campo legado mantido opcional para suporte aos registros antigos do histórico"
    )

class GenerateScriptRequest(BaseModel):
    image_base64: Optional[str] = Field(default=None, description="Imagem única em formato base64 (legado)")
    images_base64: Optional[List[str]] = Field(default=None, description="Lista de imagens em formato base64 (até 4 fotos)")
    image_mime_type: Optional[str] = Field(default="image/jpeg", description="Tipo mime padrão das imagens")
    context: Optional[str] = Field(default="", description="Link do produto, instrução adicional ou observações do usuário")
    style_preset: Optional[str] = Field(default="ugc_realista", description="Estilo visual: 'ugc_realista', 'cinematic_studio' ou 'macro_produto'")
    video_engine: Optional[str] = Field(default="veo3", description="Ferramenta alvo: 'veo3', 'dreamina', 'kling' ou 'luma'")
    force_generation: Optional[bool] = Field(default=False, description="Se True, forçar a geração imediata sem perguntar esclarecimentos")
    clarification_answers: Optional[Dict[str, str]] = Field(default=None, description="Respostas às perguntas de esclarecimento")
    previous_response: Optional[Dict[str, Any]] = Field(default=None, description="Script anterior gerado para permitir refinamento iterativo")
    refinement_instruction: Optional[str] = Field(default=None, description="Comando de refinamento (ex: 'mude o gancho para curiosidade')")
