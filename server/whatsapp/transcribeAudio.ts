import OpenAI, { toFile } from 'openai';

export class TranscribeAudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscribeAudioError';
  }
}

function extensionForMime(mimeType: string): string {
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';

  switch (base) {
    case 'audio/ogg':
      return 'ogg';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/mp4':
    case 'audio/aac':
      return 'm4a';
    case 'audio/amr':
      return 'amr';
    case 'audio/webm':
      return 'webm';
    default:
      return 'ogg';
  }
}

export async function transcribeAudio(
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new TranscribeAudioError('OpenAI API key is not configured.');
  }

  const openai = new OpenAI({ apiKey });
  const normalizedMime = mimeType.split(';')[0]?.trim() ?? 'audio/ogg';
  const ext = extensionForMime(normalizedMime);
  const file = await toFile(data, `voice.${ext}`, { type: normalizedMime });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });

  return transcription.text.trim();
}
