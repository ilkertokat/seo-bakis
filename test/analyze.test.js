import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze, grade } from "../src/analyze.js";
import { SAMPLE } from "../src/sample.js";

const base = () => structuredClone(SAMPLE);
const find = (r, text) => r.checks.find((c) => c.message.includes(text));

describe("analyze", () => {
  it("scores a well-built page highly", () => {
    const good = { ...base(), images: base().images.map((i) => ({ ...i, alt: i.alt ?? "görsel", width: "800", height: "600" })),
      headings: [{ level: 1, text: "A" }, { level: 2, text: "B" }, { level: 3, text: "C" }] };
    const r = analyze(good);
    assert.equal(r.checks.filter((c) => c.level !== "ok").length, 0, JSON.stringify(r.checks.filter((c) => c.level !== "ok")));
    assert.equal(r.score, 100);
    assert.equal(grade(r.score), "good");
  });

  it("counts Turkish characters correctly in the title length", () => {
    const r = analyze({ ...base(), title: "ğüşiöçĞÜŞİÖÇ ".repeat(3).trim() }); // 38 karakter
    assert.match(find(r, "Başlık").message, /38 karakter/);
  });

  it("flags missing basics as errors", () => {
    const r = analyze({ ...base(), title: "", description: "", viewport: "", https: false, headings: [], robots: "noindex, follow" });
    for (const text of ["başlığı (<title>) yok", "Meta açıklama (description) yok", "viewport", "HTTPS", "H1 başlığı yok", "kapalı"]) {
      assert.equal(find(r, text)?.level, "error", text);
    }
    assert.equal(grade(r.score), "poor");
  });

  it("detects heading level skips and multiple H1s", () => {
    const r = analyze({ ...base(), headings: [{ level: 1 }, { level: 3 }, { level: 1 }, { level: 2 }, { level: 5 }] });
    assert.match(find(r, "atlanmış").message, /H1 → H3, H2 → H5/);
    assert.match(find(r, "H1 var").message, /^2 adet/);
  });

  it("reports images without alt (empty alt is valid for decorative images)", () => {
    const r = analyze({ ...base(), images: [{ alt: null }, { alt: "" }, { alt: "logo", width: "1", height: "1" }] });
    assert.match(find(r, "alt metni yok").message, /^1 görselde/);
    assert.match(find(r, "width/height").message, /^2 görselde/);
  });

  it("lists missing Open Graph tags", () => {
    const r = analyze({ ...base(), og: { "og:title": "x" } });
    assert.match(find(r, "Open Graph").message, /og:description, og:image/);
  });
});
