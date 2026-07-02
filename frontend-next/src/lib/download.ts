/**
 * Abre/baixa um arquivo cuja URL assinada é obtida de forma assíncrona,
 * de maneira robusta contra bloqueadores de pop-up.
 *
 * Problema: `const url = await getUrl(); window.open(url)` chama `window.open`
 * DEPOIS do await — fora do gesto de clique — e o navegador bloqueia como pop-up.
 *
 * Solução: abrir a aba de forma SÍNCRONA (ainda dentro do gesto), apontando para
 * uma página de espera, e só então redirecioná-la para a URL assinada quando ela
 * chega. Se o fetch da URL falhar, a aba é fechada e o erro é propagado para o
 * chamador exibir o aviso.
 */
export async function openSignedUrl(getUrl: () => Promise<string>): Promise<void> {
  const tab = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
  try {
    const url = await getUrl();
    if (tab && !tab.closed) {
      tab.location.href = url;
    } else {
      // Pop-up bloqueado mesmo síncrono (raro): tenta via âncora.
      triggerAnchor(url);
    }
  } catch (err) {
    if (tab && !tab.closed) tab.close();
    throw err;
  }
}

function triggerAnchor(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
