import { apiError, apiSuccess } from '@/lib/supabase-server';

type PhotonFeature = {
  properties?: {
    name?: unknown;
    street?: unknown;
    district?: unknown;
    city?: unknown;
    state?: unknown;
    country?: unknown;
    osm_type?: unknown;
    osm_id?: unknown;
  };
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 120) {
    return apiError('invalid_location_query', 'Enter between 2 and 120 characters to search for a location.', 422);
  }

  const endpoint = new URL('https://photon.komoot.io/api/');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('limit', '6');

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      return apiError('location_search_unavailable', 'Location suggestions are temporarily unavailable.', 503);
    }

    const payload = await response.json() as { features?: PhotonFeature[] };
    const suggestions = (Array.isArray(payload.features) ? payload.features : [])
      .flatMap((feature, index) => {
        const properties = feature.properties ?? {};
        const name = text(properties.name) || text(properties.street) || text(properties.city);
        if (!name) return [];
        const detail = [properties.city, properties.state, properties.country]
          .map(text)
          .filter((part, partIndex, parts) => part && part !== name && parts.indexOf(part) === partIndex)
          .join(', ');
        const identifier = `${text(properties.osm_type)}-${String(properties.osm_id ?? index)}`;
        return [{ id: identifier, name, detail, label: [name, detail].filter(Boolean).join(', ') }];
      });

    return apiSuccess(suggestions);
  } catch {
    return apiError('location_search_unavailable', 'Location suggestions are temporarily unavailable. You can still use the location you typed.', 503);
  }
}
