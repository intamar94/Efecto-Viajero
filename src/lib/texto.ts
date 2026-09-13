// Un párrafo real (de Wikivoyage, de donde sea) suele ser más largo de lo
// que cabe en una tarjeta que hay que poder leer de un vistazo. Se recorta
// a las primeras frases completas que quepan en el largo pedido — nunca a
// media palabra, ni a mitad de frase.
export function acortarTexto(texto: string, maxCaracteres: number): string {
  const frases = (texto.match(/[^.!?]+[.!?]+\s*/g) ?? [texto]).map((f) => f.trim()).filter(Boolean);
  let resultado = frases[0] ?? texto;
  for (let i = 1; i < frases.length; i++) {
    if (`${resultado} ${frases[i]}`.length > maxCaracteres) break;
    resultado += ` ${frases[i]}`;
  }
  return resultado;
}
