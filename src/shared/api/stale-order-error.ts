/** La orden cambió desde que la pantalla la cargó: el handler responde 409. */
export class StaleOrderError extends Error {
  constructor() {
    super('La orden cambió. Recarga la página.');
    this.name = 'StaleOrderError';
  }
}
