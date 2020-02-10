import ImageData = require('@canvas/image-data');

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
