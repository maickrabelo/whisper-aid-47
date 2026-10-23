import JSZip from 'jszip';

export interface ExportFile { name: string; xml: string }
export interface PreparedDownload { blob: Blob; filename: string; count: number }
export async function prepareXmlDownload(files: ExportFile[], prefix: string): Promise<PreparedDownload> {
  if (!files.length || new Set(files.map(f => f.name)).size !== files.length) throw new Error('Arquivos de exportação ausentes ou duplicados.');
  for (const file of files) {
    if (!/^S\d{4}_[A-Z0-9_]+\.xml$/.test(file.name) || !file.xml.startsWith('<?xml')) throw new Error('Arquivo de exportação inválido.');
  }
  if (files.length === 1) {
    const file = files[0];
    if (!file) throw new Error('Arquivo ausente.');
    return { blob: new Blob([file.xml], { type: 'application/xml;charset=utf-8' }), filename: file.name, count: 1 };
  }
  const zip = new JSZip();
  for (const file of files) zip.file(file.name, file.xml);
  zip.file('LEIA-ME.txt', 'XMLs sem assinatura digital. Preparação para importação, validação, assinatura e envio em sistema transmissor externo compatível. Não são recibos de envio ou aceite. Não há upload de XML no portal web do eSocial. Verifique o ambiente tpAmb e não envie dados simulados em produção.');
  return { blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), filename: `${prefix}_SEM_ASSINATURA.zip`, count: files.length };
}
/** Call synchronously from the final download click, after async preparation. */
export async function deliverPreparedFile(file: PreparedDownload): Promise<void> {
  const shared = new File([file.blob], file.filename, { type: file.blob.type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [shared] })) {
    try { await navigator.share({ files: [shared], title: file.filename }); return; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = url; a.download = file.filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}