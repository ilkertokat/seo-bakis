/**
 * Sayfadan toplanan veriyi değerlendirir. Saf fonksiyon: DOM'a ya da Chrome API'lerine dokunmaz,
 * bu yüzden Node'un test aracıyla doğrudan test edilir.
 *
 * @typedef {{ level: "ok" | "warn" | "error", group: string, message: string }} Check
 */

import { checkHreflang, parseJsonLd } from "./structured.js";

export const LIMITS = { titleMin: 30, titleMax: 60, descMin: 70, descMax: 160, minWords: 300 };

const len = (s) => [...(s || "").trim()].length; // Türkçe karakterler tek sayılsın

/** @returns {{ checks: Check[], score: number }} */
export function analyze(d) {
  /** @type {Check[]} */
  const checks = [];
  const add = (level, group, message) => checks.push({ level, group, message });

  // --- Başlık ve açıklama
  const t = len(d.title);
  if (!t) add("error", "Meta", "Sayfa başlığı (<title>) yok");
  else if (t < LIMITS.titleMin) add("warn", "Meta", `Başlık kısa: ${t} karakter (önerilen ${LIMITS.titleMin}–${LIMITS.titleMax})`);
  else if (t > LIMITS.titleMax) add("warn", "Meta", `Başlık uzun: ${t} karakter, arama sonuçlarında kesilebilir`);
  else add("ok", "Meta", `Başlık uzunluğu uygun (${t} karakter)`);

  const m = len(d.description);
  if (!m) add("error", "Meta", "Meta açıklama (description) yok");
  else if (m < LIMITS.descMin) add("warn", "Meta", `Meta açıklama kısa: ${m} karakter (önerilen ${LIMITS.descMin}–${LIMITS.descMax})`);
  else if (m > LIMITS.descMax) add("warn", "Meta", `Meta açıklama uzun: ${m} karakter`);
  else add("ok", "Meta", `Meta açıklama uygun (${m} karakter)`);

  if (!d.canonical) add("warn", "Meta", "Canonical bağlantısı yok");
  else add("ok", "Meta", "Canonical tanımlı");
  if (/noindex/i.test(d.robots || "")) add("error", "Meta", `Sayfa arama motorlarına kapalı (robots: ${d.robots})`);
  if (!d.lang) add("warn", "Meta", "<html lang> özniteliği yok");
  if (!d.viewport) add("error", "Mobil", "viewport meta etiketi yok: mobilde düzgün görünmez");

  // --- Başlık hiyerarşisi
  const h1s = d.headings.filter((h) => h.level === 1);
  if (h1s.length === 0) add("error", "İçerik", "H1 başlığı yok");
  else if (h1s.length > 1) add("warn", "İçerik", `${h1s.length} adet H1 var; tek H1 önerilir`);
  else add("ok", "İçerik", "Tek H1 başlığı var");
  const skips = [];
  for (let i = 1; i < d.headings.length; i++) {
    const prev = d.headings[i - 1].level, cur = d.headings[i].level;
    if (cur > prev + 1) skips.push(`H${prev} → H${cur}`);
  }
  if (skips.length) add("warn", "İçerik", `Başlık seviyesi atlanmış: ${[...new Set(skips)].join(", ")}`);

  if (d.wordCount < LIMITS.minWords) add("warn", "İçerik", `İçerik kısa: ${d.wordCount} kelime`);
  else add("ok", "İçerik", `${d.wordCount} kelime içerik`);

  // --- Görseller
  const noAlt = d.images.filter((i) => i.alt === null);
  if (noAlt.length) add("warn", "Erişilebilirlik", `${noAlt.length} görselde alt metni yok`);
  else if (d.images.length) add("ok", "Erişilebilirlik", `Tüm görsellerde (${d.images.length}) alt metni var`);
  const noSize = d.images.filter((i) => !i.width || !i.height);
  if (noSize.length) add("warn", "Performans", `${noSize.length} görselde width/height yok (düzen kayması riski)`);

  // --- Sosyal paylaşım
  const og = d.og || {};
  const missingOg = ["og:title", "og:description", "og:image"].filter((k) => !og[k]);
  if (missingOg.length) add("warn", "Sosyal", `Eksik Open Graph etiketi: ${missingOg.join(", ")}`);
  else add("ok", "Sosyal", "Open Graph etiketleri tam");

  // --- Yapılandırılmış veri
  const ld = parseJsonLd(d.jsonLd);
  if (ld.invalid.length) add("error", "Zengin sonuç", `${ld.invalid.length} JSON-LD bloğu bozuk (geçersiz JSON): ${ld.invalid
    .map((b) => `#${b.index + 1} ${b.error}`).join("; ")}`);
  if (ld.types.length) add("ok", "Zengin sonuç", `Yapılandırılmış veri: ${ld.types.join(", ")}`);
  else if (!ld.invalid.length) add("warn", "Zengin sonuç", "JSON-LD yapılandırılmış veri yok");
  if (ld.noContext) add("warn", "Zengin sonuç", `${ld.noContext} JSON-LD bloğunda @context yok`);
  if (ld.noType) add("warn", "Zengin sonuç", `${ld.noType} JSON-LD öğesinde @type yok`);

  // --- Çok dillilik
  for (const c of checkHreflang(d.hreflang, d.canonical || d.url)) add(c.level, "Çok dillilik", c.message);

  // --- Bağlantılar
  if (d.links.internal === 0) add("warn", "Bağlantılar", "Sayfada iç bağlantı yok");
  if (!d.https) add("error", "Güvenlik", "Sayfa HTTPS üzerinden sunulmuyor");

  const penalty = checks.reduce((p, c) => p + (c.level === "error" ? 15 : c.level === "warn" ? 5 : 0), 0);
  return { checks, score: Math.max(0, 100 - penalty) };
}

/** Puanı renk sınıfına çevirir. */
export const grade = (score) => (score >= 85 ? "good" : score >= 60 ? "fair" : "poor");
