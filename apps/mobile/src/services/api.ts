import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const API_PREFIX = '/api/v1';
let supabaseClient: ReturnType<typeof createClient> | null = null;

type ApiOptions = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit;
  token?: string;
};

type ApiFailure = {
  error?: {
    message?: string;
  };
};

type ApiEnvelope<T> = { data: T };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function requiredEnvironment(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
  const value = name === 'EXPO_PUBLIC_SUPABASE_URL'
    ? process.env.EXPO_PUBLIC_SUPABASE_URL
    : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new ApiError(`Missing ${name}. Configure Supabase for the mobile app.`, 0);
  return value;
}

export function getMobileSupabase() {
  if (supabaseClient) return supabaseClient;
  supabaseClient = createClient(
    requiredEnvironment('EXPO_PUBLIC_SUPABASE_URL'),
    requiredEnvironment('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage,
      },
    },
  );
  return supabaseClient;
}

export async function getAnonymousAccessToken() {
  const supabase = getMobileSupabase();
  const { data: current, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new ApiError(`Your session could not be loaded: ${sessionError.message}`, 401);
  if (current.session) return current.session.access_token;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new ApiError(`Anonymous access could not be started: ${error.message}`, 503);
  if (!data.session) throw new ApiError('Anonymous access did not return a session. Please try again.', 503);
  return data.session.access_token;
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!configuredUrl) throw new ApiError('Missing EXPO_PUBLIC_API_BASE_URL. Configure the deployed Next.js URL.', 0);
  return `${configuredUrl.replace(/\/+$/, '')}${API_PREFIX}`;
}

export async function apiRequest<TResponse>(path: string, options: ApiOptions = {}): Promise<TResponse> {
  const { token, headers: requestHeaders, ...requestOptions } = options;
  const { data: { session } } = await getMobileSupabase().auth.getSession();
  const accessToken = token ?? session?.access_token;
  if (!accessToken) throw new ApiError('Sign in to continue.', 401);

  const headers = new Headers(requestHeaders);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (requestOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestOptions,
    headers,
  });
  const result = await response.json().catch(() => null) as ApiEnvelope<TResponse> | ApiFailure | null;

  if (!response.ok) {
    const failure = result as ApiFailure | null;
    throw new ApiError(failure?.error?.message ?? `Request failed with status ${response.status}.`, response.status);
  }
  if (!result || typeof result !== 'object' || !('data' in result)) {
    throw new ApiError('The API returned an invalid response.', response.status);
  }
  return result.data;
}

export async function uploadPostMedia(uri: string, mediaType: 'photo' | 'video') {
  const supabase = getMobileSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new ApiError('Sign in before uploading media.', 401);

  const mediaResponse = await fetch(uri);
  if (!mediaResponse.ok) throw new ApiError('The selected media could not be read from this device.', mediaResponse.status);
  const mediaBlob = await mediaResponse.blob();
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
  const objectPath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { data, error } = await supabase.storage.from('post-media').upload(objectPath, mediaBlob, {
    contentType: mediaBlob.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
    upsert: false,
  });
  if (error) throw new ApiError(`Media upload failed: ${error.message}`, 500);

  const { data: publicUrl } = supabase.storage.from('post-media').getPublicUrl(data.path);
  return { uri: publicUrl.publicUrl, mediaType };
}
