"use client";

import { authenticatedAdminName } from '../../lib/display';
import { adminSectionHref } from '../../lib/api/admin-sections';
import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { createPortal } from "react-dom";
import {
  useSocietyStore,
  useVisitorStore,
  useComplaintStore,
  useAuthStore,
} from "../../store";
import {
  getMenuHierarchy,
  MenuMasterItem,
} from "../../lib/api/role-admin-menu.api";

export type AdminSectionType =
  | "overview"
  | "buildings"
  | "residents"
  | "parking"
  | "visitors"
  | "amenities"
  | "complaints"
  | "staff"
  | "finance"
  | "documents"
  | "notices"
  | "reports"
  | "audit"
  | "whatsapp"
  | "role_master"
  | "settings"
  | "organizations";

interface AdminSidebarProps {
  currentSection: AdminSectionType;
  onSectionChange: (sec: AdminSectionType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const pathToSectionMap: Record<string, AdminSectionType> = {
  "/admin/overview": "overview",
  "/admin/societies": "buildings",
  "/admin/residents": "residents",
  "/admin/parking": "parking",
  "/admin/visitors": "visitors",
  "/admin/amenities": "amenities",
  "/admin/complaints": "complaints",
  "/admin/staff": "staff",
  "/admin/finance": "finance",
  "/admin/documents": "documents",
  "/admin/notices": "notices",
  "/admin/reports": "reports",
  "/admin/audit": "audit",
  "/admin/whatsapp": "whatsapp",
  "/admin/role-master": "role_master",
  "/admin/settings": "settings",
  "/admin/organizations": "organizations",
};

const menuSection = (
  item: Pick<MenuMasterItem, "menuPath" | "menuName">,
): AdminSectionType | undefined => {
  const section = pathToSectionMap[item.menuPath || ""];
  if (section) return section;

  return item.menuName.trim().toLowerCase() === "residents & app access"
    ? "residents"
    : undefined;
};

// Default canonical hierarchy fallback
const defaultHierarchy: Array<{
  name: string;
  items: Array<{
    name: string;
    path: string;
    icon: string;
    section: AdminSectionType;
  }>;
}> = [
  {
    name: "Main Operations",
    items: [
      {
        name: "Overview",
        path: "/admin/overview",
        icon: "overview",
        section: "overview",
      },
      {
        name: "Society & Buildings",
        path: "/admin/societies",
        icon: "building",
        section: "buildings",
      },
      {
        name: "Residents & App Access",
        path: "/admin/residents",
        icon: "residents",
        section: "residents",
      },
      {
        name: "People & Staff",
        path: "/admin/staff",
        icon: "staff",
        section: "staff",
      },
      {
        name: "Vehicles & Parking",
        path: "/admin/parking",
        icon: "parking",
        section: "parking",
      },
      {
        name: "Security & Access",
        path: "/admin/visitors",
        icon: "shield",
        section: "visitors",
      },
      {
        name: "Clubhouse & Amenities",
        path: "/admin/amenities",
        icon: "amenity",
        section: "amenities",
      },
      {
        name: "Helpdesk & AMC",
        path: "/admin/complaints",
        icon: "complaint",
        section: "complaints",
      },
    ],
  },
  {
    name: "Finance & Comms",
    items: [
      {
        name: "Finance & Payments",
        path: "/admin/finance",
        icon: "finance",
        section: "finance",
      },
      {
        name: "Documents & Vaults",
        path: "/admin/documents",
        icon: "file",
        section: "documents",
      },
      {
        name: "Notices & Circulars",
        path: "/admin/notices",
        icon: "notice",
        section: "notices",
      },
      {
        name: "Reports & Analytics",
        path: "/admin/reports",
        icon: "report",
        section: "reports",
      },
      {
        name: "Audit Logs",
        path: "/admin/audit",
        icon: "audit",
        section: "audit",
      },
      {
        name: "WhatsApp API",
        path: "/admin/whatsapp",
        icon: "whatsapp",
        section: "whatsapp",
      },
      {
        name: "Role Master",
        path: "/admin/role-master",
        icon: "roles",
        section: "role_master",
      },
      {
        name: "Master Settings",
        path: "/admin/settings",
        icon: "settings",
        section: "settings",
      },
    ],
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onSectionChange,
  isOpen,
  onClose,
}) => {
  const { society } = useSocietyStore();
  const { visitors } = useVisitorStore();
  const { actionableCount: openComplaintsCount, loadActionableCount } = useComplaintStore();
  const { roles, user, backendUser, organizationId, permissions } = useAuthStore();
  const [dynamicHierarchy, setDynamicHierarchy] = useState<MenuMasterItem[]>(
    [],
  );
  const canReadMenuHierarchy = permissions.includes("menu_master:read");

  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const adminFullName = authenticatedAdminName(backendUser);
  const adminRoleDisplay = isSuperAdmin ? "Super Admin" : "Society Admin";
  const adminInitials =
    adminFullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || "")
      .join("") || "SA";

  const activeVisitorsCount = visitors.filter(
    (v) => v.status === "requested",
  ).length;


  useEffect(() => {
    let isMounted = true;
    setDynamicHierarchy([]);
    if (!canReadMenuHierarchy) return;
    getMenuHierarchy(true)
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setDynamicHierarchy(data);
        }
      })
      .catch(() => {
        // Safe silent fallback to defaultHierarchy
      });
    return () => {
      isMounted = false;
    };
  }, [organizationId, backendUser?.id, canReadMenuHierarchy]);

  useEffect(() => {
    void loadActionableCount();
    const refresh = () => { void loadActionableCount(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [organizationId, permissions, loadActionableCount]);

  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
  const showTooltip = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>, label: string) => {
    if (isOpen || window.matchMedia('(max-width: 900px)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
  };
  const navigationPermissions: Partial<Record<AdminSectionType, string>> = {
    residents: 'resident:read', buildings: 'building:read', parking: 'parking:read', visitors: 'visitor:read', amenities: 'amenity:read', complaints: 'complaint:manage', staff: 'staff:read', documents: 'file:read', notices: 'notice:read', reports: 'report:read', audit: 'audit:read', role_master: 'role_master:read',
  };
  const canNavigate = (section?: AdminSectionType) => Boolean(section && (section !== 'organizations' || isSuperAdmin) && (!navigationPermissions[section] || permissions.includes(navigationPermissions[section]!)));

  const renderIcon = (iconName?: string, path?: string) => {
    const key = (iconName || "").toLowerCase();
    const p = (path || "").toLowerCase();

    if (key.includes("overview") || p.includes("overview")) {
      return (
        <svg viewBox="0 0 24 24">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      );
    }
    if (key.includes("building") || p.includes("societ")) {
      return (
        <svg viewBox="0 0 24 24">
          <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01" />
          <path d="M16 6h.01" />
          <path d="M8 10h.01" />
          <path d="M16 10h.01" />
          <path d="M8 14h.01" />
          <path d="M16 14h.01" />
        </svg>
      );
    }
    if (key.includes("parking") || p.includes("parking")) {
      return (
        <svg viewBox="0 0 24 24">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
        </svg>
      );
    }
    if (
      key.includes("shield") ||
      key.includes("visitor") ||
      p.includes("visitor")
    ) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    }
    if (key.includes("amenity") || p.includes("amenities")) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M2 12h20" />
          <path d="M20 12v8H4v-8" />
          <path d="M4 12V4h16v8" />
        </svg>
      );
    }
    if (key.includes("complaint") || p.includes("complaint")) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <line x1="12" y1="12.01" x2="12" y2="18" />
        </svg>
      );
    }
    if (key.includes("staff") || p.includes("staff")) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    }
    if (key.includes("finance") || p.includes("finance")) {
      return (
        <svg viewBox="0 0 24 24">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <circle cx="12" cy="14" r="2" />
        </svg>
      );
    }
    if (key.includes("file") || key.includes("doc") || p.includes("document")) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    }
    if (
      key.includes("bell") ||
      key.includes("notice") ||
      p.includes("notice")
    ) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    }
    if (key.includes("report") || p.includes("report")) {
      return (
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    }
    if (key.includes("audit") || p.includes("audit")) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    }
    if (key.includes("whatsapp") || p.includes("whatsapp")) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    }
    if (key.includes("role") || p.includes("role-master")) {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    }
    if (key.includes("organiz") || p.includes("organization")) {
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  };

  type NavigationItem = { name: string; path: string; icon?: string; section: AdminSectionType };
  const groups: { name: string; items: NavigationItem[] }[] = [];
  if (dynamicHierarchy.length > 0) {
    const visit = (node: MenuMasterItem, inheritedRoles: string[] = []) => {
      if (!node.isActive) return;
      const allowedRoles = node.roleMenus?.map(link => link.role?.name).filter((name): name is string => Boolean(name)) || [];
      if (node.role?.name) allowedRoles.push(node.role.name);
      if ((inheritedRoles.length && !inheritedRoles.some(role => roles.includes(role as any))) || (allowedRoles.length && !allowedRoles.some(role => roles.includes(role as any)))) return;
      const section = menuSection(node);
      if (section && canNavigate(section)) groups.push({ name: '', items: [{ name: node.menuName, path: node.menuPath || `/admin?section=${section}`, icon: node.iconName, section }] });
      const childItems = node.children || [];
      if (childItems.length) {
        const start = groups.length;
        childItems.forEach(child => visit(child, allowedRoles));
        if (groups[start] && !section) groups[start].name = node.menuName;
      }
    };
    dynamicHierarchy.forEach(group => visit(group));
  } else {
    defaultHierarchy.forEach(group => groups.push({ name: group.name, items: group.items.filter(item => canNavigate(item.section)) }));
  }
  const seen = new Set<AdminSectionType>();
  groups.forEach(group => { group.items = group.items.filter(item => { if (seen.has(item.section)) return false; seen.add(item.section); return true; }); });
  const hasConfiguredResidents = (items: MenuMasterItem[]): boolean => items.some(item =>
    menuSection(item) === 'residents' || hasConfiguredResidents(item.children || []),
  );
  const buildingGroup = groups.find(group => group.items.some(item => item.section === 'buildings'));
  // Older saved hierarchies omit this built-in route. Explicit configuration still wins.
  if (buildingGroup && !seen.has('residents') && !hasConfiguredResidents(dynamicHierarchy) && canNavigate('residents')) {
    const residentLink = defaultHierarchy.flatMap(group => group.items).find(item => item.section === 'residents');
    if (residentLink) buildingGroup.items.push(residentLink);
  }
  const residentsItem = groups.flatMap(group => group.items).find(item => item.section === 'residents');
  if (residentsItem && buildingGroup) {
    groups.forEach(group => { group.items = group.items.filter(item => item.section !== 'residents'); });
    buildingGroup.items.splice(buildingGroup.items.findIndex(item => item.section === 'buildings') + 1, 0, residentsItem);
  }

  const staffItem = groups.flatMap(group => group.items).find(item => item.section === 'staff');
  const operationsGroup = buildingGroup || groups.find(group => group.items.some(item => item.section === 'overview'));
  if (staffItem && operationsGroup) {
    groups.forEach(group => { group.items = group.items.filter(item => item.section !== 'staff'); });
    const residentsIndex = operationsGroup.items.findIndex(item => item.section === 'residents');
    operationsGroup.items.splice(residentsIndex >= 0 ? residentsIndex + 1 : Math.min(3, operationsGroup.items.length), 0, staffItem);
  }

  return (
    <aside id="admin-navigation" aria-label="Admin navigation" className={clsx("admin-sidebar", isOpen ? "open" : "closed")}>
      <div className="sidebar-header">
        <div className="brand"><div className="brand-logo">S</div><div className="brand-text"><h1>SocietyOS</h1><span>{society.name}</span></div></div>
      </div>
      <nav className="sidebar-nav" onScroll={() => setTooltip(null)}>
        {groups.filter(group => group.items.length).map((group, index) => (
          <React.Fragment key={`${group.name}-${index}`}>
            {group.name && <div className="nav-heading">{group.name}</div>}
            {group.items.map(item => {
              const count = item.section === 'complaints' ? openComplaintsCount : item.section === 'visitors' ? activeVisitorsCount : 0;
              return <a key={item.section} href={adminSectionHref(item.section)}
                className={clsx('sidebar-link', currentSection === item.section && 'active')}
                aria-current={currentSection === item.section ? 'page' : undefined}
                aria-label={count > 0 && item.section === 'complaints' ? `${item.name}, ${count} unresolved complaints` : item.name}
                aria-describedby={tooltip?.label === item.name ? 'admin-navigation-tooltip' : undefined}
                onMouseEnter={event => showTooltip(event, item.name)} onMouseLeave={() => setTooltip(null)}
                onFocus={event => showTooltip(event, item.name)} onBlur={() => setTooltip(null)}
                onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); setTooltip(null); onSectionChange(item.section); }}>
                {renderIcon(item.icon, item.path)}<span className="sidebar-link-label">{item.name}</span>
                {count > 0 && <span className={clsx('link-badge', item.section === 'complaints' && 'complaint-badge')} aria-label={`${count} unresolved ${item.section === 'complaints' ? 'complaints' : 'visitors'}`}>{count > 9 ? '9+' : count}</span>}
              </a>;
            })}
          </React.Fragment>
        ))}
      </nav>
      {tooltip && !isOpen && createPortal(<div id="admin-navigation-tooltip" role="tooltip" className="sidebar-tooltip" style={{ top: tooltip.top, left: tooltip.left }}>{tooltip.label}</div>, document.body)}

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">{adminInitials}</div>
          <div className="user-info">
            <div className="user-name" title={adminFullName}>
              {adminFullName}
            </div>
            <div className="user-role">{adminRoleDisplay}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
