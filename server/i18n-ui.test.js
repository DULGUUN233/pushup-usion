import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8")
const source = fs.readFileSync(new URL("../assets/i18n-v1.js", import.meta.url), "utf8")
const context = { window:{} }
vm.runInNewContext(source, context)
const { STR, normalizeLanguage, createI18n } = context.window.PushupI18n

test("mn ба en орчуулгын түлхүүрүүд бүрэн таарна", () => {
  assert.deepEqual(Object.keys(STR.en).sort(), Object.keys(STR.mn).sort())
})

test("Usion хэлний бүсийн дагаврыг зөв normalize хийнэ", () => {
  assert.equal(normalizeLanguage("mn-MN"), "mn")
  assert.equal(normalizeLanguage("en-US"), "en")
  assert.equal(normalizeLanguage("ja-JP"), "en")
})

test("t() текст, formatter function болон fallback-ийг хоёр хэлээр өгнө", () => {
  const i18n = createI18n("en-US")
  assert.equal(i18n.t("navHome"), "Home")
  assert.equal(i18n.t("activityDailyGoal", "20"), "Goal 20")
  assert.equal(i18n.t("missingKey"), "missingKey")
  i18n.setLanguage("mn-MN")
  assert.equal(i18n.t("navHome"), "Нүүр")
  assert.equal(i18n.t("activityDailyGoal", "20"), "20 зорилго")
})

test("static DOM-ийн i18n key бүр mn/en catalog-д байна", () => {
  const keys = [...html.matchAll(/data-i18n(?:-html|-aria-label|-placeholder|-alt)?="([A-Za-z0-9]+)"/g)]
    .map(match => match[1])
  assert.ok(keys.length > 90)
  for(const key of keys){
    assert.ok(key in STR.mn, `missing mn key: ${key}`)
    assert.ok(key in STR.en, `missing en key: ${key}`)
  }
})

test("runtime t() literal key бүр catalog-д байна", () => {
  const keys = [...html.matchAll(/(?<![A-Za-z0-9_$])t\(\s*"([A-Za-z0-9]+)"/g)]
    .map(match => match[1])
  for(const key of keys){
    assert.ok(key in STR.mn, `missing mn key: ${key}`)
    assert.ok(key in STR.en, `missing en key: ${key}`)
  }
})

test("browser fallback болон Usion init-ийн дараах хэл хоёул apply хийгдэнэ", () => {
  assert.match(html, /applyLang\(detectLang\(\)\);/)
  assert.match(html, /launchCfg = await usionInit\(\);[\s\S]*detectLang\(launchCfg\)/)
  assert.match(html, /config\?\.language \|\| sdk\(\)\?\.getLanguage\?\.\(\)/)
  assert.match(html, /document\.documentElement\.lang = lang/)
  assert.match(html, /new Intl\.NumberFormat\(locale\)/)
})

test("i18n asset cache-bust version-тэй ачаалж шинэ Squat Game текстийг авна", () => {
  assert.match(html, /<script src="\.\/assets\/i18n-v1\.js\?v=2"><\/script>/)
})
