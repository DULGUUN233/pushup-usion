import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const server = await readFile(new URL('./index.js', import.meta.url), 'utf8')

test('loading artwork is project-local, preloaded, and served before the app fallback', () => {
  assert.match(html, /rel="preload" as="image" href="\.\/assets\/pushup-battle-splash-v2\.webp"/)
  assert.match(html, /class="bootArtwork" src="\.\/assets\/pushup-battle-splash-v2\.webp" width="941" height="1672"/)
  assert.match(html, /\.bootArtwork\{[^}]*object-fit:cover;object-position:center/s)
  assert.match(html, /\$\("boot"\)\.classList\.add\("bootDone"\);[\s\S]*?setTimeout\(resolve, 220\)/)

  const bootStart = html.indexOf('<section id="boot"')
  const bootMarkup = html.slice(bootStart, html.indexOf('</section>', bootStart))
  assert.doesNotMatch(bootMarkup, /modelProgressValue/)

  const assetsAt = server.indexOf("app.use('/assets', express.static")
  const fallbackAt = server.indexOf('app.use((_req, res) => {')
  assert.ok(assetsAt > 0 && assetsAt < fallbackAt)
  assert.match(server, /immutable: true,[\s\S]*?maxAge: '1y'/)
})
