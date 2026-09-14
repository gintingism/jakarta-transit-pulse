import { describe, it, expect } from 'vitest';
import {
  validateFeedbackPayload,
  generateHumanVerificationToken,
  verifyHumanChallenge,
  formatDiscordWebhookPayload,
  SimpleRateLimiter,
  MIN_HUMAN_DELAY_MS,
  TOKEN_TTL_MS,
} from './feedbackValidation';

describe('Anti-Bot Human Verification Challenge', () => {
  it('generates a valid challenge token and verifies successfully with empty honeypot', () => {
    const baseTime = 1700000000000;
    const token = generateHumanVerificationToken(baseTime);

    // Verified 1 second after issue (human time)
    const result = verifyHumanChallenge(token, undefined, baseTime + 1000);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects immediately if honeypot trap field is filled by an automated bot', () => {
    const baseTime = 1700000000000;
    const token = generateHumanVerificationToken(baseTime);

    const result = verifyHumanChallenge(token, 'http://spam-link.ru', baseTime + 1000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('aktivitas bot otomatis');
  });

  it('rejects if token is missing or null', () => {
    expect(verifyHumanChallenge(null).isValid).toBe(false);
    expect(verifyHumanChallenge(undefined).isValid).toBe(false);
    expect(verifyHumanChallenge('').isValid).toBe(false);
  });

  it('rejects malformed token strings without timestamp separator', () => {
    const result = verifyHumanChallenge('invalidtokenwithoutdot');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Mohon selesaikan verifikasi');
  });

  it('rejects token if timestamp is not a number', () => {
    const result = verifyHumanChallenge('notanumber.fakehash');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Format waktu');
  });

  it('rejects tampered or forged hash signatures', () => {
    const baseTime = 1700000000000;
    const result = verifyHumanChallenge(`${baseTime}.tamperedhash123`, undefined, baseTime + 1000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('tidak sah atau telah dimodifikasi');
  });

  it('rejects submission if executed too fast (sub-human delay < 400ms)', () => {
    const baseTime = 1700000000000;
    const token = generateHumanVerificationToken(baseTime);

    // Submitted in 100ms (instant script bot)
    const result = verifyHumanChallenge(token, undefined, baseTime + (MIN_HUMAN_DELAY_MS - 200));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('terlalu cepat');
  });

  it('rejects expired verification tokens older than 30 minutes', () => {
    const baseTime = 1700000000000;
    const token = generateHumanVerificationToken(baseTime);

    // 31 minutes later
    const result = verifyHumanChallenge(token, undefined, baseTime + TOKEN_TTL_MS + 60000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('kadaluarsa');
  });
});

describe('Feedback Payload Validation', () => {
  const baseTime = 1700000000000;
  const validToken = generateHumanVerificationToken(baseTime);
  const humanCheckTime = baseTime + 1500;

  it('accepts valid payload with verified human token', () => {
    const input = {
      category: 'GPS_NAVIGATION',
      message: 'Lokasi stasiun Juanda sedikit melompat 20m ke arah barat.',
      contact: 'user@example.com',
      botToken: validToken,
      honeypot: '',
      metadata: {
        appVersion: 'v1.1.0',
        screenResolution: '390x844',
      },
    };

    const res = validateFeedbackPayload(input, humanCheckTime);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.sanitized.category).toBe('GPS_NAVIGATION');
      expect(res.sanitized.message).toBe(input.message);
      expect(res.sanitized.contact).toBe(input.contact);
      expect(res.sanitized.botToken).toBe(validToken);
    }
  });

  it('rejects payload if botToken is missing', () => {
    const input = {
      category: 'FEATURE_REQUEST',
      message: 'Tambahkan rute integrasi Mikrotrans JakLingko.',
    };

    const res = validateFeedbackPayload(input, humanCheckTime);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('Saya bukan robot');
    }
  });

  it('rejects payload if honeypot trap is filled by bot', () => {
    const input = {
      category: 'UI_UX',
      message: 'Tampilan font di HP terlalu kecil.',
      botToken: validToken,
      honeypot: 'filled_by_bot_crawler',
    };

    const res = validateFeedbackPayload(input, humanCheckTime);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('aktivitas bot otomatis');
    }
  });

  it('rejects payload if message is too short (< 5 chars)', () => {
    const input = {
      category: 'OTHER',
      message: 'Hi',
      botToken: validToken,
    };

    const res = validateFeedbackPayload(input, humanCheckTime);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('terlalu singkat');
    }
  });

  it('rejects invalid category', () => {
    const input = {
      category: 'INVALID_CATEGORY',
      message: 'Pesan masukan yang cukup panjang untuk dites.',
      botToken: validToken,
    };

    const res = validateFeedbackPayload(input, humanCheckTime);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('Kategori masukan tidak valid');
    }
  });

  it('formats Discord webhook payload embed correctly', () => {
    const payload = {
      category: 'TRANSIT_ROUTE' as const,
      message: 'Tarif KRL Manggarai ke Bogor terhitung keliru.',
      contact: '@transitfan',
      metadata: {
        appVersion: 'v1.1.0',
        screenResolution: '1920x1080',
        userLocation: [-6.2088, 106.8456] as [number, number],
      },
    };

    const discordPayload = formatDiscordWebhookPayload(payload, '192.168.1.1');
    expect(discordPayload.embeds).toHaveLength(1);
    const embed = discordPayload.embeds[0];
    expect(embed.title).toContain('Kesalahan Rute Transit');
    expect(embed.description).toBe(payload.message);

    const ipField = embed.fields.find((f) => f.name.includes('Client IP'));
    expect(ipField?.value).toBe('192.168.1.1');

    const coordsField = embed.fields.find((f) => f.name.includes('Koordinat GPS'));
    expect(coordsField?.value).toContain('-6.20880, 106.84560');
  });
});

describe('SimpleRateLimiter', () => {
  it('allows requests within window and limits excess requests', () => {
    const limiter = new SimpleRateLimiter(60000, 3);
    const t0 = 1000000;

    expect(limiter.isAllowed('user-1', t0).allowed).toBe(true);
    expect(limiter.isAllowed('user-1', t0 + 1000).allowed).toBe(true);
    expect(limiter.isAllowed('user-1', t0 + 2000).allowed).toBe(true);

    // 4th request within 60s should be denied
    const denied = limiter.isAllowed('user-1', t0 + 3000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);

    // After 61 seconds, request should be allowed again
    const allowedLater = limiter.isAllowed('user-1', t0 + 61000);
    expect(allowedLater.allowed).toBe(true);
  });
});
