import { pushSession, pushTokenLifecycle } from '../lib/firebase/push-token-lifecycle';
import { create } from 'zustand';
import { portalStorage, sessionPortal } from '../lib/auth/session-transport';
import { AuthUser, UserRole } from '../types';
import type {
  BackendUser,
  BackendRole,
  OrganizationContextItem,
  OrganizationMembership,
  AuthMeResponse,
} from '../lib/api/types';

export type { OrganizationContextItem, BackendRole, OrganizationMembership, AuthMeResponse };

/**
 * Derive legacy presentation role from authoritative BackendRole.
 * Used strictly for legacy UI compatibility; never authoritative for authorization.
 */
export function backendRoleToLegacyRole(role?: BackendRole | null): UserRole | null {
  if (!role) return null;
  switch (role) {
    case 'SUPER_ADMIN':
    case 'SOCIETY_ADMIN':
      return 'admin';
    case 'RESIDENT':
      return 'resident';
    case 'GUARD':
      return 'guard';
    default:
      return null;
  }
}

/**
 * Pure helper to compute effective roles, permissions, and organizationId
 * from authoritative backend memberships and active/explicit organization selection.
 */
export function resolveEffectiveContext(
  memberships: OrganizationMembership[],
  activeOrgId: string | null,
): {
  organizationId: string | null;
  roles: BackendRole[];
  permissions: string[];
} {
  if (!memberships || memberships.length === 0) {
    return { organizationId: null, roles: [], permissions: [] };
  }

  // 1. SUPER_ADMIN is platform-scoped
  const superAdmin = memberships.find(
    (m) => m.role === 'SUPER_ADMIN' && m.organizationId === null,
  );
  if (superAdmin) {
    return {
      organizationId: activeOrgId ?? null,
      roles: ['SUPER_ADMIN'],
      permissions: superAdmin.permissions || [],
    };
  }

  // 2. Normal users: filter valid organization memberships
  const normalMemberships = memberships.filter((m) => m.organizationId !== null);

  if (normalMemberships.length === 0) {
    return { organizationId: null, roles: [], permissions: [] };
  }

  // 2A. Exactly ONE organization membership: safe to auto-select
  if (normalMemberships.length === 1) {
    const single = normalMemberships[0];
    if (activeOrgId && activeOrgId !== single.organizationId) {
      // Client tried to set an organization that does not match the single membership -> fail closed
      return { organizationId: null, roles: [], permissions: [] };
    }
    return {
      organizationId: single.organizationId,
      roles: [single.role],
      permissions: single.permissions || [],
    };
  }

  // 2B. MULTIPLE organization memberships: DO NOT blindly select first
  if (activeOrgId) {
    const matched = normalMemberships.find((m) => m.organizationId === activeOrgId);
    if (matched) {
      return {
        organizationId: matched.organizationId,
        roles: [matched.role],
        permissions: matched.permissions || [],
      };
    }
  }

  // No active organization selected or activeOrgId is invalid -> leave unset, fail-closed
  return {
    organizationId: null,
    roles: [],
    permissions: [],
  };
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface AuthState {
  // ── Existing mock-auth fields (preserved) ──────────────────────────────
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isRestoring: boolean;
  sessionError: string | null;

  // ── Backend token & organization fields ────────────────────────────────
  /** Short-lived JWT. Durable refresh credentials live in cookie or native vault. */
  accessToken: string | null;
  /** Native refresh credential in memory; browser refresh remains HttpOnly. */
  refreshToken: string | null;
  /**
   * The organization UUID sent as X-Organization-Id on every protected request.
   * Populated after login from trusted backend response.
   * Remains null if backend does not return organization context or for SUPER_ADMIN
   * until an explicit target organization is selected.
   */
  organizationId: string | null;
  /**
   * Available organizations for the authenticated user or for SUPER_ADMIN target selection.
   */
  availableOrganizations: OrganizationContextItem[];

  // ── Authoritative RBAC state (Phase 12 Step 5) ─────────────────────────
  /**
   * Authoritative backend memberships returned from GET /api/v1/auth/me.
   * Preserves full organizationId + role + permissions association.
   */
  memberships: OrganizationMembership[];
  /**
   * Authoritative backend roles: SUPER_ADMIN | SOCIETY_ADMIN | RESIDENT | GUARD.
   * Derived solely from trusted backend response or user-roles resolution.
   */
  roles: BackendRole[];
  /**
   * Permissions granted to the user in the active organization context.
   */
  permissions: string[];

  /** Minimal backend user record returned by verify-otp / refresh-token. */
  backendUser: BackendUser | null;
  /** Internal session version — incremented on login/logout to prevent
   *  refresh-after-logout race conditions. */
  sessionVersion: number;
  /** Internal flag set during logout to prevent refresh from resurrecting
   *  the authenticated session after the user has logged out. */
  logoutInProgress: boolean;

  // ── Existing actions (preserved) ───────────────────────────────────────
  login: (user: AuthUser) => void;
  logout: () => void;
  hydrateSession: () => void;
  restoreSession: () => Promise<boolean>;

  // ── Actions ────────────────────────────────────────────────────────────
  /**
   * Persist the full auth result returned by verify-otp or refresh-token.
   */
  setAuth: (params: {
    accessToken: string;
    refreshToken?: string;
    backendUser: BackendUser;
    memberships?: OrganizationMembership[];
    organizations?: OrganizationContextItem[];
    organizationId?: string | null;
    roles?: BackendRole[];
    permissions?: string[];
    isSuperAdmin?: boolean;
  }) => void;

  /**
   * Establish authoritative auth context from GET /api/v1/auth/me.
   */
  setAuthContext: (authMe: AuthMeResponse, explicitOrgId?: string | null) => void;

  /** Replace only the access token (used after a silent refresh). */
  setAccessToken: (token: string) => void;

  /**
   * Set the active organization ID.
   * Used for explicit target organization selection (e.g. SUPER_ADMIN or multi-org switching).
   * Validates that the selected organization belongs to the user's authoritative memberships.
   */
  setOrganizationId: (id: string | null) => void;

  /**
   * Set the available organizations list.
   */
  setAvailableOrganizations: (orgs: OrganizationContextItem[]) => void;

  /**
   * Set authoritative backend roles.
   */
  setRoles: (roles: BackendRole[]) => void;

  /**
   * Set authoritative permissions.
   */
  setPermissions: (permissions: string[]) => void;

  /**
   * Set authoritative organization memberships.
   */
  setMemberships: (memberships: OrganizationMembership[]) => void;

  /**
   * Clear all authentication, organization, and RBAC state — called on logout or refresh failure.
   * Preserves isHydrated so the UI does not flash a loading state.
   */
  clearAuth: () => void;
}

// ---------------------------------------------------------------------------
// sessionStorage keys for reload persistence
// ---------------------------------------------------------------------------

let restoringSession: Promise<boolean> | null = null;

const SESSION_STORAGE_KEY = 'societyos_session_auth';
const REFRESH_TOKEN_KEY = 'societyos_refresh_token';
const ACCESS_TOKEN_KEY = 'societyos_access_token';
const ORGANIZATION_ID_KEY = 'societyos_organization_id';
const AVAILABLE_ORGS_KEY = 'societyos_available_organizations';
const MEMBERSHIPS_KEY = 'societyos_memberships';
const ROLES_KEY = 'societyos_roles';
const PERMISSIONS_KEY = 'societyos_permissions';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set, get) => ({
  // ── Existing defaults ───────────────────────────────────────────────────
  user: null,
  role: null,
  isAuthenticated: false,
  isHydrated: false,
  isRestoring: false,
  sessionError: null,

  // ── Defaults ────────────────────────────────────────────────────────────
  accessToken: null,
  refreshToken: null,
  organizationId: null,
  availableOrganizations: [],
  memberships: [],
  roles: [],
  permissions: [],
  backendUser: null,
  sessionVersion: 0,
  logoutInProgress: false,

  hydrateSession: () => {
    if (typeof window !== 'undefined' && !get().isHydrated) void get().restoreSession();
  },
  restoreSession: () => {
    if (restoringSession) return restoringSession;
    restoringSession = import('../lib/auth/session-client').then(module => module.restoreAuthSession()).finally(() => { restoringSession = null; });
    return restoringSession;
  },

  // ── Existing: login (mock-auth path — preserved unchanged) ─────────────
  login: (user: AuthUser) => {
    if (typeof window !== 'undefined') {
      try {
        portalStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
        portalStorage.setItem('societyos_session_version', String(get().sessionVersion + 1));
      } catch {}
    }
    set({
      user,
      role: user.role,
      isAuthenticated: true,
      isHydrated: true,
      sessionVersion: get().sessionVersion + 1,
      logoutInProgress: false,
    });
  },

  // ── Existing: logout ───────────────────────────────────────────────────
  logout: () => {
    if (typeof window !== 'undefined') {
      try {
        portalStorage.removeItem(SESSION_STORAGE_KEY);
        portalStorage.removeItem(REFRESH_TOKEN_KEY);
        portalStorage.removeItem(ACCESS_TOKEN_KEY);
        portalStorage.removeItem('societyos_session_version');
        portalStorage.removeItem('societyos_logout_in_progress');
        portalStorage.removeItem(ORGANIZATION_ID_KEY);
        portalStorage.removeItem(AVAILABLE_ORGS_KEY);
        portalStorage.removeItem(MEMBERSHIPS_KEY);
        portalStorage.removeItem(ROLES_KEY);
        portalStorage.removeItem(PERMISSIONS_KEY);
        localStorage.setItem(`societyos_logout_event:${sessionPortal()}`, String(Date.now()));
      } catch {}
    }
    set({
      user: null,
      role: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      organizationId: null,
      availableOrganizations: [],
      memberships: [],
      roles: [],
      permissions: [],
      backendUser: null,
      sessionVersion: get().sessionVersion + 1,
      logoutInProgress: false,
    });
  },

  // ── New: setAuthContext (authoritative /auth/me integration) ───────────
  setAuthContext: (authMe: AuthMeResponse, explicitOrgId?: string | null) => {
    const memberships = authMe.memberships || [];
    const isSuperAdminUser = memberships.some((m) => m.role === 'SUPER_ADMIN' && m.organizationId === null);

    let availableOrganizations: OrganizationContextItem[] = memberships
      .filter((m) => m.organizationId !== null)
      .map((m) => ({ id: m.organizationId!, role: m.role }));

    // NOTE: No fabricated organizations are injected here. Organizations must
    // come from the backend (memberships / organizations API).

    let currentOrgId = explicitOrgId !== undefined ? explicitOrgId : get().organizationId;
    if (isSuperAdminUser && !currentOrgId) {
      const storedOrgId = typeof window !== 'undefined' ? portalStorage.getItem(ORGANIZATION_ID_KEY) : null;
      currentOrgId = storedOrgId;
    }

    const effective = resolveEffectiveContext(memberships, currentOrgId);
    localStorage.setItem(`societyos:${sessionPortal()}:organization`, effective.organizationId || '');
    const legacyRole = backendRoleToLegacyRole(effective.roles[0]);

    if (typeof window !== 'undefined') {
      try {
        if (effective.organizationId) {
          portalStorage.setItem(ORGANIZATION_ID_KEY, effective.organizationId);
        } else {
          portalStorage.removeItem(ORGANIZATION_ID_KEY);
        }
        if (memberships.length > 0) {
          portalStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships));
        } else {
          portalStorage.removeItem(MEMBERSHIPS_KEY);
        }
        if (availableOrganizations.length > 0) {
          portalStorage.setItem(AVAILABLE_ORGS_KEY, JSON.stringify(availableOrganizations));
        } else {
          portalStorage.removeItem(AVAILABLE_ORGS_KEY);
        }
        if (effective.roles.length > 0) {
          portalStorage.setItem(ROLES_KEY, JSON.stringify(effective.roles));
        } else {
          portalStorage.removeItem(ROLES_KEY);
        }
        if (effective.permissions.length > 0) {
          portalStorage.setItem(PERMISSIONS_KEY, JSON.stringify(effective.permissions));
        } else {
          portalStorage.removeItem(PERMISSIONS_KEY);
        }
      } catch {}
    }

    const existingUser = get().user;
    const updatedUser: AuthUser | null = existingUser
      ? {
          ...existingUser,
          id: authMe.user.id,
          name: authMe.user.fullName?.trim() || '',
          role: legacyRole ?? existingUser.role,
          societyId: effective.organizationId ?? '',
        }
      : null;

    set({
      backendUser: authMe.user,
      memberships,
      organizationId: effective.organizationId,
      roles: effective.roles,
      permissions: effective.permissions,
      availableOrganizations,
      role: legacyRole,
      user: updatedUser,
      isAuthenticated: true,
      isHydrated: true,
    });
  },

  // ── New: setAuth ────────────────────────────────────────────────────────
  setAuth: ({
    accessToken,
    refreshToken,
    backendUser,
    memberships,
    organizations,
    organizationId,
    roles,
    permissions,
    isSuperAdmin,
  }) => {
    // Persist refresh token and access token to sessionStorage for reload survival.
    if (typeof window !== 'undefined') {
      try {
        portalStorage.removeItem(REFRESH_TOKEN_KEY);
        if (accessToken) {
          portalStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        }
      } catch {}
    }

    if (memberships !== undefined) {
      get().setMemberships(memberships);
      get().setAuthContext({ user: backendUser, memberships }, organizationId);
      set({ accessToken, refreshToken: refreshToken ?? null, logoutInProgress: false, sessionError: null });
      return;
    }

    const available = organizations !== undefined ? organizations : get().availableOrganizations;
    let activeOrgId: string | null = get().organizationId;

    if (organizationId !== undefined) {
      activeOrgId = organizationId;
    } else if (activeOrgId === null && available.length > 0) {
      activeOrgId = available[0].id;
    }

    const resolvedRoles = roles !== undefined ? roles : get().roles;
    const resolvedPermissions = permissions !== undefined ? permissions : get().permissions;
    const legacyRole = backendRoleToLegacyRole(resolvedRoles[0]);

    if (typeof window !== 'undefined') {
      try {
        if (activeOrgId) {
          portalStorage.setItem(ORGANIZATION_ID_KEY, activeOrgId);
        } else {
          portalStorage.removeItem(ORGANIZATION_ID_KEY);
        }
        if (available.length > 0) {
          portalStorage.setItem(AVAILABLE_ORGS_KEY, JSON.stringify(available));
        } else {
          portalStorage.removeItem(AVAILABLE_ORGS_KEY);
        }
        if (resolvedRoles.length > 0) {
          portalStorage.setItem(ROLES_KEY, JSON.stringify(resolvedRoles));
        } else {
          portalStorage.removeItem(ROLES_KEY);
        }
        if (resolvedPermissions.length > 0) {
          portalStorage.setItem(PERMISSIONS_KEY, JSON.stringify(resolvedPermissions));
        } else {
          portalStorage.removeItem(PERMISSIONS_KEY);
        }
      } catch {}
    }

    set({
      accessToken,
      refreshToken: refreshToken ?? null,
      backendUser,
      organizationId: activeOrgId,
      availableOrganizations: available,
      roles: resolvedRoles,
      permissions: resolvedPermissions,
      role: legacyRole,
      isAuthenticated: true,
      isHydrated: true,
      logoutInProgress: false,
      sessionError: null,
    });
  },

  // ── New: setAccessToken ─────────────────────────────────────────────────
  setAccessToken: (token: string) => {
    if (typeof window !== 'undefined') {
      try {
        portalStorage.setItem(ACCESS_TOKEN_KEY, token);
      } catch {}
    }
    set({ accessToken: token });
  },

  // ── New: setOrganizationId ──────────────────────────────────────────────
  setOrganizationId: (id: string | null) => {
    const { memberships } = get();
    const effective = resolveEffectiveContext(memberships, id);
    localStorage.setItem(`societyos:${sessionPortal()}:organization`, effective.organizationId || '');
    const legacyRole = backendRoleToLegacyRole(effective.roles[0]);

    if (typeof window !== 'undefined') {
      try {
        if (effective.organizationId) {
          portalStorage.setItem(ORGANIZATION_ID_KEY, effective.organizationId);
        } else {
          portalStorage.removeItem(ORGANIZATION_ID_KEY);
        }
        if (effective.roles.length > 0) {
          portalStorage.setItem(ROLES_KEY, JSON.stringify(effective.roles));
        } else {
          portalStorage.removeItem(ROLES_KEY);
        }
        if (effective.permissions.length > 0) {
          portalStorage.setItem(PERMISSIONS_KEY, JSON.stringify(effective.permissions));
        } else {
          portalStorage.removeItem(PERMISSIONS_KEY);
        }
      } catch {}
    }

    const existingUser = get().user;
    const updatedUser: AuthUser | null = existingUser
      ? {
          ...existingUser,
          role: legacyRole ?? existingUser.role,
          societyId: effective.organizationId ?? '',
        }
      : null;

    set({
      organizationId: effective.organizationId,
      roles: effective.roles,
      permissions: effective.permissions,
      role: legacyRole,
      user: updatedUser,
    });
  },

  // ── New: setAvailableOrganizations ──────────────────────────────────────
  setAvailableOrganizations: (orgs: OrganizationContextItem[]) => {
    if (typeof window !== 'undefined') {
      try {
        if (orgs.length > 0) {
          portalStorage.setItem(AVAILABLE_ORGS_KEY, JSON.stringify(orgs));
        } else {
          portalStorage.removeItem(AVAILABLE_ORGS_KEY);
        }
      } catch {}
    }
    set({ availableOrganizations: orgs });
  },

  // ── New: setRoles ───────────────────────────────────────────────────────
  setRoles: (roles: BackendRole[]) => {
    const legacyRole = backendRoleToLegacyRole(roles[0]);
    if (typeof window !== 'undefined') {
      try {
        if (roles.length > 0) {
          portalStorage.setItem(ROLES_KEY, JSON.stringify(roles));
        } else {
          portalStorage.removeItem(ROLES_KEY);
        }
      } catch {}
    }
    set({ roles, role: legacyRole });
  },

  // ── New: setPermissions ─────────────────────────────────────────────────
  setPermissions: (permissions: string[]) => {
    if (typeof window !== 'undefined') {
      try {
        if (permissions.length > 0) {
          portalStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
        } else {
          portalStorage.removeItem(PERMISSIONS_KEY);
        }
      } catch {}
    }
    set({ permissions });
  },

  // ── New: setMemberships ─────────────────────────────────────────────────
  setMemberships: (memberships: OrganizationMembership[]) => {
    if (typeof window !== 'undefined') {
      try {
        if (memberships.length > 0) {
          portalStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships));
        } else {
          portalStorage.removeItem(MEMBERSHIPS_KEY);
        }
      } catch {}
    }
    set({ memberships });
  },

  // ── New: clearAuth ──────────────────────────────────────────────────────
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      try {
        portalStorage.removeItem(SESSION_STORAGE_KEY);
        portalStorage.removeItem(REFRESH_TOKEN_KEY);
        portalStorage.removeItem(ACCESS_TOKEN_KEY);
        portalStorage.removeItem('societyos_session_version');
        portalStorage.removeItem('societyos_logout_in_progress');
        portalStorage.removeItem(ORGANIZATION_ID_KEY);
        portalStorage.removeItem(AVAILABLE_ORGS_KEY);
        portalStorage.removeItem(MEMBERSHIPS_KEY);
        portalStorage.removeItem(ROLES_KEY);
        portalStorage.removeItem(PERMISSIONS_KEY);
        localStorage.setItem(`societyos_logout_event:${sessionPortal()}`, String(Date.now()));
      } catch {}
    }
    set({
      user: null,
      role: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      organizationId: null,
      availableOrganizations: [],
      memberships: [],
      roles: [],
      permissions: [],
      backendUser: null,
      sessionVersion: get().sessionVersion + 1,
      logoutInProgress: false,
    });
  },
}));

// ---------------------------------------------------------------------------
// Multi-tab logout synchronization (Zero secrets in localStorage)
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === `societyos_logout_event:${sessionPortal()}`) {
      const state = useAuthStore.getState();
      if (state.isAuthenticated || state.accessToken || state.refreshToken) {
        try {
          portalStorage.removeItem(SESSION_STORAGE_KEY);
          portalStorage.removeItem(REFRESH_TOKEN_KEY);
          portalStorage.removeItem(ACCESS_TOKEN_KEY);
          portalStorage.removeItem('societyos_session_version');
          portalStorage.removeItem('societyos_logout_in_progress');
          portalStorage.removeItem(ORGANIZATION_ID_KEY);
          portalStorage.removeItem(AVAILABLE_ORGS_KEY);
          portalStorage.removeItem(MEMBERSHIPS_KEY);
          portalStorage.removeItem(ROLES_KEY);
          portalStorage.removeItem(PERMISSIONS_KEY);
        } catch {}

        useAuthStore.setState({
          user: null,
          role: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          organizationId: null,
          availableOrganizations: [],
          memberships: [],
          roles: [],
          permissions: [],
          backendUser: null,
          sessionVersion: useAuthStore.getState().sessionVersion + 1,
          logoutInProgress: false,
        });

        const pathname = window.location.pathname;
        if (
          !pathname.includes('/login') &&
          !pathname.includes('/verify-otp') &&
          !pathname.includes('/request-otp')
        ) {
          window.location.href = `/${sessionPortal()}/login`;
        }
      }
    }
  });
}



useAuthStore.subscribe((state, previous) => {
  const before = pushSession(previous);
  const after = pushSession(state);
  if (before && (!after || before.userId !== after.userId || before.organizationId !== after.organizationId)) {
    pushTokenLifecycle.invalidate();
    if (!previous.logoutInProgress) {
      void pushTokenLifecycle.cleanup(before).then((result) => {
        if (!result.confirmed && typeof window !== 'undefined') {
          try { portalStorage.setItem('societyos_push_cleanup_warning', 'Push cleanup not confirmed. Browser or server cleanup remains pending.'); } catch {}
        }
      });
    }
  }
});
