/**
 * @param source - The JPEG data
 * @returns Decoded width, height and pixel data
 */
export function decode(source: Uint8Array): ImageData

/**
 * @param imageData - The raw Image data
 * @returns JPEG data
 */
export function encode(imageData: ImageData): Uint8Array

/**
 * Copied from lib.dom definitions. For use in case TS does not include DOM in `libs`.
 */
interface ImageData {
  /**
   * Returns the one-dimensional array containing the data in RGBA order, as integers in the range 0 to 255.
   */
  readonly data: Uint8ClampedArray;
  /**
   * Returns the actual dimensions of the data in the ImageData object, in pixels.
   */
  readonly height: number;
  /**
   * Returns the actual dimensions of the data in the ImageData object, in pixels.
   */
  readonly width: number;
}
