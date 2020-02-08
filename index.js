/* global WebAssembly */

const fs = require('fs')
const path = require('path')

const ImageData = require('@canvas/image-data')

const TJPF_RGBA = 7

// Encoding parameters:
const TJSAMP_444 = 0
const TJ_DEFAULT_PITCH = 0
const ENCODE_QUALITY = 100

// We are using WASM32
const UINT_SIZE = 4

// No flags are used for encode/decode
const TJFLAGS = 0

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

const code = fs.readFileSync(path.join(__dirname, 'jpeg-turbo.wasm'))
const wasmModule = new WebAssembly.Module(code)
const instance = new WebAssembly.Instance(wasmModule, { env, wasi_unstable: stubs })

const WASM_MEMORY = () => instance.exports.memory.buffer

const readUint32 = offset => (new Uint32Array(WASM_MEMORY(), offset, 1))[0]
const writeUint32 = (offset, uint32) => { (new Uint32Array(WASM_MEMORY(), offset, 1))[0] = uint32 }

const malloc = size => instance.exports.malloc(size)
const free = pointer => instance.exports.free(pointer)

exports.decode = function (input) {
  // Allocate memory to hand over the input data to WASM
  const inputPointer = malloc(input.byteLength)
  if (inputPointer === 0) {
    throw new Error('Failed to allocate input buffer')
  }

  const targetView = new Uint8Array(WASM_MEMORY(), inputPointer, input.byteLength)
  // Copy input data into WASM readable memory
  targetView.set(input)

  // Allocate decompressor
  const decompressorPointer = instance.exports.tjInitDecompress()
  if (decompressorPointer === 0) {
    free(inputPointer)
    throw new Error('Failed to allocate decompressor')
  }

  // Allocate metadata (width, height, subsampling, and colorspace)
  const metadataPointer = malloc(UINT_SIZE * 4)

  // Decode input header
  const headerStatus = instance.exports.tjDecompressHeader3(
    decompressorPointer,
    inputPointer,
    input.byteLength,
    metadataPointer,
    metadataPointer + 4,
    metadataPointer + 8,
    metadataPointer + 12
  )

  // Guard return value for error
  if (headerStatus !== 0) {
    free(inputPointer)
    instance.exports.tjDestroy(decompressorPointer)
    free(metadataPointer)
    throw new Error('Failed to decode JPEG header')
  }

  // Read returned metadata
  const metadata = new Uint32Array(WASM_MEMORY(), metadataPointer, 4)
  const [width, height] = metadata

  // Free the metadata in WASM land
  free(metadataPointer)

  // Allocate output data
  const outputSize = (width * height * 4)
  const outputPointer = malloc(outputSize)

  /**
   * Decode input data
   * {@link http://jpeg-turbo.dpldocs.info/libjpeg.turbojpeg.tjDecompress2.html}
   */
  const dataStatus = instance.exports.tjDecompress2(
    decompressorPointer,
    inputPointer,
    input.byteLength,
    outputPointer,
    width,
    TJ_DEFAULT_PITCH,
    height,
    TJPF_RGBA,
    TJFLAGS
  )

  // Free the input data in WASM land
  free(inputPointer)

  // Destroy the decompressor
  instance.exports.tjDestroy(decompressorPointer)

  // Guard return value for error
  if (dataStatus !== 0) {
    free(outputPointer)
    throw new Error('Failed to decode JPEG data')
  }

  // Copy decoded data from WASM memory to JS
  const output = copyBufferFromWasm(outputPointer, outputSize)
  // Free WASM copy of decoded data
  free(outputPointer)

  // Return decoded image as raw data
  return new ImageData(output, width, height)
}

/**
 * Read WASM readable memory into buffer
 * @param {uint} bufferPointer
 * @param {uint} bufferSize
 */
function copyBufferFromWasm (bufferPointer, bufferSize) {
  const output = new Uint8ClampedArray(bufferSize)
  output.set(new Uint8Array(WASM_MEMORY(), bufferPointer, bufferSize))
  return output
}

/**
 * Allocate and Write a buffer to WASM
 * @param {Uint8Array} data
 * @return {uint} - pointer to buffer in WASM memory
 */
function copyInputBufferToWasm (data) {
  // Allocate memory to hand over the input data to WASM
  const pointer = malloc(data.byteLength)
  if (pointer === 0) {
    throw new Error('Failed to allocate input buffer')
  }

  const memorySlice = new Uint8Array(WASM_MEMORY(), pointer, data.byteLength)
  memorySlice.set(data)
  return pointer
}

exports.encode = function (imageData) {
  const { width, height, data } = imageData

  const inputPointer = copyInputBufferToWasm(data)

  // Allocate pointers to the output offset & size
  const outputAddressPointer = malloc(UINT_SIZE * 2)
  const outputSizePointer = outputAddressPointer + UINT_SIZE

  if (outputAddressPointer === 0) {
    free(inputPointer)
    throw new Error('Failed to allocate output offset & size pointers')
  }

  // Tell TJ to auto-allocate an output buffer.
  // The output address pointer will point to the buffer address after compression.
  writeUint32(outputAddressPointer, 0)

  // Allocate compressor
  const compressorPointer = instance.exports.tjInitCompress()
  if (compressorPointer === 0) {
    free(inputPointer)
    free(outputAddressPointer)
    throw new Error('Failed to allocate compressor')
  }

  /**
   * Encode input data
   * {@link http://jpeg-turbo.dpldocs.info/libjpeg.turbojpeg.tjCompress2.html}
   */
  const dataStatus = instance.exports.tjCompress2(
    compressorPointer,
    inputPointer,
    width,
    TJ_DEFAULT_PITCH,
    height,
    TJPF_RGBA,
    outputAddressPointer,
    outputSizePointer,
    TJSAMP_444,
    ENCODE_QUALITY,
    TJFLAGS
  )

  // Don't need input or compressor anymore:
  free(inputPointer)
  instance.exports.tjDestroy(compressorPointer)

  // Guard return value for error
  if (dataStatus !== 0) {
    free(outputAddressPointer)

    throw new Error('Failed to decode JPEG data')
  }

  const outputPointer = readUint32(outputAddressPointer)
  const outputSize = readUint32(outputSizePointer)
  free(outputAddressPointer)

  // Copy encoded data from WASM memory to JS
  const output = copyBufferFromWasm(outputPointer, outputSize)
  // Free WASM copy of encoded data
  instance.exports.tjFree(outputPointer)

  // Return encoded image as raw data
  return output
}
