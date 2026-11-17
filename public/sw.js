// Service worker: deixa o app instalável e mostra páginas já visitadas quando a internet cai.
// Nunca guarda respostas da API nem de ações do servidor (POST).
const VERSAO = "v1";
const PAGINAS = `paginas-${VERSAO}`;
const ESTATICOS = `estaticos-${VERSAO}`;
const MAX_PAGINAS = 30;

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(ESTATICOS)
      .then((c) => c.add("/offline.html"))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes.filter((n) => n !== PAGINAS && n !== ESTATICOS).map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Ao sair da conta, apaga as páginas guardadas (o aparelho pode ser compartilhado).
self.addEventListener("message", (evento) => {
  if (evento.data === "limpar") evento.waitUntil(caches.delete(PAGINAS));
});

async function limitar(cache) {
  const chaves = await cache.keys();
  if (chaves.length > MAX_PAGINAS) await cache.delete(chaves[0]);
}

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  const mesmaOrigem = url.origin === self.location.origin;
  if (mesmaOrigem && (url.pathname.startsWith("/api/") || url.pathname === "/login")) return;

  // Páginas: rede primeiro; sem rede, a última versão visitada ou a tela de offline.
  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          if (resposta.ok && !resposta.redirected) {
            const copia = resposta.clone();
            caches.open(PAGINAS).then(async (c) => {
              await c.put(pedido, copia);
              await limitar(c);
            });
          }
          return resposta;
        })
        .catch(async () => {
          const guardada = await caches.match(pedido, { cacheName: PAGINAS });
          return guardada ?? (await caches.match("/offline.html")) ?? Response.error();
        }),
    );
    return;
  }

  // Arquivos estáticos (JS, CSS, fontes, imagens): guarda e atualiza em segundo plano.
  const estatico =
    (mesmaOrigem && (url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|ico|webmanifest)$/.test(url.pathname))) ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com";
  if (!estatico) return;

  evento.respondWith(
    caches.open(ESTATICOS).then(async (cache) => {
      const guardado = await cache.match(pedido);
      const rede = fetch(pedido)
        .then((resposta) => {
          if (resposta.ok || resposta.type === "opaque") cache.put(pedido, resposta.clone());
          return resposta;
        })
        .catch(() => guardado);
      return guardado ?? rede;
    }),
  );
});
