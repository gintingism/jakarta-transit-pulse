import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: {
    tile?: string[];
  };
}

const CARTO_SUBDOMAINS = ['a', 'b', 'c', 'd'] as const;
const SAFE_SEGMENT_REGEX = /^[a-zA-Z0-9_@-]+(\.(png|jpg|jpeg|webp))?$/;

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const apiKey = process.env.CARTO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Server configuration error: CARTO_API_KEY is not configured on the server.',
      },
      { status: 500 }
    );
  }

  const { tile } = context.params;

  if (!tile || tile.length === 0) {
    return NextResponse.json(
      { error: 'Bad Request: Missing tile path parameters.' },
      { status: 400 }
    );
  }

  const isSafePath = tile.every(
    (segment) =>
      segment !== '..' &&
      segment !== '.' &&
      SAFE_SEGMENT_REGEX.test(segment)
  );

  if (!isSafePath) {
    return NextResponse.json(
      { error: 'Bad Request: Invalid characters or path traversal detected in tile parameters.' },
      { status: 400 }
    );
  }

  const upstreamPath = tile.join('/');
  const subdomainIndex = Math.floor(Math.random() * CARTO_SUBDOMAINS.length);
  const subdomain = CARTO_SUBDOMAINS[subdomainIndex];
  const targetUrl = `https://${subdomain}.basemaps.cartocdn.com/${upstreamPath}?key=${encodeURIComponent(apiKey)}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        Accept: 'image/webp,image/apng,image/png,image/*,*/*;q=0.8',
      },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: `Carto tile server returned status ${upstreamRes.status} (${upstreamRes.statusText})`,
        },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/png';
    const imageBuffer = await upstreamRes.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    return NextResponse.json(
      { error: `Failed to proxy Carto tile request: ${message}` },
      { status: 502 }
    );
  }
}