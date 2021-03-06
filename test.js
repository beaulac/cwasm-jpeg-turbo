/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const sharp = require('sharp')
const pixelmatch = require('pixelmatch')

const jpegTurbo = require('./')

const fixturesDir = path.resolve(__dirname, 'fixtures')
const fixtures = ['example', 'test']

const loadFixturePixels = (fixtureName) => sharp(path.join(fixturesDir, `${fixtureName}_ref.png`))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info: { width, height } }) => ({ data, width, height }))

describe('JPEG-Turbo', () => {
  for (const fixture of fixtures) {
    it(`decodes "${fixture}.jpg"`, async () => {
      const reference = await loadFixturePixels(fixture)

      const source = fs.readFileSync(`fixtures/${fixture}.jpg`)
      const result = jpegTurbo.decode(source)

      assert.strictEqual(result.width, reference.width)
      assert.strictEqual(result.height, reference.height)
      assert.deepStrictEqual(result.data, new Uint8ClampedArray(reference.data))
    })
  }

  for (const fixture of fixtures) {
    it(`encodes a valid JPEG from ${fixture}.png`, async () => {
      const reference = await loadFixturePixels(fixture)

      const encodedJpeg = jpegTurbo.encode(reference)
      const result = jpegTurbo.decode(encodedJpeg)

      assert.strictEqual(result.width, reference.width)
      assert.strictEqual(result.height, reference.height)

      const differenceCount = pixelmatch(
        result.data,
        reference.data,
        Buffer.alloc(result.data.byteLength),
        result.width,
        result.height
      )
      assert.strictEqual(differenceCount, 0)
    })
  }
})
