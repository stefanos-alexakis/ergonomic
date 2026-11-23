/**
 * Valor para um <input type="datetime-local"> (aaaa-mm-ddThh:mm), no mesmo
 * fuso em que o servidor lê o campo de volta (`new Date(texto)`), para a data
 * mostrada ao editar ser exatamente a gravada.
 */
export function paraDatetimeLocal(d: Date): string {
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;
}
