export type LocationSuggestion = {
  id: string;
  name: string;
  detail: string;
  isCustom?: boolean;
};

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const results: LocationSuggestion[] = [];

  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=5`);
    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features)) {
        for (const f of data.features) {
          const p = f.properties || {};
          const name = p.name || p.street || trimmed;
          const detail = [p.city, p.state, p.country].filter(Boolean).join(', ');
          results.push({
            id: `photon-${f.properties.osm_id || Math.random()}`,
            name,
            detail: detail || 'Location',
          });
        }
      }
    }
  } catch {
    // Network fallback
  }

  // Always append custom location choice
  results.push({
    id: `custom-${Date.now()}`,
    name: trimmed,
    detail: 'Use custom location',
    isCustom: true,
  });

  return results;
}
