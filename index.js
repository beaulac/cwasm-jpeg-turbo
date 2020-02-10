const initWasm = require('./lib/wasm.init')
const initCodec = require('./lib/codec')

const wasmInstance = initWasm()

const { encode, decode } = initCodec(wasmInstance)

module.exports = { encode, decode }
