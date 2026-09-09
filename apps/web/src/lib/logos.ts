// Resolves an airline logo filename (from the API) to a bundled asset URL.
// Vite's import.meta.glob picks up every SVG in assets/logos at build time.
const files = import.meta.glob<string>('../assets/logos/*.svg', { eager: true, query: '?url', import: 'default' });

const byName = new Map(Object.entries(files).map(([path, url]) => [path.split('/').pop()!, url]));

/** Returns the bundled URL for a logo filename, or undefined when we have no asset. */
export function logoUrl(filename: string): string | undefined {
  return byName.get(filename);
}

/** Amadeus brand mark used in the app header. */
export const AMADEUS_LOGO = byName.get('amadeus.svg');
