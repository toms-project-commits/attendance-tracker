'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Bell, 
  UserPlus,
  Loader2,
  TrendingUp,
  UserMinus,
  BarChart3
} from 'lucide-react';
import { clsx } from 'clsx';

type Friend = {
  friendship_id: string;
  friend_id: string;
  friend_username: string;
  friend_full_name: string | null;
  created_at: string;
};

export default function FriendsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Load friends list
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends_with_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (friendsError) {
        console.error('Error loading friends:', friendsError);
      } else {
        setFriends(friendsData || []);
      }

      // Load pending requests count
      const { count, error: countError } = await supabase
        .from('friendship_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      if (!countError) {
        setPendingCount(count || 0);
      }

    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUnfriend = async (friendshipId: string, friendUsername: string) => {
    if (!confirm(`Remove ${friendUsername} from your friends?`)) return;

    setRemovingFriendId(friendshipId);

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      setFriends(prev => prev.filter(f => f.friendship_id !== friendshipId));
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend. Please try again.');
    } finally {
      setRemovingFriendId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <Loader2 className="animate-spin mx-auto mb-3 text-black" size={40} />
          <p className="font-black text-black text-lg">Loading Friends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white p-4 sticky top-0 z-40 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className={clsx(
                  "p-3 border-[3px] border-black bg-white",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:bg-slate-700 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                <ArrowLeft size={20} className="text-black dark:text-white" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-black dark:text-white flex items-center gap-2">
                  <Users size={28} />
                  Friends
                </h1>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Link
                href="/friends/requests"
                className={clsx(
                  "relative p-3 border-[3px] border-black bg-white",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:bg-slate-700 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
                title="View Requests"
              >
                <Bell size={20} className="text-black dark:text-white" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-[2px] border-black dark:border-white text-white text-xs font-black flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Link>

              <Link
                href="/friends/search"
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 border-[3px] border-black bg-blue-500 text-white font-black",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                <Search size={18} />
                <span className="hidden sm:inline">Find Friends</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border-[3px] border-black bg-blue-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
            <div className="flex items-center gap-2 mb-2">
              <Users size={20} className="text-black" />
              <span className="text-xs font-black uppercase text-black">Friends</span>
            </div>
            <div className="text-4xl font-black text-black">{friends.length}</div>
          </div>

          <div className="border-[3px] border-black bg-orange-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={20} className="text-black" />
              <span className="text-xs font-black uppercase text-black">Pending</span>
            </div>
            <div className="text-4xl font-black text-black">{pendingCount}</div>
          </div>

          <div className="border-[3px] border-black bg-green-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-black" />
              <span className="text-xs font-black uppercase text-black">Connected</span>
            </div>
            <div className="text-4xl font-black text-black">{friends.length > 0 ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* FRIENDS LIST */}
        <div>
          <h2 className="text-xl font-black text-black dark:text-white mb-4 flex items-center gap-2">
            <Users size={24} />
            Your Friends
          </h2>

          {friends.length === 0 ? (
            <div className="border-[3px] border-black border-dashed bg-white dark:bg-slate-800 p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <div className="w-16 h-16 bg-blue-500 border-[3px] border-black dark:border-white mx-auto mb-4 flex items-center justify-center">
                <UserPlus size={32} className="text-white" />
              </div>
              <p className="text-xl font-black text-black dark:text-white mb-2">No friends yet</p>
              <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-6">
                Start connecting with other students to compare attendance!
              </p>
              <Link
                href="/friends/search"
                className={clsx(
                  "inline-flex items-center gap-2 px-6 py-3 border-[3px] border-black bg-blue-500 text-white font-black",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                <Search size={18} />
                Find Friends
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.friendship_id}
                  className={clsx(
                    "border-[3px] border-black bg-white dark:bg-slate-800 p-5",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 border-[3px] border-black dark:border-white bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-lg font-black text-white">
                          {friend.friend_full_name
                            ? friend.friend_full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : friend.friend_username.slice(0, 2).toUpperCase()
                          }
                        </span>
                      </div>

                      {/* Info */}
                      <div>
                        <h3 className="font-black text-lg text-black dark:text-white">
                          {friend.friend_full_name || friend.friend_username}
                        </h3>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                          @{friend.friend_username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/friends/attendance?id=${friend.friend_id}`}
                      className={clsx(
                        "flex-1 py-2 px-3 border-[3px] border-black bg-blue-500 text-white font-black text-sm text-center",
                        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                        "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                        "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                        "transition-all duration-150",
                        "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                        "flex items-center justify-center gap-2"
                      )}
                    >
                      <BarChart3 size={16} />
                      View Stats
                    </Link>

                    <button
                      onClick={() => handleUnfriend(friend.friendship_id, friend.friend_username)}
                      disabled={removingFriendId === friend.friendship_id}
                      className={clsx(
                        "py-2 px-3 border-[3px] border-black bg-red-100 text-red-600 font-black text-sm",
                        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                        "hover:bg-red-500 hover:text-white hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                        "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                        "transition-all duration-150",
                        "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "flex items-center justify-center gap-1"
                      )}
                      title="Remove Friend"
                    >
                      {removingFriendId === friend.friendship_id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <UserMinus size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
