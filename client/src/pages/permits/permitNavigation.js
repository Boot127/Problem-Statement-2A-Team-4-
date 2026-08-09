const DEFAULT_LIST_HREF = '/permits';

function safeListHref(value) {
  return typeof value === 'string' && (value === '/permits' || value.startsWith('/permits?'))
    ? value
    : DEFAULT_LIST_HREF;
}

export function getPermitNavigation(location) {
  const state = location?.state || {};
  return {
    listHref: safeListHref(state.permitListHref),
    groupHref:
      typeof state.permitGroupHref === 'string' && state.permitGroupHref.startsWith('/permits/groups/')
        ? state.permitGroupHref
        : '',
    groupName: typeof state.permitGroupName === 'string' ? state.permitGroupName : '',
  };
}

export function permitNavigationState(location, overrides = {}) {
  const navigation = getPermitNavigation(location);
  return {
    permitListHref: navigation.listHref,
    ...(navigation.groupHref && { permitGroupHref: navigation.groupHref }),
    ...(navigation.groupName && { permitGroupName: navigation.groupName }),
    ...overrides,
  };
}

export function permitBreadcrumbItems(permit, location, currentLabel) {
  const navigation = getPermitNavigation(location);
  const items = [
    { label: 'Dashboard', href: '/' },
    { label: 'Work Permits', href: navigation.listHref },
  ];
  if (navigation.groupHref && navigation.groupName) {
    items.push({ label: 'Permit Groups', href: `${navigation.listHref}#permit-groups-heading` });
    items.push({
      label: navigation.groupName,
      href: navigation.groupHref,
      state: permitNavigationState(location),
    });
  }
  items.push({
    label: permit.title,
    ...(currentLabel && {
      href: `/permits/${permit.id}`,
      state: permitNavigationState(location),
    }),
  });
  if (currentLabel) items.push({ label: currentLabel });
  return items;
}

export function permitOverviewBack(location) {
  const navigation = getPermitNavigation(location);
  return navigation.groupHref && navigation.groupName
    ? {
        label: `Back to ${navigation.groupName}`,
        href: navigation.groupHref,
        state: permitNavigationState(location),
      }
    : { label: 'Back to Work Permits', href: navigation.listHref };
}
