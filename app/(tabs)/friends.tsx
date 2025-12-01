import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { useStore } from '@/lib/store';
import {
  getFriends,
  getPendingRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  sendNudge,
  hasFriendWorkedOutToday,
  generateInviteLink,
  getProfile,
} from '@/lib/friends';
import { Profile, FriendWithProfile } from '@/lib/supabase';
import Colors from '@/constants/Colors';

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const session = useStore((state) => state.session);
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [requests, setRequests] = useState<FriendWithProfile[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [friendWorkoutStatus, setFriendWorkoutStatus] = useState<Record<string, boolean>>({});
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const [friendsData, requestsData, profileData] = await Promise.all([
        getFriends(session.user.id),
        getPendingRequests(session.user.id),
        getProfile(session.user.id),
      ]);

      setFriends(friendsData);
      setRequests(requestsData);
      setMyProfile(profileData);

      // Check workout status for each friend
      const statusMap: Record<string, boolean> = {};
      for (const f of friendsData) {
        const friendId = f.user_id === session.user.id ? f.friend_id : f.user_id;
        statusMap[friendId] = await hasFriendWorkedOutToday(friendId);
      }
      setFriendWorkoutStatus(statusMap);
    } catch (error) {
      console.error('Error fetching friends data:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    loadData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSearch = async () => {
    if (!session?.user?.id || searchQuery.length < 2) return;

    setSearching(true);
    const results = await searchUsers(searchQuery, session.user.id);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSendRequest = async (toUserId: string) => {
    if (!session?.user?.id) return;

    const result = await sendFriendRequest(session.user.id, toUserId);
    if (result) {
      Alert.alert('Success', 'Friend request sent!');
      setSearchResults((prev) => prev.filter((u) => u.id !== toUserId));
    } else {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const success = await acceptFriendRequest(friendshipId);
    if (success) {
      await fetchData();
      Alert.alert('Success', 'Friend request accepted!');
    }
  };

  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    Alert.alert('Remove Friend', `Remove ${name} from friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const success = await removeFriend(friendshipId);
          if (success) {
            await fetchData();
          }
        },
      },
    ]);
  };

  const handleNudge = async (friendId: string, friendName: string) => {
    if (!session?.user?.id) return;

    const result = await sendNudge(session.user.id, friendId);
    if (result) {
      Alert.alert('Nudged!', `${friendName} has been reminded to workout! 💪`);
    }
  };

  const handleShareInvite = async () => {
    if (!myProfile?.username) {
      Alert.alert('Set Username', 'Please set a username in your profile first');
      return;
    }

    const link = generateInviteLink(myProfile.username);
    try {
      await Share.share({
        message: `Add me as a friend on Pushups Tracker! My username is: ${myProfile.username}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getFriendProfile = (friendship: FriendWithProfile): Profile | undefined => {
    return friendship.user_id === session?.user?.id
      ? friendship.friend_profile
      : friendship.user_profile;
  };

  const getFriendId = (friendship: FriendWithProfile): string => {
    return friendship.user_id === session?.user?.id
      ? friendship.friend_id
      : friendship.user_id;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests {requests.length > 0 && `(${requests.length})`}
          </Text>
          {requests.length > 0 && <View style={styles.badge} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Friends List */}
      {activeTab === 'friends' && (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const friendProfile = getFriendProfile(item);
            const friendId = getFriendId(item);
            const hasWorkedOut = friendWorkoutStatus[friendId];

            return (
              <View style={styles.friendCard}>
                <View style={styles.friendInfo}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.avatarText}>
                      {friendProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                    <View
                      style={[
                        styles.workoutIndicator,
                        hasWorkedOut ? styles.workedOut : styles.notWorkedOut,
                      ]}
                    />
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>
                      {friendProfile?.display_name || 'Unknown'}
                    </Text>
                    <Text style={styles.friendLevel}>
                      Level {friendProfile?.level || 1} • {friendProfile?.xp || 0} XP
                    </Text>
                  </View>
                </View>
                <View style={styles.friendActions}>
                  {!hasWorkedOut && (
                    <TouchableOpacity
                      style={styles.nudgeButton}
                      onPress={() =>
                        handleNudge(friendId, friendProfile?.display_name || 'Friend')
                      }
                    >
                      <Ionicons name="notifications" size={20} color={Colors.dark.warning} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>
                      handleRemoveFriend(item.id, friendProfile?.display_name || 'Friend')
                    }
                  >
                    <Ionicons name="close" size={20} color={Colors.dark.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.dark.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={Colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>No Friends Yet</Text>
              <Text style={styles.emptyText}>
                Add friends to compete and motivate each other!
              </Text>
              <TouchableOpacity style={styles.inviteButton} onPress={handleShareInvite}>
                <Ionicons name="share-outline" size={20} color={Colors.dark.text} />
                <Text style={styles.inviteButtonText}>Share Invite</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Requests List */}
      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const requesterProfile = item.user_profile;

            return (
              <View style={styles.requestCard}>
                <View style={styles.friendInfo}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.avatarText}>
                      {requesterProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>
                      {requesterProfile?.display_name || 'Unknown'}
                    </Text>
                    <Text style={styles.friendLevel}>
                      Level {requesterProfile?.level || 1}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(item.id)}
                  >
                    <Ionicons name="checkmark" size={24} color={Colors.dark.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => removeFriend(item.id)}
                  >
                    <Ionicons name="close" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Pending Requests</Text>
            </View>
          }
        />
      )}

      {/* Search */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={Colors.dark.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor={Colors.dark.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={Colors.dark.accent} />}
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareInviteButton} onPress={handleShareInvite}>
            <Ionicons name="share-outline" size={20} color={Colors.dark.accent} />
            <Text style={styles.shareInviteText}>Share Invite Link</Text>
          </TouchableOpacity>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.searchResultCard}>
                <View style={styles.friendInfo}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.avatarText}>
                      {item.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{item.display_name || item.username}</Text>
                    <Text style={styles.friendLevel}>Level {item.level}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleSendRequest(item.id)}
                >
                  <Ionicons name="person-add" size={20} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.searchResultsContent}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: Colors.dark.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  activeTabText: {
    color: Colors.dark.background,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.accent,
  },
  workoutIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.dark.surface,
  },
  workedOut: {
    backgroundColor: Colors.dark.success,
  },
  notWorkedOut: {
    backgroundColor: Colors.dark.textMuted,
  },
  friendDetails: {
    gap: 2,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  friendLevel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  nudgeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  searchContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark.text,
  },
  searchButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  shareInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  shareInviteText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.accent,
  },
  searchResultsContent: {
    gap: 12,
  },
  searchResultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


