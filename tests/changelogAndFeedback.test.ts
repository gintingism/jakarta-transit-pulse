import { describe, it, expect, beforeEach } from 'vitest';
import { APP_VERSION, CHANGELOG_ENTRIES } from '@/src/data/changelog';
import {
  validateFeedbackPayload,
  formatDiscordWebhookPayload,
  SimpleRateLimiter,
  FeedbackPayload,
} from '@/src/lib/feedbackValidation';

describe('Changelog Data Integrity', () => {
  it('should have a defined APP_VERSION matching semantic versioning format', () => {
    expect(APP_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(APP_VERSION).toBe('v1.1.0');
  });

  it('should have the latest changelog entry matching APP_VERSION', () => {
    expect(CHANGELOG_ENTRIES.length).toBeGreaterThan(0);
    expect(CHANGELOG_ENTRIES[0].version).toBe(APP_VERSION);
  });

  it('should contain only valid change types (feat, fix, perf) and non-empty text', () => {
    for (const entry of CHANGELOG_ENTRIES) {
      expect(entry.version).toBeTruthy();
      expect(entry.date).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.changes.length).toBeGreaterThan(0);

      for (const change of entry.changes) {
        expect(['feat', 'fix', 'perf']).toContain(change.type);
        expect(change.text.trim().length).toBeGreaterThan(5);
      }
    }
  });
});

describe('Feedback Payload Validation', () => {
  it('should successfully validate a well-formed payload', () => {
    const raw = {
      category: 'GPS_NAVIGATION',
      message: 'GPS akurasi melonjak saat melewati terowongan Manggarai.',
      contact: 'test@example.com',
      metadata: {
        userAgent: 'Mozilla/5.0 Test',
        screenResolution: '390x844',
        userLocation: [-6.2093, 106.8489],
        appVersion: 'v1.1.0',
      },
    };

    const res = validateFeedbackPayload(raw);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.sanitized.category).toBe('GPS_NAVIGATION');
      expect(res.sanitized.message).toBe(raw.message);
      expect(res.sanitized.contact).toBe('test@example.com');
      expect(res.sanitized.metadata?.screenResolution).toBe('390x844');
      expect(res.sanitized.metadata?.userLocation).toEqual([-6.2093, 106.8489]);
    }
  });

  it('should reject invalid category', () => {
    const raw = {
      category: 'INVALID_CATEGORY',
      message: 'Test valid message longer than five chars',
    };
    const res = validateFeedbackPayload(raw);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('Kategori masukan tidak valid');
    }
  });

  it('should reject message that is too short', () => {
    const raw = {
      category: 'FEATURE_REQUEST',
      message: 'Hi',
    };
    const res = validateFeedbackPayload(raw);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('terlalu singkat');
    }
  });

  it('should reject message that is too long (> 2000 chars)', () => {
    const raw = {
      category: 'UI_UX',
      message: 'A'.repeat(2001),
    };
    const res = validateFeedbackPayload(raw);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('terlalu panjang');
    }
  });

  it('should reject non-string or oversized contact', () => {
    const raw = {
      category: 'OTHER',
      message: 'Valid feedback message for test.',
      contact: 'A'.repeat(105),
    };
    const res = validateFeedbackPayload(raw);
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('Kontak tidak boleh lebih dari 100 karakter');
    }
  });

  it('should gracefully sanitize empty contact to undefined', () => {
    const raw = {
      category: 'TRANSIT_ROUTE',
      message: 'Ada rute yang keliru di koridor 1.',
      contact: '   ',
    };
    const res = validateFeedbackPayload(raw);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.sanitized.contact).toBeUndefined();
    }
  });
});

describe('Discord Webhook Embed Formatting', () => {
  it('should generate an embed with correct color, fields, and description', () => {
    const payload: FeedbackPayload = {
      category: 'FEATURE_REQUEST',
      message: 'Tolong tambahkan integrasi dengan Mikrotrans JakLingko.',
      contact: '@komuter_jkt',
      metadata: {
        appVersion: 'v1.1.0',
        screenResolution: '412x915',
        userLocation: [-6.1754, 106.8272],
      },
    };

    const webhookData = formatDiscordWebhookPayload(payload, '127.0.0.1');
    expect(webhookData.embeds.length).toBe(1);

    const embed = webhookData.embeds[0];
    expect(embed.title).toContain('Saran Fitur Baru');
    expect(embed.description).toBe(payload.message);
    expect(embed.color).toBe(0x10b981); // emerald

    const categoryField = embed.fields.find((f) => f.name.includes('Kategori'));
    expect(categoryField?.value).toBe('Saran Fitur Baru');

    const contactField = embed.fields.find((f) => f.name.includes('Kontak'));
    expect(contactField?.value).toBe('@komuter_jkt');

    const gpsField = embed.fields.find((f) => f.name.includes('Koordinat'));
    expect(gpsField?.value).toContain('google.com/maps');

    const ipField = embed.fields.find((f) => f.name.includes('Client IP'));
    expect(ipField?.value).toBe('127.0.0.1');
  });
});

describe('SimpleRateLimiter', () => {
  let limiter: SimpleRateLimiter;

  beforeEach(() => {
    limiter = new SimpleRateLimiter(60000, 3);
  });

  it('should allow up to maxRequests within the time window', () => {
    const ip = '192.168.1.10';
    const now = 100000;

    expect(limiter.isAllowed(ip, now).allowed).toBe(true);
    expect(limiter.isAllowed(ip, now + 1000).allowed).toBe(true);
    expect(limiter.isAllowed(ip, now + 2000).allowed).toBe(true);

    const fourth = limiter.isAllowed(ip, now + 3000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('should reset limit after the window expires', () => {
    const ip = '192.168.1.20';
    const now = 100000;

    limiter.isAllowed(ip, now);
    limiter.isAllowed(ip, now + 500);
    limiter.isAllowed(ip, now + 1000);

    // After 60 seconds (windowMs)
    const later = now + 61000;
    const allowedLater = limiter.isAllowed(ip, later);
    expect(allowedLater.allowed).toBe(true);
  });

  it('should isolate limits between different keys', () => {
    const now = 100000;
    limiter.isAllowed('ip-a', now);
    limiter.isAllowed('ip-a', now);
    limiter.isAllowed('ip-a', now);
    expect(limiter.isAllowed('ip-a', now).allowed).toBe(false);

    // ip-b should still be allowed
    expect(limiter.isAllowed('ip-b', now).allowed).toBe(true);
  });
});
