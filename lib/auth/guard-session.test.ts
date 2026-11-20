import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { credentialVault, portalStorage, sessionHeaders, sessionPortal } from './session-transport';

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

test('guard session renewal and portal isolation', async (suite) => {
  const names = ['window', 'localStorage', 'sessionStorage'] as const;
  const previous = names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));
  const listeners = new Map<string, (event: { key: string }) => void>();
  const location = { pathname: '/guard', href: '/guard' };
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: { location, addEventListener: (name: string, handler: (event: { key: string }) => void) => listeners.set(name, handler) } },
    localStorage: { configurable: true, value: storage() },
    sessionStorage: { configurable: true, value: storage() },
  });

  const { useAuthStore } = await import('../../store/useAuthStore');
  const { default: apiClient, handleAutomaticLogout } = await import('../api/client');
  const { refreshAccessSession, restoreAuthSession } = await import('./session-client');
  const originalAdapter = axios.defaults.adapter;
  const originalApiAdapter = apiClient.defaults.adapter;
  const org = '11111111-1111-4111-8111-111111111111';
  const context = { user: { id: 'guard-session-test', mobileNumber: '9000000000', fullName: 'Pramita Kumari Panda' }, memberships: [{ role: 'GUARD' as const, organizationId: org, permissions: ['visitor:read'] }] };
  const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ config, data, status, statusText: String(status), headers: {} });
  const rejected = (config: InternalAxiosRequestConfig) => new AxiosError('Request failed with status code 401', AxiosError.ERR_BAD_REQUEST, config, undefined, response(config, { message: 'Session expired or revoked' }, 401));
  function authenticate() {
    location.pathname = '/guard';
    location.href = '/guard';
    useAuthStore.getState().clearAuth();
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.getState().setAuth({ accessToken: 'expired-access', backendUser: context.user, memberships: context.memberships, organizationId: org });
  }

  try {
    await suite.test('all guard routes select guard headers, including standalone radio and trailing slash', () => {
      for (const path of ['/guard', '/guard/', '/guard/login', '/guard/scan', '/walkie-talkie', '/walkie-talkie/']) {
        location.pathname = path;
        assert.equal(sessionPortal(), 'guard', path);
        assert.equal(sessionHeaders()['X-Portal-Role'], 'GUARD', path);
      }
      for (const [path, portal] of [['/resident', 'resident'], ['/visitors', 'resident'], ['/complaints', 'resident'], ['/notices', 'resident'], ['/payments', 'resident'], ['/admin', 'admin'], ['/admin/login', 'admin'], ['/login', 'admin'], ['/login/', 'admin'], ['/guard-other', 'resident']]) {
        location.pathname = path;
        assert.equal(sessionPortal(), portal, path);
      }
    });

    await suite.test('guard and radio share session metadata without reading resident credentials', async () => {
      location.pathname = '/guard';
      portalStorage.setItem('societyos_access_token', 'guard-token');
      await credentialVault.save({ organizationId: org, rotationId: 'guard-rotation' });
      location.pathname = '/resident';
      portalStorage.setItem('societyos_access_token', 'resident-token');
      await credentialVault.save({ organizationId: 'resident-org', rotationId: 'resident-rotation' });
      location.pathname = '/walkie-talkie';
      assert.equal(portalStorage.getItem('societyos_access_token'), 'guard-token');
      assert.equal((await credentialVault.load()).organizationId, org);
      assert.equal((await credentialVault.load()).rotationId, 'guard-rotation');
    });

    await suite.test('expired access token renews silently on radio with guard session', async () => {
      authenticate();
      location.pathname = '/walkie-talkie';
      const version = useAuthStore.getState().sessionVersion;
      let refreshes = 0;
      axios.defaults.adapter = async (config) => {
        if (config.url?.endsWith('/auth/refresh-token')) {
          assert.equal(config.headers.get('X-Portal-Role'), 'GUARD');
          assert.equal(config.withCredentials, true);
          refreshes++;
          return response(config, { accessToken: 'renewed-guard-access' });
        }
        assert.ok(config.url?.endsWith('/auth/me'));
        assert.equal(config.headers.get('X-Organization-Id'), undefined);
        return response(config, context);
      };
      apiClient.defaults.adapter = async (config) => {
        assert.equal(config.headers.get('X-Portal-Role'), 'GUARD');
        if (config.headers.get('Authorization') === 'Bearer expired-access') throw rejected(config);
        assert.equal(config.headers.get('Authorization'), 'Bearer renewed-guard-access');
        return response(config, { ok: true });
      };
      assert.equal((await apiClient.post('/auth/activity')).data.ok, true);
      assert.equal(refreshes, 1);
      assert.equal(useAuthStore.getState().isAuthenticated, true);
      assert.equal(useAuthStore.getState().sessionVersion, version);
      assert.equal(useAuthStore.getState().backendUser?.fullName, context.user.fullName);
      assert.equal(location.href, '/guard');
    });

    await suite.test('radio reload restores guard membership and selected society', async () => {
      authenticate();
      await credentialVault.save({ organizationId: org });
      location.pathname = '/walkie-talkie/';
      useAuthStore.setState({ isAuthenticated: false, accessToken: null, organizationId: null });
      assert.equal(await restoreAuthSession(), true);
      assert.equal(useAuthStore.getState().isAuthenticated, true);
      assert.deepEqual(useAuthStore.getState().roles, ['GUARD']);
      assert.equal(useAuthStore.getState().organizationId, org);
    });

    await suite.test('concurrent expired requests share one guard refresh', async () => {
      authenticate();
      location.pathname = '/walkie-talkie';
      let refreshes = 0;
      axios.defaults.adapter = async (config) => {
        if (config.url?.endsWith('/auth/refresh-token')) {
          refreshes++;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return response(config, { accessToken: 'renewed-guard-access' });
        }
        return response(config, context);
      };
      await Promise.all([apiClient.get('/visitor-visits'), apiClient.get('/society-settings/public'), apiClient.post('/auth/activity')]);
      assert.equal(refreshes, 1);
      assert.equal(useAuthStore.getState().isAuthenticated, true);
    });

    await suite.test('temporary refresh outage preserves session and retries using same rotation ID', async () => {
      authenticate();
      location.pathname = '/walkie-talkie';
      const rotations: string[] = [];
      axios.defaults.adapter = async (config) => {
        if (config.url?.endsWith('/auth/refresh-token')) {
          rotations.push(JSON.parse(config.data).rotationId);
          if (rotations.length === 1) throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
          return response(config, { accessToken: 'renewed-guard-access' });
        }
        return response(config, context);
      };
      await assert.rejects(apiClient.get('/visitor-visits'), /Network Error/);
      assert.equal(useAuthStore.getState().isAuthenticated, true);
      assert.equal(location.href, '/guard');
      await refreshAccessSession();
      assert.equal(rotations.length, 2);
      assert.equal(rotations[0], rotations[1]);
    });

    await suite.test('confirmed revoked guard session redirects radio to guard login', async () => {
      authenticate();
      location.pathname = '/walkie-talkie';
      axios.defaults.adapter = async (config) => { throw rejected(config); };
      await assert.rejects(apiClient.get('/visitor-visits'));
      assert.equal(useAuthStore.getState().isAuthenticated, false);
      assert.equal(location.href, '/guard/login');
    });

    for (const portal of ['guard', 'resident'] as const) {
      await suite.test(`${portal} endpoint 401 after successful refresh preserves session`, async () => {
        authenticate();
        location.pathname = `/${portal}`;
        location.href = `/${portal}`;
        const portalContext = { ...context, memberships: [{ ...context.memberships[0], role: portal === 'guard' ? 'GUARD' as const : 'RESIDENT' as const }] };
        let refreshes = 0;
        axios.defaults.adapter = async (config) => {
          if (config.url?.endsWith('/auth/refresh-token')) {
            refreshes++;
            return response(config, { accessToken: 'renewed-access' });
          }
          return response(config, portalContext);
        };
        apiClient.defaults.adapter = async (config) => { throw rejected(config); };
        await assert.rejects(apiClient.get('/visitor-visits'));
        assert.equal(refreshes, 1);
        assert.equal(useAuthStore.getState().isAuthenticated, true);
        assert.equal(useAuthStore.getState().accessToken, 'renewed-access');
        assert.equal(location.href, `/${portal}`);
        assert.equal((await credentialVault.load()).pendingLogout, undefined);
      });
    }

    await suite.test('automatic logout keeps each portal on its own login', () => {
      for (const [path, login] of [['/guard', '/guard/login'], ['/walkie-talkie/', '/guard/login'], ['/visitors', '/resident/login'], ['/admin', '/admin/login']]) {
        location.pathname = path;
        location.href = path;
        handleAutomaticLogout();
        assert.equal(location.href, login);
      }
      location.pathname = '/guard/login';
      location.href = '/guard/login';
      handleAutomaticLogout();
      assert.equal(location.href, '/guard/login');
    });

    await suite.test('resident logout event cannot log out guard using radio', () => {
      authenticate();
      location.pathname = '/walkie-talkie';
      listeners.get('storage')!({ key: 'societyos_logout_event:resident' });
      assert.equal(useAuthStore.getState().isAuthenticated, true);
      listeners.get('storage')!({ key: 'societyos_logout_event:guard' });
      assert.equal(useAuthStore.getState().isAuthenticated, false);
      assert.equal(location.href, '/guard/login');
    });
  } finally {
    axios.defaults.adapter = originalAdapter;
    apiClient.defaults.adapter = originalApiAdapter;
    names.forEach((name, index) => {
      if (previous[index]) Object.defineProperty(globalThis, name, previous[index]!);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
});
