import { analyze, grade } from "./src/analyze.js";
import { collect } from "./src/collect.js";
import { SAMPLE } from "./src/sample.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ICON = { ok: "✓", warn: "!", error: "✕" };
const ORDER = { error: 0, warn: 1, ok: 2 };

async function getData() {
  // popup.html?demo → örnek veriyle çalışır (ekran görüntüsü ve geliştirme için)
  if (new URLSearchParams(location.search).has("demo") || typeof chrome === "undefined" || !chrome.scripting) return SAMPLE;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || "")) throw new Error("Bu eklenti yalnızca web sayfalarında çalışır.");
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collect });
  return result;
}

function render(d) {
  const { checks, score } = analyze(d);
  $("score").classList.add(grade(score));
  $("scoreNum").textContent = score;
  $("url").textContent = d.url;
  const n = (l) => checks.filter((c) => c.level === l).length;
  $("counts").innerHTML = `<span class="e">${n("error")} hata</span><span class="w">${n("warn")} uyarı</span><span class="o">${n("ok")} uygun</span>`;

  const u = new URL(d.url);
  $("serp").hidden = false;
  $("serpUrl").textContent = `${u.host}${u.pathname === "/" ? "" : " › " + u.pathname.split("/").filter(Boolean).join(" › ")}`;
  $("serpTitle").textContent = [...(d.title || "(başlık yok)")].slice(0, 60).join("") + ([...(d.title || "")].length > 60 ? "…" : "");
  $("serpDesc").textContent = [...(d.description || "Açıklama yok; Google sayfadan bir parça seçer.")].slice(0, 160).join("");

  const groups = {};
  for (const c of [...checks].sort((a, b) => ORDER[a.level] - ORDER[b.level])) (groups[c.group] ||= []).push(c);
  $("checks").innerHTML = Object.entries(groups).map(([g, list]) => `<section class="group"><h2>${esc(g)}</h2>${list
    .map((c) => `<div class="check ${c.level}"><i>${ICON[c.level]}</i><span>${esc(c.message)}</span></div>`).join("")}</section>`).join("");

  $("heads").innerHTML = d.headings.map((h) => `<li style="padding-left:${(h.level - 1) * 12}px"><b>H${h.level}</b>${esc(h.text)}</li>`).join("")
    || "<li>Başlık yok</li>";
  $("foot").textContent = `${d.images.length} görsel · ${d.links.internal} iç, ${d.links.external} dış bağlantı · ${d.wordCount} kelime`;
}

getData().then(render).catch((e) => { document.body.innerHTML = `<p class="err">${esc(e.message)}</p>`; });
