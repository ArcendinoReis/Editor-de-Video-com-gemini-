/**
 * Wraps raw PCM data in a WAVE header to make it playable by standard HTML5 Audio.
 * @param pcmData Raw PCM data (Int16Array usually, but Gemini returns Base64 float/int mix depending on decoding)
 * @param sampleRate Sample rate (usually 24000 for Gemini TTS)
 * @returns Blob representing a .wav file
 */
export function pcmToWav(pcmData: Int16Array, sampleRate: number = 24000): Blob {
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2; // 2 bytes per sample (16-bit)
    const blockAlign = numChannels * 2;
    const dataSize = pcmData.byteLength;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
  
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
  
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
  
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
  
    // Write PCM data
    const pcmBytes = new Uint8Array(pcmData.buffer);
    const dataBytes = new Uint8Array(buffer, 44);
    dataBytes.set(pcmBytes);
  
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  export function base64ToPCM(base64: string): Int16Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    // Gemini returns raw PCM bytes. If 16-bit, pair them up.
    // If using 'audio/pcm', it's usually little-endian 16-bit signed integer.
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }
  