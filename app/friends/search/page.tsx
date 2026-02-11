'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Search, UserPlus, Loader2, CheckCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

type SearchResult = {
  id: string;
  username: string;
  full_name: string | null;
  is_friend: boolean;
  request_status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
};

export default function FriendsSearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setHasSearched(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Escape LIKE/ILIKE wildcards to prevent pattern injection
      const sanitized = searchQuery.trim()
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');

      // Search for users by username (case-insensitive partial match)
      const { data: users, error: searchError } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .neq('id', user.id) // Exclude current user
        .ilike('username', `%${sanitized}%`)
        .limit(20);

      if (searchError) throw searchError;

      if (!users || users.length === 0) {
        setResults([]);
        return;
      }

      // Check friendship status for each user
      const userIds = users.map(u => u.id);

      // Check existing friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('user_id', user.id);

      const friendIds = new Set(
        (friendships || []).map(f => f.friend_id)
      );

      // Check pending requests (both sent and received)
      const { data: requests } = await supabase
        .from('friendship_requests')
        .select('requester_id, recipient_id, status')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .in('recipient_id', userIds.concat(user.id))
        .in('requester_id', userIds.concat(user.id))
        .eq('status', 'pending');

      const requestMap = new Map<string, 'pending_sent' | 'pending_received'>();
      (requests || []).forEach(req => {
        if (req.requester_id === user.id) {
          requestMap.set(req.recipient_id, 'pending_sent');
        } else {
          requestMap.set(req.requester_id, 'pending_received');
        }
      });

      // Build results
      const searchResults: SearchResult[] = users.map(u => ({
        id: u.id,
        username: u.username || 'unknown',
        full_name: u.full_name,
        is_friend: friendIds.has(u.id),
        request_status: friendIds.has(u.id) 
          ? 'accepted' 
          : requestMap.get(u.id) || 'none'
      }));

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching users:', error);
      alert('Failed to search users. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, router]);

  const handleSendRequest = async (receiverId: string, username: string) => {
    setSendingRequestTo(receiverId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('friendship_requests')
        .insert({
          requester_id: user.id,
          recipient_id: receiverId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') { // Duplicate key
          alert('You already sent a friend request to this user.');
        } else {
          throw error;
        }
      } else {
        // Update local state
        setResults(prev => prev.map(r => 
          r.id === receiverId 
            ? { ...r, request_status: 'pending_sent' }
            : r
        ));
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request. Please try again.');
    } finally {
      setSendingRequestTo(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white p-4 sticky top-0 z-40 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link 
              href="/friends" 
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
                <Search size={28} />
                Find Friends
              </h1>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Search by username
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* SEARCH BOX */}
        <div className="border-[3px] border-black bg-white dark:bg-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter username..."
              className={clsx(
                "flex-1 px-4 py-3 text-base font-semibold",
                "border-[3px] border-black bg-white dark:bg-slate-700",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]",
                "transition-all duration-150",
                "placeholder:text-gray-400 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              )}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className={clsx(
                "px-6 py-3 border-[3px] border-black bg-blue-500 text-white font-black",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                "transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
                "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                "flex items-center gap-2"
              )}
            >
              {searching ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Search size={20} />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-3">
            Tip: Try searching for partial usernames (e.g., "john" will find "john123", "johndoe", etc.)
          </p>
        </div>

        {/* RESULTS */}
        {hasSearched && (
          <div>
            <h2 className="text-xl font-black text-black dark:text-white mb-4">
              {results.length > 0 ? `Found ${results.length} user${results.length === 1 ? '' : 's'}` : 'No results'}
            </h2>

            {results.length === 0 ? (
              <div className="border-[3px] border-black border-dashed bg-white dark:bg-slate-800 p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <Search size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-black text-black dark:text-white mb-2">No users found</p>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Try a different username or check the spelling
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className={clsx(
                      "border-[3px] border-black bg-white dark:bg-slate-800 p-5",
                      "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 border-[3px] border-black dark:border-white bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-lg font-black text-white">
                          {result.full_name
                            ? result.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : result.username.slice(0, 2).toUpperCase()
                          }
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <h3 className="font-black text-lg text-black dark:text-white">
                          {result.full_name || result.username}
                        </h3>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                          @{result.username}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    {result.is_friend || result.request_status === 'accepted' ? (
                      <div className={clsx(
                        "w-full py-2 px-3 border-[3px] border-black bg-green-100 text-green-700 font-black text-sm text-center",
                        "flex items-center justify-center gap-2",
                        "dark:border-white dark:bg-green-900/30 dark:text-green-400"
                      )}>
                        <CheckCircle size={16} />
                        Already Friends
                      </div>
                    ) : result.request_status === 'pending_sent' ? (
                      <div className={clsx(
                        "w-full py-2 px-3 border-[3px] border-black bg-yellow-100 text-yellow-700 font-black text-sm text-center",
                        "flex items-center justify-center gap-2",
                        "dark:border-white dark:bg-yellow-900/30 dark:text-yellow-400"
                      )}>
                        <Clock size={16} />
                        Request Sent
                      </div>
                    ) : result.request_status === 'pending_received' ? (
                      <Link
                        href="/friends/requests"
                        className={clsx(
                          "block w-full py-2 px-3 border-[3px] border-black bg-orange-500 text-white font-black text-sm text-center",
                          "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                          "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                          "transition-all duration-150",
                          "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                        )}
                      >
                        Respond to Request
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(result.id, result.username)}
                        disabled={sendingRequestTo === result.id}
                        className={clsx(
                          "w-full py-2 px-3 border-[3px] border-black bg-blue-500 text-white font-black text-sm",
                          "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                          "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                          "transition-all duration-150",
                          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
                          "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                          "flex items-center justify-center gap-2"
                        )}
                      >
                        {sendingRequestTo === result.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <UserPlus size={16} />
                            Add Friend
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HELP TEXT */}
        {!hasSearched && (
          <div className="border-[3px] border-black bg-blue-50 dark:bg-blue-900/20 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h3 className="font-black text-lg text-black dark:text-white mb-3">How to Find Friends</h3>
            <ul className="space-y-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <li>• Enter a username in the search box above</li>
              <li>• Partial matches work - try searching part of a name</li>
              <li>• Send friend requests to connect with other students</li>
              <li>• Once accepted, you can view each other&apos;s attendance stats</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
