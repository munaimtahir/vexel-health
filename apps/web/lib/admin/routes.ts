export const adminRoutes = {
  dashboard: '/admin',
  businessOverview: '/admin/business',
  businessBranding: '/admin/business/branding',
  businessReportDesign: '/admin/business/report-design',
  businessReceiptDesign: '/admin/business/receipt-design',
  usersList: '/admin/users',
  usersInvite: '/admin/users/invite',
  userDetail: (userId: string) => `/admin/users/${userId}`,
  catalogOverview: '/admin/catalog',
  catalogTests: '/admin/catalog/tests',
  catalogTestDetail: (testId: string) => `/admin/catalog/tests/${testId}`,
  catalogParameters: '/admin/catalog/parameters',
  catalogParameterDetail: (parameterId: string) => `/admin/catalog/parameters/${parameterId}`,
  catalogPanels: '/admin/catalog/panels',
  catalogPanelDetail: (panelId: string) => `/admin/catalog/panels/${panelId}`,
  catalogLinking: '/admin/catalog/linking',
  catalogImportExport: '/admin/catalog/import-export',
} as const;

export type AdminNavItem = {
  label: string;
  href: string;
  /** When set, nav link is shown only when this feature flag is enabled (GET /me/features). */
  featureKey?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    label: 'Dashboard',
    items: [{ label: 'Dashboard', href: adminRoutes.dashboard }],
  },
  {
    label: 'Business',
    items: [
      { label: 'Business Overview', href: adminRoutes.businessOverview },
      { label: 'Branding', href: adminRoutes.businessBranding },
      { label: 'Report Design', href: adminRoutes.businessReportDesign },
      { label: 'Receipt Design', href: adminRoutes.businessReceiptDesign },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'Users List', href: adminRoutes.usersList },
      { label: 'Invite User', href: adminRoutes.usersInvite },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Catalog Overview', href: adminRoutes.catalogOverview },
      { label: 'Tests', href: adminRoutes.catalogTests },
      { label: 'Parameters', href: adminRoutes.catalogParameters },
      { label: 'Panels', href: adminRoutes.catalogPanels },
      { label: 'Linking', href: adminRoutes.catalogLinking },
      { label: 'Import/Export', href: adminRoutes.catalogImportExport },
    ],
  },
];
