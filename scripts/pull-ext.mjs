// scripts/pull-ext.mjs
import fs from "node:fs";

const SRC = "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json";
const LANG = "id";
const LIMIT = 20;

const SLUG = process.env.GITHUB_REPOSITORY ?? "Qoirul25/Baca";
const BRANCH = "Repo";

const res = await fetch(SRC);
if (!res.ok) throw new Error("index.json gagal");
const raw = await res.json();

const all = raw.extensionList?.extensions ?? [];
const list = all.filter(e =>
  LANG === "all" || (e.sources ?? []).some(s => s.language === LANG)
);
const pick = LIMIT > 0 ? list.slice(0, LIMIT) : list;

fs.mkdirSync("dist/apk", { recursive: true });
fs.mkdirSync("dist/icon", { recursive: true });

const ok = [];

for (const e of pick) {
  const apkName = e.resources?.apkUrl?.split("/").pop();
  if (!apkName) { console.log("skip", e.name, "no apkUrl"); continue; }

  try {
    const apk = await fetch(e.resources.apkUrl);
    if (!apk.ok) throw new Error(`apk ${apk.status}`);
    fs.writeFileSync(`dist/apk/${apkName}`, Buffer.from(await apk.arrayBuffer()));

    const ico = await fetch(e.resources.iconUrl);
    if (ico.ok) fs.writeFileSync(`dist/icon/${e.packageName}.png`, Buffer.from(await ico.arrayBuffer()));

    ok.push({
      name: e.name,
      pkg: e.packageName,
      apk: apkName,
      lang: e.sources?.[0]?.language ?? "all",
      code: Number(e.versionCode),
      version: e.versionName,
      nsfw: e.contentWarning === "CONTENT_WARNING_NSFW" ? 1 : 0,
      sources: (e.sources ?? []).map(s => ({
        id: s.id, name: s.name, lang: s.language, baseUrl: s.homeUrl
      }))
    });
  } catch (err) {
    console.log("skip", e.packageName, err.message);
  }
}

if (!ok.length) throw new Error("tidak ada extension terdownload");

const out = {
  name: "Qoirul25 Private Mirror",
  description: "Snapshot mandiri",
  website: `https://github.com/${SLUG}`,
  baseUrl: `https://raw.githubusercontent.com/${SLUG}/${BRANCH}`,
  fingerprint: raw.signingKey ?? "",
  extensions: ok
};

fs.writeFileSync("dist/index.min.json", JSON.stringify(out));
console.log("total", ok.length);
