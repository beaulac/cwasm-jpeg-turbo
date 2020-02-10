const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const fixturesDir = path.resolve(__dirname)

const loadFixturePixels = (fixtureName) => sharp(path.join(fixturesDir, `${fixtureName}_ref.png`))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info: { width, height } }) => ({ data, width, height }))

module.exports = {
  fixtures: ['example', 'test'],
  loadFixturePixels,
  loadJpegFixture: (fixtureName) => fs.readFileSync(path.join(fixturesDir, `${fixtureName}.jpg`))
}
