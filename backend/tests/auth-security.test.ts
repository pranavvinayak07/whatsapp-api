import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService, validatePasswordStrength } from '../src/services/auth-service.js';
import { sessionStore } from '../src/services/session-store.js';
import { loginRateLimiter, loginRateLimitMiddleware } from '../src/middleware/rate-limiter.js';
import { requireAuth, requireRoles } from '../src/middleware/auth-middleware.js';
import { db } from '../src/db.js';

function mockResponse() {
  const headers: Record<string, string> = {};
  return {
    code: 200,
    headers,
    status(code: number) {
      this.code = code;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value;
      return this;
    },
    body: null as any,
  };
}

test('Password strength validation enforces secure credentials', () => {
  assert.equal(validatePasswordStrength('Short1!').valid, false);
  assert.equal(validatePasswordStrength('lowercase1!').valid, false);
  assert.equal(validatePasswordStrength('UPPERCASE1!').valid, false);
  assert.equal(validatePasswordStrength('LettersOnlyHere').valid, false);
  assert.equal(validatePasswordStrength('Vivegaa@2026Admin').valid, true);
});

test('Session store creates, validates, rotates, and invalidates sessions', () => {
  const session1 = sessionStore.createSession({
    userId: 'user_1',
    email: 'admin@vivegaaerp.in',
    role: 'SUPER_ADMIN',
    name: 'Admin One',
  });

  assert.ok(session1.sessionId);
  assert.equal(session1.userId, 'user_1');

  // Validate active session
  const active = sessionStore.validateSession(session1.sessionId);
  assert.ok(active);
  assert.equal(active?.email, 'admin@vivegaaerp.in');

  // Rotate session (re-login or token refresh)
  const session2 = sessionStore.createSession({
    userId: 'user_1',
    email: 'admin@vivegaaerp.in',
    role: 'SUPER_ADMIN',
    name: 'Admin One',
    oldSessionId: session1.sessionId,
  });

  // Old session must now be invalidated
  assert.equal(sessionStore.validateSession(session1.sessionId), null);
  // New session must be valid
  assert.ok(sessionStore.validateSession(session2.sessionId));

  // Logout / invalidate session
  const destroyed = sessionStore.invalidateSession(session2.sessionId);
  assert.equal(destroyed, true);
  assert.equal(sessionStore.validateSession(session2.sessionId), null);
});

test('Login rate limiter enforces lockout after 5 failed attempts and resets on success', () => {
  const ip = '192.168.1.100';
  const req = { ip, socket: { remoteAddress: ip }, body: { email: 'target@vivegaaerp.in' } } as any;

  loginRateLimiter.recordSuccess(req);

  for (let i = 1; i <= 4; i++) {
    const info = loginRateLimiter.recordFailure(req);
    assert.equal(info.blocked, false);
    assert.equal(info.remaining, 5 - i);
  }

  const lockedInfo = loginRateLimiter.recordFailure(req);
  assert.equal(lockedInfo.blocked, true);
  assert.equal(lockedInfo.remaining, 0);

  const res = mockResponse();
  let passed = false;
  loginRateLimitMiddleware(req, res as any, () => { passed = true; });
  assert.equal(res.code, 429);
  assert.equal(passed, false);

  loginRateLimiter.recordSuccess(req);
  assert.equal(loginRateLimiter.check(req).blocked, false);
});

test('requireAuth middleware rejects unauthenticated requests with HTTP 401', async () => {
  const req = { cookies: {}, headers: {} } as any;
  const res = mockResponse();
  let passed = false;

  await requireAuth(req, res as any, () => { passed = true; });
  assert.equal(res.code, 401);
  assert.equal(passed, false);
  assert.match(res.body.error, /Authentication required/i);
});

test('requireAuth middleware accepts valid session and sets req.user', async () => {
  const session = sessionStore.createSession({
    userId: 'super_admin_1',
    email: 'super@vivegaaerp.in',
    role: 'SUPER_ADMIN',
    name: 'Super Administrator',
  });

  const token = AuthService.generateToken({
    sessionId: session.sessionId,
    userId: 'super_admin_1',
    email: 'super@vivegaaerp.in',
    role: 'SUPER_ADMIN',
    name: 'Super Administrator',
  });

  const req = { cookies: { token }, headers: {} } as any;
  const res = mockResponse();
  let passed = false;

  await requireAuth(req, res as any, () => { passed = true; });
  assert.equal(passed, true);
  assert.equal(req.user?.userId, 'super_admin_1');
  assert.equal(req.user?.role, 'SUPER_ADMIN');

  sessionStore.invalidateSession(session.sessionId);
  const reqAfterLogout = { cookies: { token }, headers: {} } as any;
  const resAfterLogout = mockResponse();
  let passedAfterLogout = false;

  await requireAuth(reqAfterLogout, resAfterLogout as any, () => { passedAfterLogout = true; });
  assert.equal(resAfterLogout.code, 401);
  assert.equal(passedAfterLogout, false);
});

test('requireRoles middleware enforces role-based access control', () => {
  const superAdminReq = { user: { role: 'SUPER_ADMIN' } } as any;
  const messagingStaffReq = { user: { role: 'MESSAGING_STAFF' } } as any;
  const viewerReq = { user: { role: 'VIEWER' } } as any;

  const roleGuard = requireRoles('SUPER_ADMIN', 'ADMIN');

  let passed = false;
  roleGuard(superAdminReq, mockResponse() as any, () => { passed = true; });
  assert.equal(passed, true);

  const resForbidden = mockResponse();
  let staffPassed = false;
  roleGuard(messagingStaffReq, resForbidden as any, () => { staffPassed = true; });
  assert.equal(resForbidden.code, 403);
  assert.equal(staffPassed, false);

  const resViewer = mockResponse();
  let viewerPassed = false;
  roleGuard(viewerReq, resViewer as any, () => { viewerPassed = true; });
  assert.equal(resViewer.code, 403);
  assert.equal(viewerPassed, false);
});

test('Bootstrap admin flow prevents duplicate super admins', async () => {
  const originalCount = db.user.count;
  try {
    db.user.count = (async () => 1) as any;
    await assert.rejects(
      async () => {
        await AuthService.bootstrapAdmin({
          email: 'admin2@vivegaaerp.in',
          password: 'Password@2026',
        });
      },
      /Forbidden/i
    );
  } finally {
    db.user.count = originalCount;
  }
});
