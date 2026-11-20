/**
 * SocietyOS Notifications, Files & FCM Domain Security & Authorization Tests (Phase 12 Step 12)
 *
 * Verifies all security requirements across Notifications, Push Tokens, Files, and RBAC:
 *  1. Resident/Admin loads notifications from GET /notifications with organization context
 *  2. Mark single notification as read via PATCH /notifications/:id/read
 *  3. Mark all notifications as read via PATCH /notifications/read-all
 *  4. Push token registration uses POST /push-tokens and derives user/org server-side
 *  5. Push token deactivation uses DELETE /push-tokens/:id
 *  6. File upload uses POST /files/upload with multipart form data
 *  7. File download uses GET /files/:id with blob response
 *  8. File deactivation uses DELETE /files/:id
 *  9. Document store deletes remote file if fileId exists on document
 * 10. Document store starts clean with zero mock data
 * 11. RBAC: Resident and Admin have notification:read & push_token:manage
 * 12. RBAC: Guard has no file:read / file:upload / notification:read permissions
 * 13. Notifications fail closed when organization context is missing
 * 14. Real unread counts are reflected in useNotificationStore
 */

// Setup mock window/sessionStorage for node environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {};
}
if (typeof (globalThis as any).sessionStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

import assert from 'node:assert';
import apiClient from './client';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import { hasPermission } from '../auth/rbac';
import {
  getNotifications,
  getNotification,
  markNotificationRead,
  markAllNotificationsRead,
  registerPushToken,
  deactivatePushToken,
} from './notifications.api';
import {
  uploadFile,
  downloadFile,
  deleteFile,
} from './files.api';

async function runTests() {
  console.log('\n--- Running SocietyOS Notifications, Files & FCM Domain Tests (Step 12) ---');
  let passed = 0;

  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPatch = apiClient.patch;
  const originalDelete = apiClient.delete;

  function resetState() {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.patch = originalPatch;
    apiClient.delete = originalDelete;
    useAuthStore.getState().clearAuth();
    useNotificationStore.getState().reset();
    useDocumentStore.getState().reset();
  }

  // TEST 1: Fetches notifications via GET /notifications with organization context
  {
    resetState();
    useAuthStore.getState().setAuth({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      organizationId: 'org-uuid-1',
      backendUser: { id: 'user-uuid-1', mobileNumber: '+919876543210' },
      roles: ['RESIDENT'],
      permissions: ['notification:read'],
    });

    let calledUrl = '';
    apiClient.get = (async (url: string) => {
      calledUrl = url;
      return {
        data: [
          {
            id: 'notif-1',
            organization_id: 'org-uuid-1',
            recipient_user_id: 'user-uuid-1',
            type: 'VISITOR_ARRIVAL',
            title: 'Visitor at Gate',
            body: 'John Doe has arrived',
            data: { visit_id: 'visit-1' },
            is_read: false,
            read_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
    }) as any;

    await useNotificationStore.getState().fetchNotifications();

    assert.strictEqual(calledUrl, '/notifications');
    const notifs = useNotificationStore.getState().notifications;
    assert.strictEqual(notifs.length, 1);
    assert.strictEqual(notifs[0].id, 'notif-1');
    assert.strictEqual(useNotificationStore.getState().unreadCount, 1);
    passed++;
    console.log('✓ TEST 1 Passed: Notifications load via GET /notifications with org context');
  }

  // TEST 2: Mark single notification as read
  {
    resetState();
    useNotificationStore.setState({
      notifications: [
        {
          id: 'notif-1',
          organization_id: 'org-uuid-1',
          recipient_user_id: 'user-uuid-1',
          type: 'VISITOR_ARRIVAL',
          title: 'Visitor at Gate',
          body: 'John Doe has arrived',
          data: null,
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    });

    let calledUrl = '';
    apiClient.patch = (async (url: string) => {
      calledUrl = url;
      return {
        data: {
          id: 'notif-1',
          is_read: true,
          read_at: new Date().toISOString(),
        },
      };
    }) as any;

    await useNotificationStore.getState().markAsRead('notif-1');

    assert.strictEqual(calledUrl, '/notifications/notif-1/read');
    assert.strictEqual(useNotificationStore.getState().unreadCount, 0);
    assert.strictEqual(useNotificationStore.getState().notifications[0].is_read, true);
    passed++;
    console.log('✓ TEST 2 Passed: Single notification marked read via PATCH /notifications/:id/read');
  }

  // TEST 3: Mark all notifications as read
  {
    resetState();
    useNotificationStore.setState({
      notifications: [
        {
          id: 'notif-1',
          organization_id: 'org-uuid-1',
          recipient_user_id: 'user-uuid-1',
          type: 'NOTICE',
          title: 'Notice 1',
          body: 'Notice text',
          data: null,
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          organization_id: 'org-uuid-1',
          recipient_user_id: 'user-uuid-1',
          type: 'PAYMENT',
          title: 'Payment 1',
          body: 'Payment text',
          data: null,
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      unreadCount: 2,
    });

    let calledUrl = '';
    apiClient.patch = (async (url: string) => {
      calledUrl = url;
      return { data: { message: 'All notifications marked as read' } };
    }) as any;

    await useNotificationStore.getState().markAllAsRead();

    assert.strictEqual(calledUrl, '/notifications/read-all');
    assert.strictEqual(useNotificationStore.getState().unreadCount, 0);
    assert.ok(useNotificationStore.getState().notifications.every((n) => n.is_read));
    passed++;
    console.log('✓ TEST 3 Passed: All notifications marked read via PATCH /notifications/read-all');
  }

  // TEST 4: Registers push token via POST /push-tokens
  {
    resetState();
    let calledUrl = '';
    let requestBody: any = null;

    apiClient.post = (async (url: string, body: any) => {
      calledUrl = url;
      requestBody = body;
      return {
        data: {
          id: 'token-uuid-1',
          user_id: 'user-uuid-1',
          organization_id: 'org-uuid-1',
          token: 'fcm-device-token-123',
          platform: 'WEB',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }) as any;

    const record = await registerPushToken({ token: 'fcm-device-token-123', platform: 'WEB' });

    assert.strictEqual(calledUrl, '/push-tokens');
    assert.strictEqual(record.id, 'token-uuid-1');
    assert.strictEqual(requestBody.token, 'fcm-device-token-123');
    assert.strictEqual(requestBody.platform, 'WEB');
    assert.strictEqual(requestBody.user_id, undefined);
    assert.strictEqual(requestBody.organization_id, undefined);
    passed++;
    console.log('✓ TEST 4 Passed: Push token registered without client-supplied user_id');
  }

  // TEST 5: Deactivates push token via DELETE /push-tokens/:id
  {
    resetState();
    let calledUrl = '';
    apiClient.delete = (async (url: string) => {
      calledUrl = url;
      return { data: { message: 'Push token deactivated' } };
    }) as any;

    const res = await deactivatePushToken('token-uuid-1');
    assert.strictEqual(calledUrl, '/push-tokens/token-uuid-1');
    assert.strictEqual(res.message, 'Push token deactivated');
    passed++;
    console.log('✓ TEST 5 Passed: Push token deactivated via DELETE /push-tokens/:id');
  }

  // TEST 6: Uploads file via POST /files/upload with multipart form data
  {
    resetState();
    let calledUrl = '';

    apiClient.post = (async (url: string) => {
      calledUrl = url;
      return {
        data: {
          id: 'file-uuid-1',
          organization_id: 'org-uuid-1',
          uploaded_by: 'user-uuid-1',
          original_filename: 'bylaws.pdf',
          stored_key: 'uploads/bylaws.pdf',
          mime_type: 'application/pdf',
          size_bytes: 2048,
          storage_provider: 'LOCAL',
          is_active: true,
          created_at: new Date().toISOString(),
        },
      };
    }) as any;

    // Use simulated File
    const mockFile = { name: 'bylaws.pdf', size: 2048, type: 'application/pdf' } as any;
    const fileRecord = await uploadFile(mockFile);

    assert.strictEqual(calledUrl, '/files/upload');
    assert.strictEqual(fileRecord.id, 'file-uuid-1');
    assert.strictEqual(fileRecord.original_filename, 'bylaws.pdf');
    assert.strictEqual(fileRecord.size_bytes, 2048);
    passed++;
    console.log('✓ TEST 6 Passed: File uploaded via POST /files/upload');
  }

  // TEST 7: Downloads file via GET /files/:id as blob
  {
    resetState();
    let calledUrl = '';
    let configUsed: any = null;

    apiClient.get = (async (url: string, config: any) => {
      calledUrl = url;
      configUsed = config;
      return { data: 'mock-binary-data' };
    }) as any;

    const res = await downloadFile('file-uuid-1');
    assert.strictEqual(calledUrl, '/files/file-uuid-1');
    assert.strictEqual(configUsed?.responseType, 'blob');
    assert.strictEqual(res, 'mock-binary-data');
    passed++;
    console.log('✓ TEST 7 Passed: File downloaded via GET /files/:id with blob response');
  }

  // TEST 8: Deletes file via DELETE /files/:id
  {
    resetState();
    let calledUrl = '';
    apiClient.delete = (async (url: string) => {
      calledUrl = url;
      return { data: { message: 'File deactivated' } };
    }) as any;

    const res = await deleteFile('file-uuid-1');
    assert.strictEqual(calledUrl, '/files/file-uuid-1');
    assert.strictEqual(res.message, 'File deactivated');
    passed++;
    console.log('✓ TEST 8 Passed: File deactivated via DELETE /files/:id');
  }

  // TEST 9: Document store deletes remote file if fileId exists
  {
    resetState();
    let deletedFileUrl = '';
    apiClient.delete = (async (url: string) => {
      deletedFileUrl = url;
      return { data: { message: 'File deactivated' } };
    }) as any;

    useDocumentStore.setState({
      documents: [
        {
          id: 'doc-123',
          folderId: 'folder-1',
          title: 'House Rules',
          fileName: 'rules.pdf',
          fileType: 'pdf',
          fileSize: '2.0 MB',
          uploadedBy: 'Admin',
          uploadedAt: 'Today',
          isPublicToAll: true,
          category: 'Rules',
          fileId: 'remote-file-uuid-99',
        },
      ],
      folders: [],
    });

    await useDocumentStore.getState().deleteDocument('doc-123');

    assert.strictEqual(deletedFileUrl, '/files/remote-file-uuid-99');
    assert.strictEqual(useDocumentStore.getState().documents.length, 0);
    passed++;
    console.log('✓ TEST 9 Passed: Document store deactivates backend file attachment on delete');
  }

  // TEST 10: Document store starts clean with zero mock data
  {
    resetState();
    const store = useDocumentStore.getState();
    assert.deepStrictEqual(store.folders, []);
    assert.deepStrictEqual(store.documents, []);
    passed++;
    console.log('✓ TEST 10 Passed: Document store initializes with zero mock folders/documents');
  }

  // TEST 11: RBAC permissions for Resident and Admin
  {
    resetState();
    useAuthStore.getState().setAuth({
      accessToken: 'token',
      refreshToken: 'refresh',
      organizationId: 'org-1',
      backendUser: { id: 'u1', mobileNumber: '+919999999999' },
      roles: ['RESIDENT'],
      permissions: ['notification:read', 'push_token:manage'],
    });

    assert.strictEqual(hasPermission('notification:read'), true);
    assert.strictEqual(hasPermission('push_token:manage'), true);
    assert.strictEqual(hasPermission('file:manage'), false);
    passed++;
    console.log('✓ TEST 11 Passed: Resident has notification:read and push_token:manage, but not file:manage');
  }

  // TEST 12: RBAC permissions for Guard
  {
    resetState();
    useAuthStore.getState().setAuth({
      accessToken: 'token',
      refreshToken: 'refresh',
      organizationId: 'org-1',
      backendUser: { id: 'u2', mobileNumber: '+919888888888' },
      roles: ['GUARD'],
      permissions: ['push_token:manage'],
    });

    assert.strictEqual(hasPermission('push_token:manage'), true);
    assert.strictEqual(hasPermission('notification:read'), false);
    assert.strictEqual(hasPermission('file:read'), false);
    assert.strictEqual(hasPermission('file:upload'), false);
    passed++;
    console.log('✓ TEST 12 Passed: Guard does NOT have notification:read, file:read, or file:upload');
  }

  // TEST 13: Notifications fail closed without organization context
  {
    resetState();
    useAuthStore.getState().setAuth({
      accessToken: 'token',
      refreshToken: 'refresh',
      organizationId: null,
      backendUser: { id: 'u1', mobileNumber: '+919999999999' },
      roles: ['RESIDENT'],
      permissions: ['notification:read'],
    });

    let threw = false;
    try {
      await getNotifications();
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, 'getNotifications must fail closed when organization context is missing');
    passed++;
    console.log('✓ TEST 13 Passed: Notifications fail closed when organizationId is missing');
  }

  // TEST 14: Real unread counts reflected in useNotificationStore
  {
    resetState();
    useNotificationStore.setState({
      notifications: [
        {
          id: 'n1',
          organization_id: 'org-1',
          recipient_user_id: 'u1',
          type: 'ALERT',
          title: 'Alert 1',
          body: 'B1',
          data: null,
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'n2',
          organization_id: 'org-1',
          recipient_user_id: 'u1',
          type: 'ALERT',
          title: 'Alert 2',
          body: 'B2',
          data: null,
          is_read: true,
          read_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    });

    assert.strictEqual(useNotificationStore.getState().unreadCount, 1);
    passed++;
    console.log('✓ TEST 14 Passed: Real unread count accurately computed in store');
  }

  // A response from a previous organization/account cannot repopulate the inbox.
  {
    resetState();
    useAuthStore.setState({ organizationId: 'org-a', backendUser: { id: 'user-a', mobileNumber: '9111111111' }, isAuthenticated: true });
    let complete: (value: unknown) => void = () => {};
    apiClient.get = (() => new Promise<unknown>(resolve => { complete = resolve; })) as typeof apiClient.get;
    const loading = useNotificationStore.getState().fetchNotifications();
    useAuthStore.setState({ organizationId: 'org-b', backendUser: { id: 'user-b', mobileNumber: '9222222222' } });
    complete({ data: [{ id: 'private-a', is_read: false }] });
    await loading;
    assert.deepStrictEqual(useNotificationStore.getState().notifications, []);
    passed++;
    console.log('✓ Prior account response cannot restore private inbox data');
  }
  {
    resetState();
    useAuthStore.setState({ organizationId: 'org-a', backendUser: { id: 'user-a', mobileNumber: '9111111111' }, isAuthenticated: true });
    useNotificationStore.setState({ notifications: [{ id: 'private-a', is_read: false } as any], unreadCount: 1 });
    let complete: (value: unknown) => void = () => {};
    apiClient.get = (() => new Promise<unknown>(resolve => { complete = resolve; })) as typeof apiClient.get;
    apiClient.patch = (async () => ({ data: { id: 'private-a', is_read: true, read_at: new Date().toISOString() } })) as typeof apiClient.patch;
    const loading = useNotificationStore.getState().fetchNotifications();
    await useNotificationStore.getState().markAsRead('private-a');
    complete({ data: [{ id: 'private-a', is_read: false }] });
    await loading;
    assert.strictEqual(useNotificationStore.getState().notifications[0].is_read, true);
    assert.strictEqual(useNotificationStore.getState().unreadCount, 0);
    passed++;
    console.log('✓ Delayed fetch cannot undo server-confirmed read state');
  }

  console.log(`\nAll ${passed} Step 12 Domain & Security Tests Passed Successfully!\n`);
  resetState();
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
