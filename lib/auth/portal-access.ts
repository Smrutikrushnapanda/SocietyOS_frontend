import type { OrganizationMembership } from '../api/types';
import { resolveEffectiveContext } from '../../store/useAuthStore';
import type { SessionPortal } from './session-transport';

export class PortalAccessError extends Error {}

export function resolvePortalContext(
  memberships: OrganizationMembership[],
  portal: SessionPortal,
  preferredOrganizationId?: string | null,
) {
  const allowedRoles = portal === 'admin' ? ['SOCIETY_ADMIN', 'SUPER_ADMIN'] : [portal.toUpperCase()];
  const eligible = memberships.filter(member => allowedRoles.includes(member.role) &&
    (member.role === 'SUPER_ADMIN' ? member.organizationId === null : Boolean(member.organizationId)));
  const selected = eligible.find(member => member.organizationId === preferredOrganizationId);
  const organizationId = eligible.some(member => member.role === 'SUPER_ADMIN')
    ? preferredOrganizationId ?? null
    : selected?.organizationId ?? (eligible.length === 1 ? eligible[0].organizationId : null);
  const context = resolveEffectiveContext(memberships, organizationId);
  if (!context.roles.some(role => allowedRoles.includes(role))) {
    throw new PortalAccessError(eligible.length > 1
      ? 'Select your society before signing in to this portal.'
      : `This account cannot sign in to the ${portal} portal. Check your access with your society administrator.`);
  }
  return context;
}
