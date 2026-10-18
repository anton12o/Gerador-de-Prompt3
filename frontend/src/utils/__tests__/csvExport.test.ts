import { describe, it, expect } from 'vitest';
import {
  COLUNAS_CSV_HISTORICO,
  montarCsv,
  aplicarSnapshotHistorico,
  escaparCelulaCsv,
} from '../csvExport';
import { calcularMetricasLocucao, countChars, countWords } from '../textMetrics';
import type { SavedScriptItem, CopiedSnapshot } from '../../types';

describe('Exportação de Histórico em CSV (22 Colunas)', () => {
  it('deve ter exatamente 22 colunas definidas na ordem correta', () => {
    expect(COLUNAS_CSV_HISTORICO).toHaveLength(22);
    expect(COLUNAS_CSV_HISTORICO[0]).toBe('data');
    expect(COLUNAS_CSV_HISTORICO[1]).toBe('produto');
    expect(COLUNAS_CSV_HISTORICO[2]).toBe('modelo_utilizado');
    expect(COLUNAS_CSV_HISTORICO[11]).toBe('prompt_editado');
    expect(COLUNAS_CSV_HISTORICO[20]).toBe('observacao');
    expect(COLUNAS_CSV_HISTORICO[21]).toBe('refinamento');
  });

  it('montarCsv: gera CSV com registro novo contendo snapshot de cópia', () => {
    const itemNovo: SavedScriptItem = {
      id: '1729270000000',
      createdAt: '18:00',
      createdAtDate: '18/10/2026',
      productSummary: 'Almofada Ortopédica',
      context: 'Almofada ergonômica para dores lombares',
      category: 'Saúde e Conforto',
      refinementInstruction: 'Focar na densidade da espuma',
      result: {
        status: 'completed',
        diagnosis: 'Dores nas costas no trabalho',
        category: 'Saúde e Conforto',
        modelo_utilizado: 'gemini-3.5-flash-lite',
      },
      data_copia: '18/10/2026 18:05:00',
      gancho_usado: 'dor',
      prompt_enviado: 'Start frame: ergonomic cushion...',
      locucao_enviada: 'Dor nas costas todo dia? Espuma densa alivia. Garanta a sua!',
      fala_gancho: 'Dor nas costas todo dia?',
      fala_beneficio: 'Espuma densa alivia.',
      fala_cta: 'Garanta a sua!',
    };

    const csv = montarCsv([itemNovo]);

    // Deve começar com BOM UTF-8
    expect(csv.startsWith('\uFEFF')).toBe(true);

    const linhas = csv.replace('\uFEFF', '').split('\r\n');
    expect(linhas).toHaveLength(2); // Cabeçalho + 1 linha

    const cabecalho = linhas[0].split(';');
    expect(cabecalho).toHaveLength(22);

    const valores = linhas[1].split(';');
    expect(valores).toHaveLength(22);

    expect(valores[0]).toBe('18/10/2026');
    expect(valores[1]).toBe('Almofada ergonômica para dores lombares');
    expect(valores[2]).toBe('gemini-3.5-flash-lite');
    expect(valores[3]).toBe('dor');
    expect(valores[4]).toBe(String('Dor nas costas todo dia?'.length));
    expect(valores[5]).toBe(String('Espuma densa alivia.'.length));
    expect(valores[6]).toBe(String('Garanta a sua!'.length));
    expect(valores[7]).toBe(
      String('Dor nas costas todo dia? Espuma densa alivia. Garanta a sua!'.length)
    );
    expect(valores[8]).toBe('Start frame: ergonomic cushion...');
    expect(valores[9]).toBe(
      'Dor nas costas todo dia? Espuma densa alivia. Garanta a sua!'
    );
    expect(valores[10]).toBe('18/10/2026 18:05:00');

    // 10 colunas em branco (índices 11 a 20)
    for (let i = 11; i <= 20; i++) {
      expect(valores[i]).toBe('');
    }

    // Coluna 22: refinamento
    expect(valores[21]).toBe('Focar na densidade da espuma');
  });

  it('montarCsv: registro legado ou nunca copiado mantém campos vazios e 22 colunas', () => {
    const itemLegado: SavedScriptItem = {
      id: '1700000000000',
      createdAt: '10:00',
      productSummary: 'Garrafa Térmica',
      result: {
        status: 'completed',
        diagnosis: 'Água gelada 24h',
        category: 'Cozinha',
        modelo_utilizado: 'gemini-3.8-flash',
      },
      // Sem data_copia nem prompt_enviado
    };

    const csv = montarCsv([itemLegado]);
    const linhas = csv.replace('\uFEFF', '').split('\r\n');
    const valores = linhas[1].split(';');

    expect(valores).toHaveLength(22);
    // Produto sem context deve usar a categoria (Cozinha), não o diagnóstico
    expect(valores[1]).toBe('Cozinha');
    expect(valores[2]).toBe('gemini-3.8-flash');
    // Campos de cópia vazios
    expect(valores[3]).toBe(''); // gancho_usado
    expect(valores[4]).toBe(''); // chars_gancho
    expect(valores[5]).toBe(''); // chars_beneficio
    expect(valores[6]).toBe(''); // chars_cta
    expect(valores[7]).toBe(''); // chars_total
    expect(valores[8]).toBe(''); // prompt_enviado
    expect(valores[9]).toBe(''); // locucao_enviada
    expect(valores[10]).toBe(''); // data_copia
    expect(valores[21]).toBe(''); // refinamento vazio
  });

  it('montarCsv: texto com aspas, ponto e vírgula e quebras de linha mantém colunas estáveis', () => {
    const itemComplexo: SavedScriptItem = {
      id: '1729280000000',
      createdAt: '19:00',
      context: 'Produto com "aspas", ponto; e \n quebra de linha',
      productSummary: 'Resumo',
      category: 'Geral',
      result: {
        status: 'completed',
        diagnosis: 'Teste',
        modelo_utilizado: 'gemini-3.5-flash-lite',
      },
      data_copia: '18/10/2026 19:01:00',
      gancho_usado: 'curiosidade',
      prompt_enviado: 'Line 1\nLine 2; with "quotes"',
      locucao_enviada: 'Fala 1; "fala 2"\nFala 3',
      fala_gancho: 'Fala 1',
      fala_beneficio: '"fala 2"',
      fala_cta: 'Fala 3',
    };

    const csv = montarCsv([itemComplexo]);
    expect(csv).toContain('""aspas""');
    expect(csv).toContain('Line 1\nLine 2; with ""quotes""');

    // Validação de escape puro
    expect(escaparCelulaCsv('texto com "aspas" e ;')).toBe(
      '"texto com ""aspas"" e ;"'
    );
  });
});

describe('aplicarSnapshotHistorico', () => {
  it('copiar 2x consecutivas substitui o instantâneo pelo último', () => {
    const itemOriginal: SavedScriptItem = {
      id: 'item-1',
      createdAt: '12:00',
      productSummary: 'Fone Bluetooth',
      result: { status: 'completed', diagnosis: 'Fone' },
    };

    const snapshot1: CopiedSnapshot = {
      prompt_enviado: 'Prompt 1 (Dor)',
      locucao_enviada: 'Locução 1',
      fala_gancho: 'Gancho 1',
      fala_beneficio: 'Beneficio 1',
      fala_cta: 'CTA 1',
      gancho_usado: 'dor',
      data_copia: '18/10/2026 12:01:00',
    };

    const snapshot2: CopiedSnapshot = {
      prompt_enviado: 'Prompt 2 (Curiosidade)',
      locucao_enviada: 'Locução 2',
      fala_gancho: 'Gancho 2',
      fala_beneficio: 'Beneficio 2',
      fala_cta: 'CTA 2',
      gancho_usado: 'curiosidade',
      data_copia: '18/10/2026 12:05:00',
    };

    let historico = [itemOriginal];
    historico = aplicarSnapshotHistorico(historico, 'item-1', snapshot1);
    expect(historico[0].gancho_usado).toBe('dor');
    expect(historico[0].prompt_enviado).toBe('Prompt 1 (Dor)');

    historico = aplicarSnapshotHistorico(historico, 'item-1', snapshot2);
    expect(historico[0].gancho_usado).toBe('curiosidade');
    expect(historico[0].prompt_enviado).toBe('Prompt 2 (Curiosidade)');
    expect(historico[0].data_copia).toBe('18/10/2026 12:05:00');
  });

  it('copiar depois de refinar atinge apenas o registro refinado', () => {
    const item1: SavedScriptItem = {
      id: 'script-original',
      createdAt: '14:00',
      productSummary: 'Mochila Impermeável',
      result: { status: 'completed', diagnosis: 'Mochila' },
    };

    const item2: SavedScriptItem = {
      id: 'script-refinado',
      createdAt: '14:05',
      productSummary: 'Mochila Impermeável (Refinada)',
      refinementInstruction: 'Enfatizar zíper selado',
      result: { status: 'completed', diagnosis: 'Mochila Refinada' },
    };

    const snapshotRefinado: CopiedSnapshot = {
      prompt_enviado: 'Prompt Veo focado no zíper...',
      locucao_enviada: 'Zíper selado 100% à prova d água.',
      fala_gancho: 'Chuva no caminho?',
      fala_beneficio: 'Zíper selado 100% à prova d água.',
      fala_cta: 'Compre já!',
      gancho_usado: 'quebra_de_padrao',
      data_copia: '18/10/2026 14:06:00',
    };

    let historico = [item2, item1];
    historico = aplicarSnapshotHistorico(
      historico,
      'script-refinado',
      snapshotRefinado
    );

    // Item refinado recebeu os dados
    expect(historico[0].prompt_enviado).toBe('Prompt Veo focado no zíper...');
    expect(historico[0].gancho_usado).toBe('quebra_de_padrao');

    // Item original permaneceu intacto sem cópia
    expect(historico[1].prompt_enviado).toBeUndefined();
    expect(historico[1].data_copia).toBeUndefined();
  });

  it('registro legado não quebra ao receber snapshot', () => {
    const legado: SavedScriptItem = {
      id: 'legado-1',
      createdAt: '09:00',
      productSummary: 'Antigo',
      result: { status: 'completed', diagnosis: 'Teste legado' },
    };

    const snap: CopiedSnapshot = {
      prompt_enviado: 'Prompt legado',
      locucao_enviada: 'Locução',
      fala_gancho: 'G',
      fala_beneficio: 'B',
      fala_cta: 'C',
      gancho_usado: 'dor',
      data_copia: '18/10/2026 09:10:00',
    };

    const res = aplicarSnapshotHistorico([legado], 'legado-1', snap);
    expect(res).toHaveLength(1);
    expect(res[0].prompt_enviado).toBe('Prompt legado');
    expect(res[0].result.diagnosis).toBe('Teste legado');
  });
});

describe('textMetrics (Contagem compartilhada)', () => {
  it('calcula métricas idênticas à tela e ao validador', () => {
    const gancho = 'Cansaço nas costas todo dia?';
    const beneficio = 'Espuma densa alivia a coluna.';
    const cta = 'Clica e garante!';

    const metricas = calcularMetricasLocucao(gancho, beneficio, cta);

    expect(metricas.charsGancho).toBe(gancho.length);
    expect(metricas.charsBeneficio).toBe(beneficio.length);
    expect(metricas.charsCta).toBe(cta.length);

    const esperada = `${gancho} ${beneficio} ${cta}`;
    expect(metricas.locucao).toBe(esperada);
    expect(metricas.charsTotal).toBe(esperada.length);

    expect(countWords(gancho)).toBe(5);
    expect(countWords(cta)).toBe(3);
    expect(countChars(gancho)).toBe(28);
  });
});
