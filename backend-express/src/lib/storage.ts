import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const BUCKET = 'sia-files';
const SIGNED_URL_TTL = 60 * 60; // 1 hora

function getClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

// Gera uma CHAVE de storage ASCII-safe. O Supabase Storage rejeita chaves com
// caracteres não-ASCII (acentos: á, ç, ã, í...) com "Invalid key". O nome original
// (com acentos) continua salvo em `attachment.name` para exibição e download —
// aqui só sanitizamos a chave do objeto no bucket.
export function sanitizeStorageName(name: string): string {
  const cleaned = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos (á -> a, ç -> c)
    .replace(/[/\\]/g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/[^\x20-\x7e]/g, '_') // qualquer não-ASCII restante -> _
    .trim();
  return cleaned || 'arquivo';
}

export async function uploadFile(
  path: string,
  base64Data: string,
  contentType = 'application/octet-stream',
): Promise<string> {
  const supabase = getClient();
  const buffer = Buffer.from(base64Data, 'base64');
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload falhou: ${error.message}`);
  return path;
}

export async function getSignedUrl(path: string, expiresIn = SIGNED_URL_TTL, downloadName?: string): Promise<string> {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data) {
    // Objeto some do bucket (removido fora do fluxo do app / referência órfã):
    // devolve 404 com mensagem clara em vez de estourar 500 genérico.
    if (/not.?found/i.test(error?.message ?? '')) {
      throw Object.assign(new Error('Arquivo indisponível (removido do armazenamento).'), { status: 404 });
    }
    throw new Error(`Storage URL falhou: ${error?.message}`);
  }
  // Força o Content-Disposition com o NOME ORIGINAL. Não usamos a option
  // `{ download }` do supabase-js porque ela DUPLO-ENCODA acentos/parênteses
  // (ex.: "í" vira "%25C3%25AD" e o arquivo baixa com o nome escapado). Anexar
  // `&download=` manualmente com encode simples entrega o nome correto.
  return downloadName
    ? `${data.signedUrl}&download=${encodeURIComponent(downloadName)}`
    : data.signedUrl;
}

export async function deleteFile(path: string): Promise<void> {
  try {
    const supabase = getClient();
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    
  }
}

export function storageEnabled(): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
}

// Remove recursivamente todos os arquivos de uma "pasta" (prefixo) no bucket.
// Usado ao excluir uma diretoria/projeto/atividade/evento (evita arquivos órfãos).
export async function deleteFolder(folderPath: string): Promise<void> {
  if (!storageEnabled()) return;
  try {
    const supabase = getClient();
    const { data: entries, error } = await supabase.storage
      .from(BUCKET)
      .list(folderPath, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error || !entries || entries.length === 0) return;
    // No Supabase Storage, arquivos têm `id`; subpastas não.
    const files = entries.filter((e) => e.id).map((e) => `${folderPath}/${e.name}`);
    const folders = entries.filter((e) => !e.id).map((e) => `${folderPath}/${e.name}`);
    if (files.length > 0) await supabase.storage.from(BUCKET).remove(files);
    for (const sub of folders) await deleteFolder(sub);
  } catch {
    /* não bloqueia a exclusão do recurso */
  }
}
