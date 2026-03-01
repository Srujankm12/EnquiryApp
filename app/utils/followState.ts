import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;
const FOLLOW_CACHE_KEY = 'followed_company_ids';

/**
 * Safely extract an array from various response formats.
 * Backend sends: {"message": "...", "followings": [...]}
 * Handles null, undefined, and nested data wrappers.
 */
const extractFollowings = (responseData: any): any[] => {
  if (!responseData) return [];

  // Direct format: {"followings": [...]}
  const fromDirect = responseData.followings;
  if (Array.isArray(fromDirect)) return fromDirect;

  // Nested format: {"data": {"followings": [...]}}
  const fromNested = responseData.data?.followings;
  if (Array.isArray(fromNested)) return fromNested;

  // Fallback: {"data": [...]}
  const fromData = responseData.data;
  if (Array.isArray(fromData)) return fromData;

  return [];
};

/**
 * Extract business IDs from a followings array.
 * Handles different field names the backend might use.
 */
const extractIds = (followings: any[]): Set<string> => {
  return new Set<string>(
    followings
      .map((f: any) => {
        const id = f.following_id ?? f.business_id ?? f.id ?? '';
        return String(id);
      })
      .filter((id: string) => id !== '' && id !== 'undefined' && id !== 'null')
  );
};

/**
 * Get cached followed company IDs from local storage.
 */
export const getCachedFollowedIds = async (): Promise<Set<string>> => {
  try {
    const cached = await AsyncStorage.getItem(FOLLOW_CACHE_KEY);
    if (cached) {
      const ids: string[] = JSON.parse(cached);
      return new Set(ids.filter((id) => id !== '' && id !== 'undefined' && id !== 'null'));
    }
  } catch (e) {
    console.warn('[FollowState] Error reading cache:', e);
  }
  return new Set();
};

/**
 * Save followed company IDs to local storage.
 */
export const saveCachedFollowedIds = async (ids: Set<string>): Promise<void> => {
  try {
    await AsyncStorage.setItem(FOLLOW_CACHE_KEY, JSON.stringify([...ids]));
  } catch (e) {
    console.warn('[FollowState] Error saving cache:', e);
  }
};

/**
 * Fetch followed company IDs from the backend for a given user.
 * Uses backend as source of truth when it returns valid data,
 * falls back to cache when backend fails or returns empty.
 */
export const fetchFollowedCompanyIds = async (
  userId: string,
  token: string
): Promise<Set<string>> => {
  const cachedIds = await getCachedFollowedIds();

  try {
    const headers = { Authorization: `Bearer ${token}` };
    const res = await axios.get(
      `${API_URL}/follower/get/followings/${userId}`,
      { headers }
    );

    const followings = extractFollowings(res.data);
    const backendIds = extractIds(followings);

    if (backendIds.size > 0) {
      // Backend returned valid data - use it as source of truth
      await saveCachedFollowedIds(backendIds);
      return backendIds;
    }

    // Backend returned empty - could be genuinely empty or a backend issue.
    // If cache also has nothing, save empty and return empty.
    if (cachedIds.size === 0) {
      await saveCachedFollowedIds(new Set());
      return new Set();
    }

    // Cache has data but backend returned empty.
    // Trust the backend (user may have unfollowed elsewhere).
    await saveCachedFollowedIds(new Set());
    return new Set();
  } catch (error: any) {
    console.warn(
      '[FollowState] Failed to fetch followings from backend, using cache. Error:',
      error?.response?.status,
      error?.response?.data || error?.message
    );
    // Return cached data when backend fails
    return cachedIds;
  }
};

/**
 * Check if a user is following a specific business.
 */
export const isFollowingBusiness = async (
  userId: string,
  businessId: string,
  token: string
): Promise<boolean> => {
  const followedIds = await fetchFollowedCompanyIds(userId, token);
  return followedIds.has(String(businessId));
};

/**
 * Update the local cache after a follow action.
 */
export const addFollowToCache = async (businessId: string): Promise<void> => {
  const ids = await getCachedFollowedIds();
  ids.add(String(businessId));
  await saveCachedFollowedIds(ids);
};

/**
 * Update the local cache after an unfollow action.
 */
export const removeFollowFromCache = async (businessId: string): Promise<void> => {
  const ids = await getCachedFollowedIds();
  ids.delete(String(businessId));
  await saveCachedFollowedIds(ids);
};
