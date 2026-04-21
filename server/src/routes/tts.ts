import { Router, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import https from 'https';

const router = Router();

const VOICE_MAP: Record<string, string> = {
  ayu:   'BeIxObt4dYBRJLYoe1hU',
  sara:  'INmScOFtmeMGA4p0XRr1',
  rajan: 'SrWU271vZiNf2mrBhzL5',
  chen:  '8xsdoepm9GrzPPzYsiLP',
  alex:  'NIkIuJZ8oQMuKZqwKtnm',
  maya:  'UcqZLa941Kkt8ZhEEybf',
};
const DEFAULT_VOICE = VOICE_MAP.ayu;
const MODEL_ID = 'eleven_multilingual_v2';
const MAX_CHARS = 3000;

// POST /api/tts  — proxies text to ElevenLabs and streams audio back
router.post('/', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return next(createError('TTS not configured', 503));

    const { text, avatarId } = req.body as { text?: string; avatarId?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return next(createError('text is required', 400));
    }

    const truncated = text.slice(0, MAX_CHARS);
    const voiceId = (avatarId && VOICE_MAP[avatarId]) ? VOICE_MAP[avatarId] : DEFAULT_VOICE;

    const payload = JSON.stringify({
      text: truncated,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}/stream`,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Accept: 'audio/mpeg',
      },
    };

    const elReq = https.request(options, (elRes) => {
      if (elRes.statusCode && elRes.statusCode >= 400) {
        return next(createError(`ElevenLabs error ${elRes.statusCode}`, 502));
      }
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Transfer-Encoding', 'chunked');
      elRes.pipe(res);
      elRes.on('error', next);
    });

    elReq.on('error', next);
    elReq.write(payload);
    elReq.end();
  } catch (err) {
    next(err);
  }
});

export default router;
