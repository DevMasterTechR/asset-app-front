export const sortByString = <T,>(arr: T[], selector: (item: T) => string) => {
  return arr.slice().sort((a, b) => selector(a).localeCompare(selector(b), 'es', { sensitivity: 'base' }));
};

export const sortPeopleByName = <T extends { firstName?: string; lastName?: string }>(arr: T[]) => {
  return arr.slice().sort((a, b) => {
    const aKey = `${(a.lastName || '').toLowerCase()} ${(a.firstName || '').toLowerCase()}`.trim();
    const bKey = `${(b.lastName || '').toLowerCase()} ${(b.firstName || '').toLowerCase()}`.trim();
    return aKey.localeCompare(bKey, 'es', { sensitivity: 'base' });
  });
};

export const sortBranchesByName = <T extends { name?: string }>(arr: T[]) => sortByString(arr, (i) => (i.name || '').toString());

export const sortAssetsByName = <T extends { name?: string; code?: string }>(arr: T[]) => {
  return arr.slice().sort((a, b) => {
    const aName = (a.name || a.code || '').toString();
    const bName = (b.name || b.code || '').toString();
    return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
  });
};
