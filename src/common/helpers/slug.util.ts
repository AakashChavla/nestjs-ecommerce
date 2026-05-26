export function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function generateUniqueSlug<T extends { id?: string }>(
  base: string,
  existsFn: (candidate: string) => Promise<T | null>,
  excludeId?: string,
): Promise<string> {
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await existsFn(candidate);
    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
