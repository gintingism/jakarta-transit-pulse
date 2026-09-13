export type FeedbackCategory =
  | 'GPS_NAVIGATION'
  | 'TRANSIT_ROUTE'
  | 'FEATURE_REQUEST'
  | 'UI_UX'
  | 'OTHER';

export interface FeedbackMetadata {
  userAgent?: string;
  screenResolution?: string;
  currentPath?: string;
  appVersion?: string;
  userLocation?: [number, number] | null;
}

export interface FeedbackPayload {
  category: FeedbackCategory;
  message: string;
  contact?: string;
  metadata?: FeedbackMetadata;
}

export interface ValidationSuccess {
  isValid: true;
  sanitized: FeedbackPayload;
}

export interface ValidationFailure {
  isValid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export const FEEDBACK_CATEGORIES: Record<
  FeedbackCategory,
  { label: string; colorHex: number }
> = {
  GPS_NAVIGATION: {
    label: 'Masalah Navigasi / GPS',
    colorHex: 0xef4444, // Red
  },
  TRANSIT_ROUTE: {
    label: 'Kesalahan Rute Transit',
    colorHex: 0xf97316, // Orange
  },
  FEATURE_REQUEST: {
    label: 'Saran Fitur Baru',
    colorHex: 0x10b981, // Emerald
  },
  UI_UX: {
    label: 'Desain / Tampilan (UI/UX)',
    colorHex: 0x0ea5e9, // Sky
  },
  OTHER: {
    label: 'Lainnya',
    colorHex: 0x8b5cf6, // Violet
  },
};

const VALID_CATEGORIES: FeedbackCategory[] = [
  'GPS_NAVIGATION',
  'TRANSIT_ROUTE',
  'FEATURE_REQUEST',
  'UI_UX',
  'OTHER',
];

export function isFeedbackCategory(val: unknown): val is FeedbackCategory {
  return typeof val === 'string' && VALID_CATEGORIES.includes(val as FeedbackCategory);
}

export function validateFeedbackPayload(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Payload harus berupa objek JSON.' };
  }

  const record = input as Record<string, unknown>;

  // Validate category
  if (!isFeedbackCategory(record.category)) {
    return {
      isValid: false,
      error: 'Kategori masukan tidak valid. Pilih salah satu kategori yang tersedia.',
    };
  }

  // Validate message
  if (typeof record.message !== 'string') {
    return {
      isValid: false,
      error: 'Pesan masukan harus berupa teks.',
    };
  }

  const trimmedMessage = record.message.trim();
  if (trimmedMessage.length < 5) {
    return {
      isValid: false,
      error: 'Pesan masukan terlalu singkat (minimal 5 karakter).',
    };
  }

  if (trimmedMessage.length > 2000) {
    return {
      isValid: false,
      error: 'Pesan masukan terlalu panjang (maksimal 2000 karakter).',
    };
  }

  // Validate optional contact
  let sanitizedContact: string | undefined;
  if (record.contact !== undefined && record.contact !== null) {
    if (typeof record.contact !== 'string') {
      return {
        isValid: false,
        error: 'Kontak harus berupa teks.',
      };
    }
    const trimmedContact = record.contact.trim();
    if (trimmedContact.length > 100) {
      return {
        isValid: false,
        error: 'Kontak tidak boleh lebih dari 100 karakter.',
      };
    }
    sanitizedContact = trimmedContact.length > 0 ? trimmedContact : undefined;
  }

  // Validate optional metadata
  let sanitizedMetadata: FeedbackMetadata | undefined;
  if (record.metadata && typeof record.metadata === 'object') {
    const meta = record.metadata as Record<string, unknown>;
    sanitizedMetadata = {};

    if (typeof meta.userAgent === 'string') {
      sanitizedMetadata.userAgent = meta.userAgent.slice(0, 300);
    }
    if (typeof meta.screenResolution === 'string') {
      sanitizedMetadata.screenResolution = meta.screenResolution.slice(0, 50);
    }
    if (typeof meta.currentPath === 'string') {
      sanitizedMetadata.currentPath = meta.currentPath.slice(0, 200);
    }
    if (typeof meta.appVersion === 'string') {
      sanitizedMetadata.appVersion = meta.appVersion.slice(0, 20);
    }
    if (
      Array.isArray(meta.userLocation) &&
      meta.userLocation.length === 2 &&
      typeof meta.userLocation[0] === 'number' &&
      typeof meta.userLocation[1] === 'number'
    ) {
      sanitizedMetadata.userLocation = [meta.userLocation[0], meta.userLocation[1]];
    }
  }

  return {
    isValid: true,
    sanitized: {
      category: record.category,
      message: trimmedMessage,
      contact: sanitizedContact,
      metadata: sanitizedMetadata,
    },
  };
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: DiscordEmbedField[];
  footer: { text: string };
  timestamp: string;
}

export interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

export function formatDiscordWebhookPayload(
  payload: FeedbackPayload,
  clientIp?: string
): DiscordWebhookPayload {
  const categoryInfo = FEEDBACK_CATEGORIES[payload.category];
  const fields: DiscordEmbedField[] = [
    {
      name: '🏷️ Kategori',
      value: categoryInfo.label,
      inline: true,
    },
    {
      name: '👤 Kontak / Pengirim',
      value: payload.contact || '*Anonim*',
      inline: true,
    },
  ];

  if (payload.metadata?.appVersion) {
    fields.push({
      name: '📦 Versi Aplikasi',
      value: payload.metadata.appVersion,
      inline: true,
    });
  }

  if (payload.metadata?.screenResolution) {
    fields.push({
      name: '📱 Layar',
      value: payload.metadata.screenResolution,
      inline: true,
    });
  }

  if (payload.metadata?.userAgent) {
    fields.push({
      name: '🌐 Browser / UA',
      value: payload.metadata.userAgent.slice(0, 100),
      inline: false,
    });
  }

  if (payload.metadata?.userLocation) {
    const [lat, lng] = payload.metadata.userLocation;
    fields.push({
      name: '📍 Koordinat GPS Terakhir',
      value: `[${lat.toFixed(5)}, ${lng.toFixed(5)}](https://www.google.com/maps?q=${lat},${lng})`,
      inline: false,
    });
  }

  if (clientIp) {
    fields.push({
      name: '🛡️ Client IP',
      value: clientIp,
      inline: true,
    });
  }

  return {
    embeds: [
      {
        title: `📬 Masukan Baru: ${categoryInfo.label}`,
        description: payload.message,
        color: categoryInfo.colorHex,
        fields,
        footer: {
          text: 'Jakarta Transit Pulse (AntiBablas) • Feedback Desk',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 60000, maxRequests = 3) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  public isAllowed(
    key: string,
    now: number = Date.now()
  ): { allowed: boolean; retryAfterSeconds: number } {
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      const oldest = validTimestamps[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((this.windowMs - (now - oldest)) / 1000)
      );
      return { allowed: false, retryAfterSeconds };
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  public reset(): void {
    this.requests.clear();
  }
}
