const Benchmark = require('benchmark')

const initWasm = require('./lib/wasm.init')
const initCodec = require('./lib/codec')

const { loadFixturePixels, loadJpegFixture } = require('./fixtures')

const candidates = {
  untouched: 'jpeg-turbo.wasm',
  optimized: 'jpeg-turbo_opt.wasm'
}
const candidateNames = Object.keys(candidates)

const codecs = candidateNames.reduce(
  (acc, candidateName) => {
    acc[candidateName] = initCodec(initWasm(candidates[candidateName]))
    return acc
  },
  {}
)

function runDecodeSuite () {
  const jpegExample = loadJpegFixture('example')
  const jpegTest = loadJpegFixture('test')

  const testSuite = candidateNames.reduce(
    (benchSuite, candidateName) => {
      const codec = codecs[candidateName]
      return benchSuite.add(
        candidateName,
        () => {
          codec.decode(jpegExample)
          codec.decode(jpegTest)
        }
      )
    },
    new Benchmark.Suite()
  )

  console.log('DECODING SUITE')
  return testSuite
    .on('cycle', event => console.log(String(event.target)))
    .on('complete', () => console.log(`Fastest is ${testSuite.filter('fastest').map('name')}`))
    .run()
}

async function runEncodeSuite () {
  const rawExample = await loadFixturePixels('example')
  const rawTest = await loadFixturePixels('test')

  const testSuite = candidateNames.reduce(
    (benchSuite, candidateName) => {
      const codec = codecs[candidateName]

      return benchSuite.add(
        candidateName,
        () => {
          codec.encode(rawExample)
          codec.encode(rawTest)
        }
      )
    },
    new Benchmark.Suite()
  )

  console.log('ENCODING SUITE')
  return testSuite
    .on('cycle', event => { console.log(String(event.target)) })
    .on('complete', () => {
      console.log(`Fastest is ${testSuite.filter('fastest').map('name')}`)
    })
    .run()
}

runEncodeSuite().then(runDecodeSuite)
