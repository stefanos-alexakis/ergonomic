/**
 * Relatórios do Eixo 1 (atalho para os painéis das pesquisas) — parte pura.
 *
 * O painel de uma pesquisa só é emitido quando há respostas concluídas
 * suficientes (mínimo de anonimato da pesquisa). É a mesma regra do próprio
 * painel (`calcularDashboard`): sem ela, a página do painel só mostra o aviso.
 */
export function painelDisponivel(concluidas: number, limiteSupressaoGrupo: number): boolean {
  return concluidas >= limiteSupressaoGrupo;
}

/** "18 de 25" quando há códigos gerados; só o número quando não há. */
export function rotuloRespostas(concluidas: number, codigos: number): string {
  return codigos > 0 ? `${concluidas} de ${codigos}` : String(concluidas);
}
