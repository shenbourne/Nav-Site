import { describe, it, expect } from 'vitest';
import {
  isPublicAddress,
  resolveSafeUrl,
  detectImageType,
  createRateLimiter,
  validatePassword,
  signSessionToken,
  verifySessionToken,
} from '../services/security.js';
import jwt from 'jsonwebtoken';

describe('isPublicAddress', () => {
  it('rejects private, loopback and metadata ranges', () => {
    const blocked = [
      '127.0.0.1',
      '127.1.2.3',
      '10.0.0.1',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      '::',
      'fe80::1',
      'fd00::1',
      'fc00::1',
      'ff02::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::127.0.0.1',
      '64:ff9b::127.0.0.1',
      '64:ff9b:1::1',
      '2002:7f00:1::',
      '2001:db8::1',
      '192.88.99.1',
    ];

    for (const ip of blocked) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it('accepts public addresses', () => {
    expect(isPublicAddress('93.184.216.34')).toBe(true);
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
    expect(isPublicAddress('::ffff:8.8.8.8')).toBe(true);
    expect(isPublicAddress('64:ff9b::808:808')).toBe(true);
  });
});

describe('resolveSafeUrl', () => {
  it('rejects non-http protocols', async () => {
    await expect(resolveSafeUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(resolveSafeUrl('javascript:alert(1)')).rejects.toThrow();
    await expect(resolveSafeUrl('ftp://example.com')).rejects.toThrow();
  });

  it('rejects loopback, private and metadata targets in any notation', async () => {
    const blocked = [
      'http://127.0.0.1/',
      'http://127.0.0.1:8080/admin',
      'http://localhost/',
      'http://LOCALHOST./',
      'http://foo.localhost/',
      'http://10.1.2.3/',
      'http://192.168.0.1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[64:ff9b::127.0.0.1]/',
      'http://[2002:7f00:1::]/',
      'http://2130706433/',
      'http://0x7f000001/',
      'http://0177.0.0.1/',
      'http://user:pass@example.com/',
    ];

    for (const url of blocked) {
      await expect(resolveSafeUrl(url), url).rejects.toThrow();
    }
  });

  it('accepts a public IP target without DNS', async () => {
    const result = await resolveSafeUrl('http://93.184.216.34/');
    expect(result.url.hostname).toBe('93.184.216.34');
    expect(result.address).toBe('93.184.216.34');
  });
});

describe('validatePassword', () => {
  it('rejects weak values', () => {
    expect(validatePassword('short')).toMatch(/12/);
    expect(validatePassword('admin123')).toMatch(/常见/);
    expect(validatePassword('password123')).toMatch(/常见/);
    expect(validatePassword('aaaaaaaaaaaa', { username: 'aaaaaaaaaaaa' })).toMatch(/用户名/);
    expect(validatePassword(123456789012)).toMatch(/字符串/);
    expect(validatePassword(' ' + 'a'.repeat(14))).toMatch(/空格/);
  });

  it('accepts a strong passphrase', () => {
    expect(validatePassword('correct-horse-battery')).toBeNull();
  });
});

describe('session tokens', () => {
  const config = { username: 'admin', jwtSecret: 'a'.repeat(64), tokenVersion: 3 };

  it('accepts a token it issued', () => {
    const token = signSessionToken(config);
    expect(verifySessionToken(token, config).username).toBe('admin');
  });

  it('rejects tokens signed with the published legacy secret', () => {
    const forged = jwt.sign(
      { username: 'admin', tv: 3 },
      'nav-site-secret-key-change-in-production',
      { algorithm: 'HS256' }
    );
    expect(() => verifySessionToken(forged, config)).toThrow();
  });

  it('rejects tokens without a version or for another account', () => {
    const noVersion = jwt.sign({ username: 'admin' }, config.jwtSecret, { algorithm: 'HS256' });
    expect(() => verifySessionToken(noVersion, config)).toThrow(/版本/);

    const otherAccount = jwt.sign(
      { username: 'intruder', tv: 3 },
      config.jwtSecret,
      { algorithm: 'HS256' }
    );
    expect(() => verifySessionToken(otherAccount, config)).toThrow(/账号/);
  });

  it('rejects tokens issued before a credential change', () => {
    const token = signSessionToken(config);
    expect(() => verifySessionToken(token, { ...config, tokenVersion: 4 })).toThrow(/版本/);
  });

  it('rejects alg=none tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ username: 'admin', tv: 3 })).toString('base64url');
    expect(() => verifySessionToken(`${header}.${payload}.`, config)).toThrow();
  });
});

describe('detectImageType', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
  const gif = Buffer.from('GIF89a', 'ascii');
  const webp = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP', 'ascii'),
  ]);

  it('detects supported bitmap formats', () => {
    expect(detectImageType(png)).toEqual({ ext: 'png', mime: 'image/png' });
    expect(detectImageType(jpeg)).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    expect(detectImageType(gif)).toEqual({ ext: 'gif', mime: 'image/gif' });
    expect(detectImageType(webp)).toEqual({ ext: 'webp', mime: 'image/webp' });
  });

  it('rejects active content disguised as an image', () => {
    expect(detectImageType(Buffer.from('<svg onload="alert(1)"></svg>'))).toBeNull();
    expect(detectImageType(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe('createRateLimiter', () => {
  function run(limiter, req) {
    const res = {
      headers: {},
      statusCode: 200,
      body: null,
      set(name, value) {
        this.headers[name] = value;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    let nextCalled = false;
    limiter(req, res, () => {
      nextCalled = true;
    });
    return { nextCalled, res };
  }

  it('blocks repeated requests and can reset a successful key', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
    const req = { ip: '203.0.113.7' };

    expect(run(limiter, req).nextCalled).toBe(true);
    expect(run(limiter, req).nextCalled).toBe(true);

    const blocked = run(limiter, req);
    expect(blocked.nextCalled).toBe(false);
    expect(blocked.res.statusCode).toBe(429);
    expect(blocked.res.headers['Retry-After']).toBeTruthy();

    limiter.reset(req);
    expect(run(limiter, req).nextCalled).toBe(true);
  });
});
