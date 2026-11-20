import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { BackendRole, OrganizationMembership } from '../api/types';
import { PortalAccessError, resolvePortalContext } from './portal-access';
import { credentialVault, type SessionPortal } from './session-transport';

const portals: SessionPortal[] = ['admin', 'resident', 'guard'];
const roles: BackendRole[] = ['SOCIETY_ADMIN', 'SUPER_ADMIN', 'RESIDENT', 'GUARD'];
const membership = (role: BackendRole, organizationId = 'society-a'): OrganizationMembership => ({
  role, organizationId: role === 'SUPER_ADMIN' ? null : organizationId, permissions: [],
});

for (const portal of portals) {
  for (const role of roles) {
    test(`${portal}: ${role} permission check before publishing login success`, () => {
      const allowed = portal === 'admin' ? ['SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(role) : role === portal.toUpperCase();
      if (allowed) assert.deepEqual(resolvePortalContext([membership(role)], portal).roles, [role]);
      else assert.throws(() => resolvePortalContext([membership(role)], portal), PortalAccessError);
    });
  }
}

test('new account ignores previous account society selection', () => {
  const context = resolvePortalContext([membership('RESIDENT', 'new-society')], 'resident', 'previous-society');
  assert.equal(context.organizationId, 'new-society');
  assert.deepEqual(context.roles, ['RESIDENT']);
});

test('platform admin retains an explicit target society without fabricating membership', () => {
  const context = resolvePortalContext([membership('SUPER_ADMIN')], 'admin', 'selected-society');
  assert.equal(context.organizationId, 'selected-society');
  assert.deepEqual(context.roles, ['SUPER_ADMIN']);
});

test('selected society from another portal cannot cause false success or 403', () => {
  const context = resolvePortalContext([membership('GUARD', 'guard-society'), membership('RESIDENT', 'resident-society')], 'resident', 'guard-society');
  assert.equal(context.organizationId, 'resident-society');
  assert.deepEqual(context.roles, ['RESIDENT']);
});

test('multiple eligible societies require existing authorized selection', () => {
  const memberships = [membership('RESIDENT', 'society-a'), membership('RESIDENT', 'society-b')];
  assert.throws(() => resolvePortalContext(memberships, 'resident'), PortalAccessError);
  assert.equal(resolvePortalContext(memberships, 'resident', 'society-b').organizationId, 'society-b');
});

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

test('all portals discard mismatched saved sessions and keep login usable', async suite => {
  const names = ['window', 'localStorage', 'sessionStorage'] as const;
  const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const location = { pathname: '/admin/login' };
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: { location } },
    localStorage: { configurable: true, value: storage() },
    sessionStorage: { configurable: true, value: storage() },
  });
  const { useAuthStore } = await import('../../store/useAuthStore');
  const { restoreAuthSession } = await import('./session-client');
  const adapter = axios.defaults.adapter;
  const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ config, data, status, statusText: String(status), headers: {} });
  try {
    for (const portal of portals) {
      for (const backendEnforced of [true, false]) {
        await suite.test(`${portal}: rejects ${backendEnforced ? 'server denial' : 'legacy mismatched session'}`, async () => {
          location.pathname = `/${portal}/login`;
          useAuthStore.getState().clearAuth();
          localStorage.clear();
          sessionStorage.clear();
          await credentialVault.save({ organizationId: 'old-account-society' });
          let logouts = 0;
          axios.defaults.adapter = async config => {
            assert.equal(config.headers.get('X-Portal-Role'), portal.toUpperCase());
            if (config.url?.endsWith('/auth/logout')) { logouts++; return response(config, { success: true }); }
            if (config.url?.endsWith('/auth/refresh-token')) {
              if (backendEnforced) throw new AxiosError('Wrong portal', AxiosError.ERR_BAD_REQUEST, config, undefined, response(config, {}, 401));
              return response(config, { accessToken: 'legacy-wrong-portal-access' });
            }
            assert.ok(config.url?.endsWith('/auth/me'));
            assert.equal(config.headers.get('X-Organization-Id'), undefined);
            return response(config, { user: { id: 'wrong-portal-user', mobileNumber: '9000000000' }, memberships: [membership(portal === 'resident' ? 'GUARD' : 'RESIDENT')] });
          };
          assert.equal(await restoreAuthSession(), false);
          assert.equal(useAuthStore.getState().isAuthenticated, false);
          assert.equal(useAuthStore.getState().accessToken, null);
          assert.deepEqual(useAuthStore.getState().roles, []);
          assert.equal(useAuthStore.getState().sessionError, null);
          assert.equal(useAuthStore.getState().isHydrated, true);
          assert.equal(logouts, backendEnforced ? 0 : 1);
        });
      }
    }
  } finally {
    axios.defaults.adapter = adapter;
    useAuthStore.getState().clearAuth();
    names.forEach((name, index) => {
      if (previous[index]) Object.defineProperty(globalThis, name, previous[index]!);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
});
