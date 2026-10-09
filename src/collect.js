/**
 * Aktif sekmede çalıştırılır (chrome.scripting.executeScript). Kendi kendine yeterli olmalı:
 * dışarıdaki değişkenlere erişemez, yalnızca serileştirilebilir bir nesne döndürür.
 */
export function collect() {
  const meta = (sel) => document.querySelector(sel)?.getAttribute("content")?.trim() || "";
  const og = {};
  document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach((m) => {
    og[m.getAttribute("property") || m.getAttribute("name")] = m.getAttribute("content") || "";
  });
  // JSON-LD ham metin olarak toplanır; ayrıştırma ve hata tespiti structured.js'te yapılır
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 50)
    .map((s) => (s.textContent || "").slice(0, 100000));
  const hreflang = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].slice(0, 300)
    .map((l) => ({ lang: l.getAttribute("hreflang") || "", href: l.getAttribute("href") || "" }));
  const links = { internal: 0, external: 0, nofollow: 0 };
  document.querySelectorAll("a[href]").forEach((a) => {
    let url;
    try { url = new URL(a.getAttribute("href"), location.href); } catch { return; }
    if (!/^https?:$/.test(url.protocol)) return;
    url.host === location.host ? links.internal++ : links.external++;
    if (/nofollow/i.test(a.rel)) links.nofollow++;
  });
  const text = (document.body?.innerText || "").trim();
  return {
    url: location.href,
    https: location.protocol === "https:",
    title: document.title,
    description: meta('meta[name="description"]'),
    robots: meta('meta[name="robots"]'),
    viewport: meta('meta[name="viewport"]'),
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    lang: document.documentElement.lang || "",
    headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].slice(0, 200)
      .map((h) => ({ level: Number(h.tagName[1]), text: h.textContent.trim().slice(0, 120) })),
    images: [...document.images].slice(0, 500).map((img) => ({
      src: img.currentSrc || img.src, alt: img.getAttribute("alt"),
      width: img.getAttribute("width"), height: img.getAttribute("height"),
    })),
    og, jsonLd, hreflang, links,
    wordCount: text ? text.split(/\s+/).length : 0,
  };
}
