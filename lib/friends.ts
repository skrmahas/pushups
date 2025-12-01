import { Friendship, FriendWithProfile, Nudge, Profile, supabase } from './supabase';

/**
 * Get user's profile, creating it if it doesn't exist
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // Profile doesn't exist, try to create it
    if (error.code === 'PGRST116') {
      return await ensureProfileExists(userId);
    }
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Ensure a profile exists for the user
 */
export async function ensureProfileExists(userId: string): Promise<Profile | null> {
  console.log('Ensuring profile exists for user:', userId);
  
  // Get user info from auth
  const { data: { user } } = await supabase.auth.getUser();
  
  const displayName = user?.user_metadata?.name || 
                      user?.user_metadata?.full_name || 
                      user?.email?.split('@')[0] || 
                      'User';

  console.log('Creating profile with display name:', displayName);

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: displayName,
      username: null,
      xp: 0,
      level: 1,
      total_pushups: 0,
      total_workouts: 0,
      current_streak: 0,
      longest_streak: 0,
    }, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    console.error('Error details:', error.message, error.details, error.code);
    return null;
  }

  console.log('Profile created/updated successfully:', data.id);
  return data;
}

/**
 * Update user's profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  // First ensure profile exists
  await ensureProfileExists(userId);
  
  // Check if username is being set and if it's available
  if (updates.username) {
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', updates.username.toLowerCase())
      .neq('id', userId)
      .single();
    
    if (existingUser) {
      console.error('Username already taken');
      return null;
    }
    
    updates.username = updates.username.toLowerCase();
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
}

/**
 * Search users by username
 */
export async function searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUserId)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's friends (accepted friendships)
 */
export async function getFriends(userId: string): Promise<FriendWithProfile[]> {
  // Get friendships where user is either the requester or the friend
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      friend_profile:profiles!friendships_friend_id_fkey(*),
      user_profile:profiles!friendships_user_id_fkey(*)
    `)
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching friends:', error);
    return [];
  }

  return data || [];
}

/**
 * Get pending friend requests (received)
 */
export async function getPendingRequests(userId: string): Promise<FriendWithProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      user_profile:profiles!friendships_user_id_fkey(*)
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  return data || [];
}

/**
 * Send friend request
 */
export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<Friendship | null> {
  // Check if friendship already exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${fromUserId},friend_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_id.eq.${fromUserId})`)
    .single();

  if (existing) {
    console.log('Friendship already exists');
    return existing;
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({
      user_id: fromUserId,
      friend_id: toUserId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending friend request:', error);
    return null;
  }

  // Create notification for the recipient
  await supabase.from('notifications').insert({
    user_id: toUserId,
    type: 'friend_request',
    title: 'New Friend Request',
    body: 'Someone wants to be your friend!',
    data: { from_user_id: fromUserId, friendship_id: data.id },
  });

  return data;
}

/**
 * Accept friend request
 */
export async function acceptFriendRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);

  if (error) {
    console.error('Error accepting friend request:', error);
    return false;
  }

  return true;
}

/**
 * Decline/remove friend
 */
export async function removeFriend(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    console.error('Error removing friend:', error);
    return false;
  }

  return true;
}

/**
 * Send nudge to friend
 */
export async function sendNudge(
  fromUserId: string,
  toUserId: string,
  message?: string
): Promise<Nudge | null> {
  // Check if already nudged today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: existingNudge } = await supabase
    .from('nudges')
    .select('*')
    .eq('from_user_id', fromUserId)
    .eq('to_user_id', toUserId)
    .gte('created_at', today.toISOString())
    .single();

  if (existingNudge) {
    console.log('Already nudged today');
    return existingNudge;
  }

  const { data, error } = await supabase
    .from('nudges')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message: message || 'Time to do some pushups! 💪',
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending nudge:', error);
    return null;
  }

  // Get sender's profile for notification
  const senderProfile = await getProfile(fromUserId);

  // Create notification
  await supabase.from('notifications').insert({
    user_id: toUserId,
    type: 'nudge',
    title: `${senderProfile?.display_name || 'A friend'} nudged you!`,
    body: message || 'Time to do some pushups! 💪',
    data: { from_user_id: fromUserId, nudge_id: data.id },
  });

  return data;
}

/**
 * Get nudges received today
 */
export async function getTodayNudges(userId: string): Promise<Nudge[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('nudges')
    .select(`
      *,
      from_profile:profiles!nudges_from_user_id_fkey(*)
    `)
    .eq('to_user_id', userId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching nudges:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark nudge as read
 */
export async function markNudgeAsRead(nudgeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('nudges')
    .update({ read_at: new Date().toISOString() })
    .eq('id', nudgeId);

  if (error) {
    console.error('Error marking nudge as read:', error);
    return false;
  }

  return true;
}

/**
 * Check if friend has worked out today
 */
export async function hasFriendWorkedOutToday(friendId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', friendId)
    .gte('created_at', today.toISOString())
    .limit(1);

  if (error) {
    console.error('Error checking friend workout:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Generate invite link (using username)
 */
export function generateInviteLink(username: string): string {
  return `pushups://add-friend/${username}`;
}

