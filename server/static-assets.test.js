import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const server = await readFile(new URL('./index.js', import.meta.url), 'utf8')

test('loading artwork is project-local, preloaded, and served before the app fallback', () => {
  assert.match(html, /rel="preload" as="image" href="\.\/assets\/figma\/splash-athlete\.svg"/)
  assert.match(html, /rel="preload" as="image" href="\.\/assets\/figma\/splash-title\.svg"/)
  assert.match(html, /class="bootAthlete" src="\.\/assets\/figma\/splash-athlete\.svg"/)
  assert.match(html, /class="bootGlow" src="\.\/assets\/figma\/splash-glow\.svg"/)
  assert.match(html, /class="bootLogo"[\s\S]*?splash-title\.svg[\s\S]*?splash-battle\.svg/)
  assert.match(html, /\$\("boot"\)\.classList\.add\("bootDone"\);[\s\S]*?setTimeout\(resolve, 220\)/)

  const bootStart = html.indexOf('<section id="boot"')
  const bootMarkup = html.slice(bootStart, html.indexOf('</section>', bootStart))
  assert.doesNotMatch(bootMarkup, /modelProgressValue/)

  const assetsAt = server.indexOf("app.use('/assets', express.static")
  const fallbackAt = server.indexOf('app.use((_req, res) => {')
  assert.ok(assetsAt > 0 && assetsAt < fallbackAt)
  assert.match(server, /immutable: true,[\s\S]*?maxAge: '1y'/)
})
