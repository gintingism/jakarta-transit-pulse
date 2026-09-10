import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/carto/[...tile]/route';

describe('CARTO Tile Proxy Route Handler', () => {
  const originalEnv = process.env.CARTO_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.CARTO_API_KEY = originalEnv;
  });

  it('returns 500 if CARTO_API_KEY is not configured', async () => {
    delete process.env.CARTO_API_KEY;

    const req = new NextRequest('http://localhost:3000/api/carto/rastertiles/dark_all/12/3264/2104.png');
    const res = await GET(req, { params: { tile: ['rastertiles', 'dark_all', '12', '3264', '2104.png'] } });

    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('CARTO_API_KEY is not configured');
  });

  it('returns 400 if tile params are missing or empty', async () => {
    process.env.CARTO_API_KEY = 'test_key';

    const req = new NextRequest('http://localhost:3000/api/carto');
    const res = await GET(req, { params: { tile: [] } });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('Missing tile path parameters');
  });

  it('returns 400 if tile path contains invalid characters or path traversal', async () => {
    process.env.CARTO_API_KEY = 'test_key';

    const req = new NextRequest('http://localhost:3000/api/carto/invalid');
    const res = await GET(req, { params: { tile: ['..', 'secret'] } });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('Invalid characters or path traversal');
  });

  it('proxies successful upstream response with 200 and image headers', async () => {
    process.env.CARTO_API_KEY = 'valid_key';

    const mockBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/png' }),
      arrayBuffer: () => Promise.resolve(mockBuffer),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:3000/api/carto/rastertiles/dark_all/12/3264/2104.png');
    const res = await GET(req, {
      params: { tile: ['rastertiles', 'dark_all', '12', '3264', '2104.png'] },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toContain('public, max-age=86400');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('.basemaps.cartocdn.com/rastertiles/dark_all/12/3264/2104.png?key=valid_key');
  });

  it('returns upstream error status when Carto API returns non-200', async () => {
    process.env.CARTO_API_KEY = 'invalid_key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:3000/api/carto/rastertiles/dark_all/12/3264/2104.png');
    const res = await GET(req, {
      params: { tile: ['rastertiles', 'dark_all', '12', '3264', '2104.png'] },
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('Carto tile server returned status 403');
  });

  it('returns 502 when upstream fetch throws network exception', async () => {
    process.env.CARTO_API_KEY = 'valid_key';

    const fetchMock = vi.fn().mockRejectedValue(new Error('Connection timed out'));
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:3000/api/carto/rastertiles/dark_all/12/3264/2104.png');
    const res = await GET(req, {
      params: { tile: ['rastertiles', 'dark_all', '12', '3264', '2104.png'] },
    });

    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('Connection timed out');
  });
});