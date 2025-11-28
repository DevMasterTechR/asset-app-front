export function extractArray<T>(res: any): T[] {
  if (!res) return [];
  return Array.isArray(res) ? res as T[] : (res && Array.isArray(res.data) ? res.data as T[] : []);
}

export function isPaginated(res: any): boolean {
  return !!(res && typeof res === 'object' && Array.isArray(res.data));
}
