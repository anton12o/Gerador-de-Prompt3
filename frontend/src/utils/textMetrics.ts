/**
 * Funções compartilhadas e determinísticas para contagem de caracteres e palavras,
 * alinhadas rigorosamente com o validador do backend e os badges da interface.
 */

export function countWords(str?: string): number {
  return str && str.trim() ? str.trim().split(/\s+/).length : 0;
}

export function countChars(str?: string): number {
  return str ? str.length : 0;
}

export function assembleLocucaoPt(
  falaGancho?: string,
  falaBeneficio?: string,
  falaCta?: string
): string {
  return `${falaGancho || ''} ${falaBeneficio || ''} ${falaCta || ''}`.trim();
}

export function calcularMetricasLocucao(
  falaGancho?: string,
  falaBeneficio?: string,
  falaCta?: string
) {
  const g = falaGancho || '';
  const b = falaBeneficio || '';
  const c = falaCta || '';
  const locucao = assembleLocucaoPt(g, b, c);

  return {
    charsGancho: countChars(g),
    charsBeneficio: countChars(b),
    charsCta: countChars(c),
    charsTotal: countChars(locucao),
    wordsGancho: countWords(g),
    wordsBeneficio: countWords(b),
    wordsCta: countWords(c),
    wordsTotal: countWords(locucao),
    locucao,
  };
}
