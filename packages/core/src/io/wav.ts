/**
 * Zero-dependency RIFF/WAVE Audio Decoder.
 * Decodes 8-bit, 16-bit, 24-bit integer PCM and 32-bit float PCM into normalized Float32Array.
 */

export interface DecodedAudio {
  audioData: Float32Array;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  durationSec: number;
}

export function decodeWav(buffer: ArrayBuffer | Uint8Array): DecodedAudio {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // 1. Verify RIFF Header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error('Format audio tidak valid: Header WAV/RIFF tidak ditemukan.');
  }

  // 2. Parse Sub-chunks
  let offset = 12;
  let audioFormat = 1; // 1 = PCM, 3 = IEEE Float
  let channels = 1;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(offset + 8, true);
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
  }

  if (dataOffset === -1) {
    throw new Error('Chunk "data" tidak ditemukan dalam file WAV.');
  }

  // 3. Decode Samples to Normalized Mono Float32Array
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.floor(dataSize / bytesPerSample);
  const totalFrames = Math.floor(totalSamples / channels);
  const monoData = new Float32Array(totalFrames);

  let readIdx = dataOffset;

  for (let frame = 0; frame < totalFrames; frame++) {
    let frameSum = 0;

    for (let ch = 0; ch < channels; ch++) {
      let sampleVal = 0;

      if (bitsPerSample === 16) {
        sampleVal = view.getInt16(readIdx, true) / 32768.0;
        readIdx += 2;
      } else if (bitsPerSample === 24) {
        // Read 3 bytes signed little-endian
        const b0 = view.getUint8(readIdx);
        const b1 = view.getUint8(readIdx + 1);
        const b2 = view.getUint8(readIdx + 2);
        let val = (b2 << 16) | (b1 << 8) | b0;
        if (val & 0x800000) val |= ~0xffffff; // Sign extend
        sampleVal = val / 8388608.0;
        readIdx += 3;
      } else if (bitsPerSample === 32) {
        if (audioFormat === 3) {
          sampleVal = view.getFloat32(readIdx, true);
        } else {
          sampleVal = view.getInt32(readIdx, true) / 2147483648.0;
        }
        readIdx += 4;
      } else if (bitsPerSample === 8) {
        sampleVal = (view.getUint8(readIdx) - 128) / 128.0;
        readIdx += 1;
      }

      frameSum += sampleVal;
    }

    monoData[frame] = frameSum / channels;
  }

  const durationSec = Math.round((totalFrames / sampleRate) * 100) / 100;

  return {
    audioData: monoData,
    sampleRate,
    channels,
    bitsPerSample,
    durationSec,
  };
}

/**
 * Creates a valid RIFF/WAVE ArrayBuffer from Float32Array (useful for encoding audio or tests).
 */
export function encodeWav(
  samples: Float32Array | number[],
  sampleRate = 44100
): Uint8Array {
  const numSamples = samples.length;
  const buffer = new Uint8Array(44 + numSamples * 2);
  const view = new DataView(buffer.buffer);

  // RIFF identifier
  buffer.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  buffer.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt chunk
  buffer.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true);             // chunk size = 16
  view.setUint16(20, 1, true);              // PCM format = 1
  view.setUint16(22, 1, true);              // mono = 1 channel
  view.setUint32(24, sampleRate, true);     // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * 1 * 2)
  view.setUint16(32, 2, true);              // block align
  view.setUint16(34, 16, true);             // 16 bits per sample

  // data chunk
  buffer.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, numSamples * 2, true);

  // Write PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return buffer;
}

