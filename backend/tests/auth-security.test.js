import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { DataStore } from '../services/data-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DATA_DIR = path.join(__dirname, 'test-auth-data');
const AUTH_FILE = path.join(TEST_DATA_DIR, 'auth-config.json');
const LEGACY_SECRET = 'nav-site-secret-key-change-in-production';

describe('auth config hardening', () => {
  beforeEach(() => {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    delete process.env.NAV_JWT_SECRET;
    delete process.env.NAV_ADMIN_PASSWORD;
  });

  afterEach(() => {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    delete process.env.NAV_JWT_SECRET;
    delete process.env.NAV_ADMIN_PASSWORD;
  });

  it('creates a random signing secret and a token version on first run', () => {
    const store = new DataStore(TEST_DATA_DIR);
    const config = store.getAuthConfig();

    expect(config.jwtSecret).not.toBe(LEGACY_SECRET);
    expect(config.jwtSecret).toMatch(/^[0-9a-f]{64}$/);
    expect(config.tokenVersion).toBe(1);
    // 首次创建不再使用公开的默认密码
    expect(bcrypt.compareSync('admin123', config.password)).toBe(false);
  });

  it('rotates the published secret and default password of an existing config', () => {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        username: 'admin',
        password: bcrypt.hashSync('admin123', 4),
        jwtSecret: LEGACY_SECRET,
      }),
      'utf-8'
    );

    const store = new DataStore(TEST_DATA_DIR);
    const config = store.getAuthConfig();

    expect(config.jwtSecret).not.toBe(LEGACY_SECRET);
    expect(config.jwtSecret).toMatch(/^[0-9a-f]{64}$/);
    expect(bcrypt.compareSync('admin123', config.password)).toBe(false);
    expect(config.tokenVersion).toBe(1);
  });

  it('keeps a rotated secret across restarts', () => {
    const first = new DataStore(TEST_DATA_DIR).getAuthConfig();
    const second = new DataStore(TEST_DATA_DIR).getAuthConfig();

    expect(second.jwtSecret).toBe(first.jwtSecret);
    expect(second.tokenVersion).toBe(first.tokenVersion);
  });

  it('honours NAV_JWT_SECRET from the environment', () => {
    const secret = 'f'.repeat(64);
    process.env.NAV_JWT_SECRET = secret;

    const config = new DataStore(TEST_DATA_DIR).getAuthConfig();
    expect(config.jwtSecret).toBe(secret);
  });

  it('rejects a weak or legacy NAV_JWT_SECRET', () => {
    process.env.NAV_JWT_SECRET = 'too-short';
    expect(() => new DataStore(TEST_DATA_DIR)).toThrow(/NAV_JWT_SECRET/);

    process.env.NAV_JWT_SECRET = LEGACY_SECRET;
    expect(() => new DataStore(TEST_DATA_DIR)).toThrow(/NAV_JWT_SECRET/);
  });

  it('rejects a weak NAV_ADMIN_PASSWORD on first run', () => {
    process.env.NAV_ADMIN_PASSWORD = 'short';

    expect(() => new DataStore(TEST_DATA_DIR)).toThrow(/NAV_ADMIN_PASSWORD/);
  });

  it('accepts a strong NAV_ADMIN_PASSWORD on first run', () => {
    const password = 'correct-horse-battery';
    process.env.NAV_ADMIN_PASSWORD = password;

    const config = new DataStore(TEST_DATA_DIR).getAuthConfig();
    expect(bcrypt.compareSync(password, config.password)).toBe(true);
  });
});
