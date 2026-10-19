import type { SavedScriptItem, CopiedSnapshot } from '../types';
import { countChars } from './textMetrics';

export const COLUNAS_CSV_HISTORICO = [
  'data',
  'produto',
  'modelo_utilizado',
  'gancho_usado',
  'chars_gancho',
  'chars_beneficio',
  'chars_cta',
  'chars_total',
  'prompt_enviado',
  'locucao_enviada',
  'data_copia',
  'prompt_editado',
  'foi_ao_veo',
  'postado',
  'defeito_visual',
  'voz_ok',
  'views',
  'retencao',
  'cliques',
  'pedidos',
  'observacao',
  'refinamento',
] as const;

/**
 * Escapa uma célula de texto para CSV respeitando o delimitador ';' e pontuação.
 */
export function escaparCelulaCsv(valor: any): string {
  if (valor === null || valor === undefined) return '';
  const str = String(valor);
  if (
    str.includes(';') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Função pura que aplica o instantâneo de cópia ao registro correto no histórico.
 * - Copiar duas vezes substitui pelo último.
 * - Copiar depois de refinar atinge apenas o registro refinado.
 * - Registros legados não quebram.
 */
export function aplicarSnapshotHistorico(
  historico: SavedScriptItem[],
  targetId: string | null | undefined,
  snapshot: CopiedSnapshot
): SavedScriptItem[] {
  if (!historico || historico.length === 0) return historico;
  const idAlvo = targetId || historico[0].id;

  return historico.map((item) => {
    if (item.id === idAlvo) {
      return {
        ...item,
        ...snapshot,
        copied_snapshot: snapshot,
      };
    }
    return item;
  });
}

/**
 * Extrai o nome do produto para o CSV:
 * - PRIMEIRA LINHA do campo de contexto, até 80 caracteres.
 * - Remove links da primeira linha. Se for apenas link ou vazio, usa a categoria.
 * - NUNCA o texto inteiro do anúncio nem o link.
 */
export function extrairNomeProduto(context?: string, category?: string): string {
  if (context && context.trim()) {
    const linhas = context.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (linhas.length > 0) {
      // Remove URLs http/https se presentes na primeira linha
      const primeiraLinhaSemLink = linhas[0].replace(/https?:\/\/\S+/gi, '').trim();
      const truncado = primeiraLinhaSemLink.slice(0, 80).trim();
      if (truncado) {
        return truncado;
      }
    }
  }
  return category?.trim() || '';
}

/**
 * Função pura que recebe os itens do histórico e monta a string do CSV com 22 colunas.
 * Inclui o BOM UTF-8 (\uFEFF) para visualização correta no Excel e Google Sheets.
 */
export function montarCsv(items: SavedScriptItem[]): string {
  const linhas: string[] = [];

  // 1. Cabeçalho (22 colunas)
  linhas.push(COLUNAS_CSV_HISTORICO.join(';'));

  // 2. Linhas de dados
  for (const item of items) {
    // Determinação da data de geração
    let dataFormatada = item.createdAtDate || '';
    if (!dataFormatada && item.id && !isNaN(Number(item.id))) {
      try {
        dataFormatada = new Date(Number(item.id)).toLocaleDateString('pt-BR');
      } catch {
        dataFormatada = '';
      }
    }
    if (!dataFormatada && item.createdAt) {
      dataFormatada = item.createdAt;
    }

    // 1. Produto: PRIMEIRA LINHA do contexto, até 80 caracteres. Se vazio (ou link), usa a categoria.
    const categoria = item.category || item.result?.category || '';
    const produto = extrairNomeProduto(item.context, categoria);

    // Modelo utilizado
    const modelo = item.result?.modelo_utilizado || '';

    // Verifica se houve cópia (snapshot presente)
    const foiCopiado = Boolean(item.data_copia || item.copied_snapshot?.data_copia);

    let ganchoUsado = '';
    let charsGancho = '';
    let charsBeneficio = '';
    let charsCta = '';
    let charsTotal = '';
    let promptEnviado = '';
    let locucaoEnviada = '';
    let dataCopia = '';

    if (foiCopiado) {
      ganchoUsado = item.gancho_usado || item.copied_snapshot?.gancho_usado || '';
      dataCopia = item.data_copia || item.copied_snapshot?.data_copia || '';
      promptEnviado = item.prompt_enviado || item.copied_snapshot?.prompt_enviado || '';
      locucaoEnviada = item.locucao_enviada || item.copied_snapshot?.locucao_enviada || '';

      const fg = item.fala_gancho ?? item.copied_snapshot?.fala_gancho ?? '';
      const fb = item.fala_beneficio ?? item.copied_snapshot?.fala_beneficio ?? '';
      const fc = item.fala_cta ?? item.copied_snapshot?.fala_cta ?? '';

      charsGancho = countChars(fg).toString();
      charsBeneficio = countChars(fb).toString();
      charsCta = countChars(fc).toString();
      charsTotal = countChars(locucaoEnviada).toString();
    }

    // 2. Coluna 'refinamento': apenas a instrução digitada pelo usuário ou botão clicado.
    // NUNCA usa os resumos escritos pelo modelo (refinement_summary).
    const refinamento = item.refinementInstruction?.trim() || '';

    const valoresLinha = [
      escaparCelulaCsv(dataFormatada),
      escaparCelulaCsv(produto),
      escaparCelulaCsv(modelo),
      escaparCelulaCsv(ganchoUsado),
      escaparCelulaCsv(charsGancho),
      escaparCelulaCsv(charsBeneficio),
      escaparCelulaCsv(charsCta),
      escaparCelulaCsv(charsTotal),
      escaparCelulaCsv(promptEnviado),
      escaparCelulaCsv(locucaoEnviada),
      escaparCelulaCsv(dataCopia),
      '', // prompt_editado (em branco)
      '', // foi_ao_veo (em branco)
      '', // postado (em branco)
      '', // defeito_visual (em branco)
      '', // voz_ok (em branco)
      '', // views (em branco)
      '', // retencao (em branco)
      '', // cliques (em branco)
      '', // pedidos (em branco)
      '', // observacao (em branco)
      escaparCelulaCsv(refinamento),
    ];

    linhas.push(valoresLinha.join(';'));
  }

  // Retorna com BOM UTF-8
  return `\uFEFF${linhas.join('\r\n')}`;
}

/**
 * Dispara o download do arquivo CSV no navegador do usuário.
 */
export function baixarCsv(
  textoCsv: string,
  nomeArquivo: string = 'historico_roteiros_veo.csv'
): void {
  const blob = new Blob([textoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
