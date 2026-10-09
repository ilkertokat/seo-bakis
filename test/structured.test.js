import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "../src/analyze.js";
import { checkHreflang, parseJsonLd } from "../src/structured.js";
import { SAMPLE } from "../src/sample.js";

const ctx = "https://schema.org";

describe("parseJsonLd", () => {
  it("lists types from @graph, top-level arrays and multi-type nodes", () => {
    const r = parseJsonLd([
      JSON.stringify({ "@context": ctx, "@graph": [{ "@type": "Organization" }, { "@type": "WebSite" }] }),
      JSON.stringify([{ "@context": ctx, "@type": "BreadcrumbList" }, { "@context": ctx, "@type": ["Product", "Car"] }]),
      JSON.stringify({ "@context": ctx, "@type": "Organization" }),
    ]);
    assert.deepEqual(r.types, ["Organization", "WebSite", "BreadcrumbList", "Product/Car"]);
    assert.deepEqual(r.invalid, []);
    assert.equal(r.noContext + r.noType, 0);
  });

  it("reports broken JSON with its block number and keeps parsing the rest", () => {
    const r = parseJsonLd([
      JSON.stringify({ "@context": ctx, "@type": "Article" }),
      '{ "@context": "https://schema.org", "@type": "FAQPage", }',
    ]);
    assert.deepEqual(r.types, ["Article"]);
    assert.equal(r.invalid.length, 1);
    assert.equal(r.invalid[0].index, 1);
  });

  it("counts blocks without @context and nodes without @type", () => {
    const r = parseJsonLd([JSON.stringify({ "@type": "Event" }), JSON.stringify({ "@context": ctx, name: "x" })]);
    assert.equal(r.noContext, 1);
    assert.equal(r.noType, 1);
  });
});

describe("checkHreflang", () => {
  const page = "https://site.com/tr/";
  const good = [
    { lang: "tr", href: "https://site.com/tr/" },
    { lang: "en-GB", href: "https://site.com/en/" },
    { lang: "zh-Hant-TW", href: "https://site.com/zh/" },
    { lang: "x-default", href: "https://site.com/" },
  ];

  it("returns nothing for single-language pages", () => {
    assert.deepEqual(checkHreflang([], page), []);
  });

  it("accepts a complete, valid set", () => {
    const r = checkHreflang(good, "https://site.com/tr");
    assert.equal(r.length, 1);
    assert.equal(r[0].level, "ok");
    assert.match(r[0].message, /4 dil sürümü/);
  });

  it("flags invalid codes and conflicting duplicates as errors", () => {
    const r = checkHreflang([...good, { lang: "en_US", href: "https://site.com/us/" }, { lang: "uk", href: "https://site.com/uk/" },
      { lang: "EN-gb", href: "https://site.com/other/" }], page);
    const errors = r.filter((c) => c.level === "error").map((c) => c.message);
    assert.equal(errors.length, 2);
    assert.match(errors[0], /Geçersiz hreflang kodu: en_US$/);
    assert.match(errors[1], /farklı adreslere gidiyor: EN-gb/);
  });

  it("warns about relative URLs, missing self-reference and x-default", () => {
    const r = checkHreflang([{ lang: "en", href: "/en/" }, { lang: "de", href: "https://site.com/de/" }], page);
    const msgs = r.map((c) => c.message).join("\n");
    assert.ok(r.every((c) => c.level === "warn"));
    assert.match(msgs, /1 hreflang bağlantısı mutlak adres değil/);
    assert.match(msgs, /kendine referans eksik/);
    assert.match(msgs, /x-default/);
  });
});

describe("analyze with structured data", () => {
  const find = (r, text) => r.checks.find((c) => c.message.includes(text));

  it("turns broken JSON-LD into an error but still lists the valid types", () => {
    const r = analyze({ ...structuredClone(SAMPLE), jsonLd: [...SAMPLE.jsonLd, "{ broken"] });
    assert.equal(find(r, "bozuk")?.level, "error");
    assert.match(find(r, "bozuk").message, /^1 JSON-LD bloğu bozuk .*#2/);
    assert.equal(find(r, "Yapılandırılmış veri:").message, "Yapılandırılmış veri: Restaurant, Menu");
  });

  it("puts hreflang findings in their own group", () => {
    const r = analyze({ ...structuredClone(SAMPLE), hreflang: [{ lang: "tr", href: SAMPLE.canonical }] });
    assert.equal(find(r, "x-default")?.group, "Çok dillilik");
    assert.ok(!analyze({ ...structuredClone(SAMPLE), hreflang: [] }).checks.some((c) => c.group === "Çok dillilik"));
  });
});
