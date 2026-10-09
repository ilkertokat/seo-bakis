/**
 * Yapılandırılmış veri (JSON-LD) ve hreflang kontrolleri. Saf fonksiyonlar: collect() sayfadan
 * ham metinleri ve <link rel="alternate" hreflang> değerlerini toplar, değerlendirme burada yapılır.
 */

/** JSON-LD düğümlerini (@graph ve diziler dahil) düzleştirir. */
const nodes = (data) => [].concat(data).flatMap((item) =>
  item && typeof item === "object" ? (Array.isArray(item["@graph"]) ? nodes(item["@graph"]) : [item]) : []);

/**
 * @param {string[]} blocks  <script type="application/ld+json"> içerikleri
 * @returns {{ types: string[], invalid: { index: number, error: string }[], noContext: number, noType: number }}
 */
export function parseJsonLd(blocks = []) {
  const types = [], invalid = [];
  let noContext = 0, noType = 0;
  blocks.forEach((text, index) => {
    let data;
    try { data = JSON.parse(text); } catch (e) {
      invalid.push({ index, error: String(e.message).slice(0, 80) });
      return;
    }
    for (const top of [].concat(data)) {
      if (top && typeof top === "object" && !top["@context"]) noContext++;
    }
    for (const node of nodes(data)) {
      if (node["@type"]) types.push([].concat(node["@type"]).join("/"));
      else noType++;
    }
  });
  return { types: [...new Set(types)], invalid, noContext, noType };
}

// ISO 639-1 dil (+ isteğe bağlı ISO 15924 yazı) + isteğe bağlı ISO 3166-1 bölge, ya da x-default
const HREFLANG = /^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$/i;

const sameUrl = (a, b) => {
  try {
    const u = new URL(a), v = new URL(b);
    return u.origin === v.origin && u.pathname.replace(/\/$/, "") === v.pathname.replace(/\/$/, "") && u.search === v.search;
  } catch { return false; }
};

/**
 * @param {{ lang: string, href: string }[]} alternates  ham hreflang ve href öznitelikleri
 * @param {string} pageUrl  sayfanın canonical adresi (yoksa kendi adresi)
 * @returns {{ level: "ok" | "warn" | "error", message: string }[]}  hreflang yoksa boş dizi
 */
export function checkHreflang(alternates = [], pageUrl = "") {
  if (!alternates.length) return [];
  const out = [];
  const bad = alternates.filter((a) => !HREFLANG.test(a.lang.trim()));
  if (bad.length) out.push({ level: "error", message: `Geçersiz hreflang kodu: ${bad.map((a) => a.lang || "(boş)").join(", ")}` });

  const seen = {}, dup = new Set();
  for (const a of alternates) {
    const key = a.lang.trim().toLowerCase();
    if (seen[key] && !sameUrl(seen[key], a.href)) dup.add(a.lang);
    seen[key] ||= a.href;
  }
  if (dup.size) out.push({ level: "error", message: `Aynı hreflang farklı adreslere gidiyor: ${[...dup].join(", ")}` });

  const relative = alternates.filter((a) => !/^https?:\/\//i.test(a.href.trim()));
  if (relative.length) out.push({ level: "warn", message: `${relative.length} hreflang bağlantısı mutlak adres değil` });
  if (pageUrl && !alternates.some((a) => sameUrl(a.href, pageUrl))) {
    out.push({ level: "warn", message: "hreflang listesinde sayfanın kendisi yok (kendine referans eksik)" });
  }
  if (!seen["x-default"]) out.push({ level: "warn", message: "hreflang x-default tanımlı değil" });

  if (!out.length) out.push({ level: "ok", message: `hreflang: ${alternates.length} dil sürümü (${alternates.map((a) => a.lang).join(", ")})` });
  return out;
}
