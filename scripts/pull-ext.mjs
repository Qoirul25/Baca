// scripts/pull-ext.mjs
import fs from "node:fs";

const BASE = "https://raw.githubusercontent.com/keiyoushi/extensions/repo";
const LANG = "id";
const LIMIT = 20;

const SLUG = process.env.GITHUB_REPOSITORY ?? "Qoirul25/Baca";
const BRANCH = "Repo";
const NAG = [
  "eu.kanade.tachiyomi.extension.all.keiyoushi",
  "eu.kanade.tachiyomi.extension.all.mihon"
];

const [idxRes, assetsRes] = await Promise.all([
  fetch(`${BASE}/index.json`),
  fetch(`${BASE}/release-assets.json`)
]);
if (!idxRes.ok) throw new Error("index.json gagal");

const raw = await idxRes.json();
const src = Array.isArray(raw) ? { extensions: raw } : raw;
if (!src.extensions) console.log("keys:", Object.keys(raw));

const assets = assetsRes.ok ? await assetsRes.json() : {};

const list = (src.extensions ?? []).filter(e =>
  !NAG.includes(e.pkg) && (LANG === "all" || e.lang === LANG)
);
const pick = LIMIT > 0 ? list.slice(0, LIMIT) : list;

fs.mkdirSync("dist/apk", { recursive: true });
fs.mkdirSync("dist/icon", { recursive: true });

const apkUrl = e =>
  String(e.apk).startsWith("http") ? e.apk
  : assets[e.apk] ?? assets[e.pkg] ?? `${BASE}/apk/${e.apk}`;

const ok = [];

for (const e of pick) {
  try {
    const apk = await fetch(apkUrl(e));
    if (!apk.ok) throw new Error(`apk ${apk.status}`);
    fs.writeFileSync(`dist/apk/${e.apk}`, Buffer.from(await apk.arrayBuffer()));

    const ico = await fetch(`${BASE}/icon/${e.pkg}.png`);
    if (ico.ok) fs.writeFileSync(`dist/icon/${e.pkg}.png`, Buffer.from(await ico.arrayBuffer()));

    ok.push(e);
  } catch (err) {
    console.log("skip", e.pkg, err.message);
  }
}

if (!ok.length) throw new Error("tidak ada extension terdownload");

const out = {
  name: "Qoirul25 Private Mirror",
  description: "Snapshot mandiri",
  website: `https://github.com/${SLUG}`,
  baseUrl: `https://raw.githubusercontent.com/${SLUG}/${BRANCH}`,
  fingerprint: src.fingerprint ?? "",
  extensions: ok
};

fs.writeFileSync("dist/index.min.json", JSON.stringify(out));
console.log("total", ok.length);
