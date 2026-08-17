import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const server = await readFile(new URL('./index.js', import.meta.url), 'utf8')

test('loading artwork is project-local, preloaded, and served before the app fallback', () => {
  assert.match(html, /rel="preload" as="image" href="\.\/assets\/pushup-battle-loading-v1\.webp"/)
  assert.match(html, /class="bootArtwork" src="\.\/assets\/pushup-battle-loading-v1\.webp"/)

  const assetsAt = server.indexOf("app.use('/assets', express.static")
  const fallbackAt = server.indexOf('app.use((_req, res) => {')
  assert.ok(assetsAt > 0 && assetsAt < fallbackAt)
  assert.match(server, /immutable: true,[\s\S]*?maxAge: '1y'/)
})
