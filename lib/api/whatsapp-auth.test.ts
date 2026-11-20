/**
 * WhatsApp integration & authentication API client unit tests
 */

import assert from 'node:assert';
import {
  loginPassword,
  requestWhatsAppOtp,
  verifyWhatsAppOtp,
  forgotPassword,
  verifyRecoveryOtp,
  resetPassword,
} from './auth.api';
import {
  getWhatsAppStatus,
  sendWhatsAppTestMessage,
  getWhatsAppSettings,
  updateWhatsAppSettings,
} from './whatsapp.api';
import apiClient from './client';

let passed = 0;
const tests: { name: string; fn: () => Promise<void> }[] = [];

function test(name: string, fn: () => Promise<void>) {
  tests.push({ name, fn });
}

test('loginPassword calls /auth/login with mobileNumber and password', async () => {
  const origPost = apiClient.post;
  let capturedUrl = '';
  let capturedBody: any = null;

  (apiClient as any).post = async (url: string, body: any) => {
    capturedUrl = url;
    capturedBody = body;
    return {
      data: {
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        user: { id: 'user-1', name: 'Test User', phone: '+919876543210' },
      },
    };
  };

  try {
    const res = await loginPassword({
      mobileNumber: '+919876543210',
      password: 'SecretPass123!',
    });
    assert.strictEqual(capturedUrl, '/auth/login');
    assert.strictEqual(capturedBody.mobileNumber, '+919876543210');
    assert.strictEqual(capturedBody.password, 'SecretPass123!');
    assert.strictEqual(res.accessToken, 'access-123');
  } finally {
    apiClient.post = origPost;
  }
});

test('requestWhatsAppOtp posts to /auth/whatsapp/request-otp', async () => {
  const origPost = apiClient.post;
  let capturedUrl = '';
  let capturedBody: any = null;

  (apiClient as any).post = async (url: string, body: any) => {
    capturedUrl = url;
    capturedBody = body;
    return { data: { success: true, message: 'OTP sent' } };
  };

  try {
    const res = await requestWhatsAppOtp({ mobileNumber: '+919876543210' });
    assert.strictEqual(capturedUrl, '/auth/whatsapp/request-otp');
    assert.strictEqual(capturedBody.mobileNumber, '+919876543210');
    assert.strictEqual(res.success, true);
  } finally {
    apiClient.post = origPost;
  }
});

test('verifyWhatsAppOtp validates OTP at /auth/whatsapp/verify-otp', async () => {
  const origPost = apiClient.post;
  let capturedUrl = '';
  let capturedBody: any = null;

  (apiClient as any).post = async (url: string, body: any) => {
    capturedUrl = url;
    capturedBody = body;
    return {
      data: {
        accessToken: 'jwt-token',
        user: { id: 'u1' },
      },
    };
  };

  try {
    const res = await verifyWhatsAppOtp({
      mobileNumber: '+919876543210',
      otp: '123456',
    });
    assert.strictEqual(capturedUrl, '/auth/whatsapp/verify-otp');
    assert.strictEqual(capturedBody.mobileNumber, '+919876543210');
    assert.strictEqual(capturedBody.otp, '123456');
    assert.strictEqual(res.accessToken, 'jwt-token');
  } finally {
    apiClient.post = origPost;
  }
});

test('forgotPassword calls /auth/forgot-password with normalized mobileNumber', async () => {
  const origPost = apiClient.post;
  let capturedUrl = '';
  let capturedBody: any = null;

  (apiClient as any).post = async (url: string, body: any) => {
    capturedUrl = url;
    capturedBody = body;
    return { data: { success: true, message: 'Recovery code dispatched' } };
  };

  try {
    const res = await forgotPassword({ mobileNumber: '+919876543210' });
    assert.strictEqual(capturedUrl, '/auth/forgot-password');
    assert.strictEqual(capturedBody.mobileNumber, '+919876543210');
    assert.strictEqual(res.success, true);
  } finally {
    apiClient.post = origPost;
  }
});

test('verifyRecoveryOtp calls /auth/verify-recovery-otp and returns recoveryToken', async () => {
  const origPost = apiClient.post;
  let capturedUrl = '';
  let capturedBody: any = null;

  (apiClient as any).post = async (url: string, body: any) => {
    capturedUrl = url;
    capturedBody = body;
    return { data: { success: true, recoveryToken: 'token-abc-123', expiresIn: 900 } };
  };

  try {
    const res = await verifyRecoveryOtp({
      mobileNumber: '+919876543210',
      otp: '654321',
    });
    assert.strictEqual(capturedUrl, '/auth/verify-recovery-otp');
    assert.strictEqual(capturedBody.mobileNumber, '+919876543210');
    assert.strictEqual(capturedBody.otp, '654321');
    assert.strictEqual(res.recoveryToken, 'token-abc-123');
  } finally {
    apiClient.post = origPost;
  }
});

test('resetPassword sends recoveryToken and newPassword to /auth/reset-password', async () => {
  const origPost = apiClient.post;
  let capturedUrl = '';
  let capturedBody: any = null;

  (apiClient as any).post = async (url: string, body: any) => {
    capturedUrl = url;
    capturedBody = body;
    return { data: { success: true, message: 'Password updated' } };
  };

  try {
    const res = await resetPassword({
      recoveryToken: 'token-abc-123',
      newPassword: 'BrandNewPass999!',
    });
    assert.strictEqual(capturedUrl, '/auth/reset-password');
    assert.strictEqual(capturedBody.recoveryToken, 'token-abc-123');
    assert.strictEqual(capturedBody.newPassword, 'BrandNewPass999!');
    assert.strictEqual(res.success, true);
  } finally {
    apiClient.post = origPost;
  }
});

test('getWhatsAppStatus gets /admin/whatsapp/status', async () => {
  const origGet = apiClient.get;
  let capturedUrl = '';

  (apiClient as any).get = async (url: string) => {
    capturedUrl = url;
    return {
      data: {
        success: true,
        data: {
          status: 'WORKING',
          provider: 'waha',
          sessionName: 'default',
          accountInfo: { id: '917008845326@c.us', pushName: 'Society Admin' },
          lastChecked: '2026-10-13T00:00:00Z',
        },
      },
    };
  };

  try {
    const res = await getWhatsAppStatus();
    assert.strictEqual(capturedUrl, '/admin/whatsapp/status');
    assert.strictEqual(res.status, 'WORKING');
    assert.strictEqual(res.provider, 'waha');
  } finally {
    apiClient.get = origGet;
  }
});

test('sendWhatsAppTestMessage dispatches test message payload', async () => {
  const origPost = apiClient.post;
  let capturedUrl = '';
  let capturedBody: any = null;

  (apiClient as any).post = async (url: string, body: any) => {
    capturedUrl = url;
    capturedBody = body;
    return {
      data: {
        success: true,
        data: { success: true, messageId: 'msg-999' },
      },
    };
  };

  try {
    const res = await sendWhatsAppTestMessage('9876543210');
    assert.strictEqual(capturedUrl, '/admin/whatsapp/test-message');
    assert.strictEqual(capturedBody.recipientNumber, '9876543210');
    assert.strictEqual(res.success, true);
  } finally {
    apiClient.post = origPost;
  }
});

test('getWhatsAppSettings and updateWhatsAppSettings manage org preferences', async () => {
  const origGet = apiClient.get;
  const origPut = apiClient.put;
  let capturedGetUrl = '';
  let capturedPutUrl = '';
  let capturedPutBody: any = null;

  (apiClient as any).get = async (url: string) => {
    capturedGetUrl = url;
    return {
      data: {
        success: true,
        data: {
          isEnabled: true,
          notifyVisitor: true,
          notifyMaintenance: true,
          notifyPayment: true,
          notifyComplaint: true,
          notifyNotice: false,
        },
      },
    };
  };

  (apiClient as any).put = async (url: string, body: any) => {
    capturedPutUrl = url;
    capturedPutBody = body;
    return {
      data: {
        success: true,
        data: body,
      },
    };
  };

  try {
    const settings = await getWhatsAppSettings();
    assert.strictEqual(capturedGetUrl, '/admin/whatsapp/settings');
    assert.strictEqual(settings.isEnabled, true);
    assert.strictEqual(settings.notifyNotice, false);

    const updated = await updateWhatsAppSettings({
      isEnabled: true,
      notifyVisitor: true,
      notifyMaintenance: true,
      notifyPayment: true,
      notifyComplaint: true,
      notifyNotice: true,
    });
    assert.strictEqual(capturedPutUrl, '/admin/whatsapp/settings');
    assert.strictEqual(capturedPutBody.notifyNotice, true);
    assert.strictEqual(updated.notifyNotice, true);
  } finally {
    apiClient.get = origGet;
    apiClient.put = origPut;
  }
});

// Runner
(async () => {
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`  ✗ ${t.name}`);
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`\nAll ${passed} WhatsApp auth and settings API tests passed.`);
})();
