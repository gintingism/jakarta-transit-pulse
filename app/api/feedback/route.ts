import { NextRequest, NextResponse } from 'next/server';
import {
  validateFeedbackPayload,
  formatDiscordWebhookPayload,
  SimpleRateLimiter,
} from '@/src/lib/feedbackValidation';

// In-memory rate limiter: maximum 3 submissions per minute per client IP
const feedbackLimiter = new SimpleRateLimiter(60000, 3);

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export async function POST(request: NextRequest): Promise<Response> {
  const clientIp = getClientIp(request);

  // Rate limiting check
  const rateLimitStatus = feedbackLimiter.isAllowed(clientIp);
  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak pengiriman masukan. Mohon tunggu ${rateLimitStatus.retryAfterSeconds} detik sebelum mencoba kembali.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitStatus.retryAfterSeconds),
        },
      }
    );
  }

  // Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format permintaan tidak valid. Data harus berformat JSON.' },
      { status: 400 }
    );
  }

  // Validate payload
  const validation = validateFeedbackPayload(rawBody);
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const sanitized = validation.sanitized;
  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL?.trim();

  // If webhook is not configured, log locally and return graceful response
  if (!webhookUrl) {
    console.info('[Feedback API - Local/Dev Mode]', {
      ip: clientIp,
      category: sanitized.category,
      message: sanitized.message,
      contact: sanitized.contact,
      metadata: sanitized.metadata,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Masukan Anda telah berhasil diterima dan dicatat.',
      },
      { status: 200 }
    );
  }

  // Send formatted Discord embed to Webhook
  try {
    const discordPayload = formatDiscordWebhookPayload(sanitized, clientIp);
    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!webhookRes.ok) {
      console.error(
        `[Feedback API] Discord webhook returned ${webhookRes.status}: ${webhookRes.statusText}`
      );
      return NextResponse.json(
        {
          error:
            'Gagal meneruskan masukan ke sistem pencatatan. Silakan coba beberapa saat lagi.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Terima kasih! Masukan Anda berhasil dikirim ke tim pengembang.',
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    console.error('[Feedback API] Network error calling webhook:', message);
    return NextResponse.json(
      {
        error: 'Terjadi gangguan jaringan saat mengirim masukan. Silakan periksa koneksi Anda.',
      },
      { status: 500 }
    );
  }
}
