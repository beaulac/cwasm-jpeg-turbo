/* global WebAssembly */

const fs = require('fs')
const path = require('path')

const env = {
  setjmp () { return 0 },
  longjmp () { throw new Error('Not implemented') }
}

const stubs = {
  proc_exit () { throw new Error('Syscall proc_exit not implemented') },
  fd_close () { throw new Error('Syscall fd_close not implemented') },
  fd_seek () { throw new Error('Syscall fd_seek not implemented') },
  fd_write () { throw new Error('Syscall fd_write not implemented') }
}

function wasmInit (wasmFile = 'jpeg-turbo.wasm') {
  const code = fs.readFileSync(path.join(__dirname, '..', wasmFile))
  const wasmModule = new WebAssembly.Module(code)

  const instance = new WebAssembly.Instance(wasmModule, { env, wasi_unstable: stubs })

  const WASM_MEMORY = () => instance.exports.memory.buffer
  const wasmSlice = (offset, size, ViewCtor = Uint8Array) => new ViewCtor(WASM_MEMORY(), offset, size)

  const malloc = (size) => instance.exports.malloc(size)
  const free = (pointer) => instance.exports.free(pointer)

  const readWasmUint32 = (offset) => (new Uint32Array(WASM_MEMORY(), offset, 1))[0]
  const writeWasmUint32 = (offset, uint) => { (new Uint32Array(WASM_MEMORY(), offset, 1))[0] = uint }

  return {
    WASM_MEMORY,
    instance,
    wasmSlice,
    malloc,
    free,
    readWasmUint32,
    writeWasmUint32
  }
}

module.exports = wasmInit
