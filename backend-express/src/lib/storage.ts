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

/**
 * Faz upload de um arquivo (base64) para o Supabase Storage.
 * Retorna o path dentro do bucket (ex: "atas/event-123.pdf").
 */
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

/**
 * Gera uma URL assinada temporária para download (válida por 1h por padrão).
 */
export async function getSignedUrl(path: string, expiresIn = SIGNED_URL_TTL, downloadName?: string): Promise<string> {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn, downloadName ? { download: downloadName } : undefined);
  if (error || !data) throw new Error(`Storage URL falhou: ${error?.message}`);
  return data.signedUrl;
}

/**
 * Remove um arquivo do bucket. Silencia erros (arquivo pode já não existir).
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const supabase = getClient();
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // não bloqueia a operação principal
  }
}

/**
 * Verifica se o Supabase está configurado.
 */
export function storageEnabled(): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
}
