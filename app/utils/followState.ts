import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;
const FOLLOW_CACHE_KEY = 'followed_company_ids';

/**
 * Get cached followed company IDs from local storage.
 */
export const getCachedFollowedIds = async (): Promise<Set<string>> => {
  try {
    const cached = await AsyncStorage.getItem(FOLLOW_CACHE_KEY);
    if (cached) {
      const ids: string[] = JSON.parse(cached);
      return new Set(ids);
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
 * Merges with local cache: uses backend as source of truth when available,
 * falls back to cache when backend fails.
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

    // Try all possible response formats
    const responseData = res.data;
    const followings =
      responseData?.data?.followings ||
      responseData?.followings ||
      responseData?.data ||
      [];

    if (!Array.isArray(followings)) {
      console.warn('[FollowState] Unexpected followings format:', typeof followings, JSON.stringify(responseData).substring(0, 200));
      return cachedIds;
    }

    const ids = new Set<string>(
      followings.map(
        (f: any) => String(f.following_id || f.business_id || f.id || '')
      ).filter((id: string) => id !== '')
    );

    // Save the fresh data to cache
    await saveCachedFollowedIds(ids);
    return ids;
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
