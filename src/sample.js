/** Testler ve demo modu (popup.html?demo) için örnek sayfa verisi. */
export const SAMPLE = {
  url: "https://ornekkafe.com/menu",
  https: true,
  title: "Menü — Örnek Kafe | Antakya'da Kahve ve Tatlı",
  description: "Örnek Kafe'nin güncel menüsü: Türk kahvesi, künefe, serpme kahvaltı ve ev yapımı tatlılar. Fiyatlar ve içerikler tek sayfada.",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1",
  canonical: "https://ornekkafe.com/menu",
  lang: "tr",
  headings: [
    { level: 1, text: "Menü" }, { level: 2, text: "Kahveler" }, { level: 3, text: "Türk kahvesi" },
    { level: 2, text: "Tatlılar" }, { level: 4, text: "Künefe" },
  ],
  images: [
    { src: "/kahve.webp", alt: "Türk kahvesi", width: "800", height: "600" },
    { src: "/kunefe.webp", alt: null, width: "800", height: "600" },
    { src: "/kahvalti.webp", alt: "Serpme kahvaltı", width: null, height: null },
  ],
  og: { "og:title": "Menü — Örnek Kafe", "og:description": "Güncel menü", "og:image": "https://ornekkafe.com/og.jpg" },
  jsonLd: [
    JSON.stringify({ "@context": "https://schema.org", "@graph": [
      { "@type": "Restaurant", name: "Örnek Kafe", servesCuisine: "Türk" },
      { "@type": "Menu", name: "Menü" },
    ] }),
  ],
  hreflang: [
    { lang: "tr", href: "https://ornekkafe.com/menu" },
    { lang: "en", href: "https://ornekkafe.com/en/menu" },
    { lang: "x-default", href: "https://ornekkafe.com/menu" },
  ],
  links: { internal: 14, external: 3, nofollow: 1 },
  wordCount: 640,
};
