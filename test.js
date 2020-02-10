/* eslint-env mocha */

const assert = require('assert')

const pixelmatch = require('pixelmatch')

const jpegTurbo = require('./')

const { loadFixturePixels, loadJpegFixture, fixtures } = require('./fixtures')

describe('JPEG-Turbo', () => {
  for (const fixture of fixtures) {
    it(`decodes "${fixture}.jpg"`, async () => {
      const reference = await loadFixturePixels(fixture)

      const source = loadJpegFixture(fixture)
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
