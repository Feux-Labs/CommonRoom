import { Redis } from '@upstash/redis';

export const PROFILE_CACHE_TTL_SECONDS = 24 * 60 * 60;

export type CachedProfile = {
  id: string;
  display_name: string;
  username: string | null;
  education_status: string;
  school: string | null;
  show_school_on_profile: boolean;
  course: string;
  year: string;
  age_eligibility_confirmed: boolean;
  interests: string[];
};

type CacheStatus = 'hit' | 'miss' | 'stored' | 'bypassed' | 'unavailable';
type CacheRead = { value: CachedProfile | null; status: CacheStatus };

let redisClient: Redis | null = null;
let redisConfigurationChecked = false;
let redisConfigured = false;

function getRedisClient() {
  if (!redisConfigurationChecked) {
    redisConfigurationChecked = true;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    redisConfigured = Boolean(url && token);
    if (Boolean(url) !== Boolean(token)) {
      console.error('[cache] Upstash configuration is incomplete; expected both REST URL and REST token.');
    }
  }
  if (!redisConfigured) return null;
  redisClient ??= Redis.fromEnv();
  return redisClient;
}

function profileKey(userId: string) {
  return `commonroom:profile:v1:${userId}`;
}

export async function readProfileCache(userId: string): Promise<CacheRead> {
  const redis = getRedisClient();
  if (!redis) return { value: null, status: 'bypassed' };

  try {
    const value = await redis.get<CachedProfile>(profileKey(userId));
    return { value, status: value ? 'hit' : 'miss' };
  } catch (error) {
    console.error('[cache] Upstash profile read failed; falling back to Supabase.', error);
    return { value: null, status: 'unavailable' };
  }
}

export async function writeProfileCache(profile: CachedProfile): Promise<Extract<CacheStatus, 'stored' | 'bypassed' | 'unavailable'>> {
  const redis = getRedisClient();
  if (!redis) return 'bypassed';

  try {
    await redis.set(profileKey(profile.id), profile, { ex: PROFILE_CACHE_TTL_SECONDS });
    return 'stored';
  } catch (error) {
    console.error('[cache] Upstash profile write failed; Supabase remains the source of truth.', error);
    return 'unavailable';
  }
}
