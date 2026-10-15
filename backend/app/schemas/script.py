from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class ClarificationQuestion(BaseModel):
    id: str = Field(description="Identificador único da pergunta (ex: 'q1')")
    question: str = Field(description="Texto da pergunta de esclarecimento diagnóstica")
    options: List[str] = Field(description="Lista de até 3 opções de resposta objetivas (ex: ['1. Foco no caimento...', '2. Foco no tecido...'])")

class SceneItem(BaseModel):
    scene_number: int = Field(description="Número da cena: 1, 2 ou 3")
    scene_title: str = Field(description="Título da cena: '1. GANCHO', '2. BENEFÍCIO/USO' ou '3. CTA'")
    duration: str = Field(description="Duração da cena (ex: '0-3s', '3-8s', '8-10s')")
    visual_prompt: str = Field(description="Prompt visual em inglês milimetricamente detalhado para Veo3/Dreamina, com movimento de câmera, iluminação e foco no produto")
    voiceover: str = Field(description="Texto conciso e persuasivo de locução em Português (PT-BR) para retenção e conversão")

class MultipleHooks(BaseModel):
    dor: str = Field(description="Opção de gancho inicial focada na Dor/Problema que o produto resolve")
    curiosidade: str = Field(description="Opção de gancho inicial focada em Curiosidade/Segredo/Revelação")
    quebra_de_padrao: str = Field(description="Opção de gancho inicial com quebra de padrão visual e auditiva extrema")

class ScriptResult(BaseModel):
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
    multiple_hooks: Optional[MultipleHooks] = Field(
        default=None,
        description="As 3 alternativas de gancho (Dor, Curiosidade, Quebra de Padrão) para a Cena 1"
    )
    selected_hook_type: Optional[str] = Field(
        default=None,
        description="Qual dos ganchos foi aplicado diretamente na tabela da Cena 1"
    )
    scenes: Optional[List[SceneItem]] = Field(
        default=None,
        description="Lista ordenada das 3 cenas modulares (Gancho, Uso, CTA)"
    )
    internal_checklist: Optional[List[str]] = Field(
        default=None,
        description="Checklist interno de validação aprovado pela IA (duração total <= 15s, prompts em inglês, sem alucinações)"
    )
    refinement_summary: Optional[str] = Field(
        default=None,
        description="Explicação da variável alterada caso este resultado seja fruto de um refinamento"
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
