/** La orden no tiene paquetes: el handler responde 409. */
export class EmptyOrderError extends Error {
  constructor(message = 'La orden no tiene paquetes.') {
    super(message);
    this.name = 'EmptyOrderError';
  }
}
