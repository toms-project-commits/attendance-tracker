'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Inbox, Send, Loader2, Check, X, Clock } from 'lucide-react';
import { clsx } from 'clsx';

type PendingRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_username: string;
  sender_full_name: string | null;
  receiver_username: string;
  receiver_full_name: string | null;
  created_at: string;
  status: string;
};

export default function FriendRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [receivedRequests, setReceivedRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<PendingRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const loadRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Load received requests (others sent to me)
      const { data: received, error: receivedError } = await supabase
        .from('friendship_requests')
        .select(`
          id,
          requester_id,
          recipient_id,
          created_at,
          status,
          requester:profiles!friendship_requests_requester_id_fkey(username, full_name)
        `)
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error('Error loading received requests:', receivedError);
      } else {
        const formattedReceived = (received || []).map(r => {
          const requesterData = r.requester as any;
          return {
            id: r.id,
            sender_id: r.requester_id,
            receiver_id: r.recipient_id,
            sender_username: Array.isArray(requesterData) ? requesterData[0]?.username : requesterData?.username || 'unknown',
            sender_full_name: Array.isArray(requesterData) ? requesterData[0]?.full_name : requesterData?.full_name || null,
            receiver_username: '',
            receiver_full_name: null,
            created_at: r.created_at,
            status: r.status
          };
        });
        setReceivedRequests(formattedReceived);
      }

      // Load sent requests (I sent to others)
      const { data: sent, error: sentError } = await supabase
        .from('friendship_requests')
        .select(`
          id,
          requester_id,
          recipient_id,
          created_at,
          status,
          recipient:profiles!friendship_requests_recipient_id_fkey(username, full_name)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sentError) {
        console.error('Error loading sent requests:', sentError);
      } else {
        const formattedSent = (sent || []).map(r => {
          const recipientData = r.recipient as any;
          return {
            id: r.id,
            sender_id: r.requester_id,
            receiver_id: r.recipient_id,
            sender_username: '',
            sender_full_name: null,
            receiver_username: Array.isArray(recipientData) ? recipientData[0]?.username : recipientData?.username || 'unknown',
            receiver_full_name: Array.isArray(recipientData) ? recipientData[0]?.full_name : recipientData?.full_name || null,
            created_at: r.created_at,
            status: r.status
          };
        });
        setSentRequests(formattedSent);
      }

    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAccept = async (requestId: string, senderUsername: string) => {
    setProcessingId(requestId);

    try {
      const { error } = await supabase
        .from('friendship_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      // Remove from local state
      setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string, senderUsername: string) => {
    if (!confirm(`Reject friend request from ${senderUsername}?`)) return;

    setProcessingId(requestId);

    try {
      const { error } = await supabase
        .from('friendship_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      // Remove from local state
      setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (requestId: string, receiverUsername: string) => {
    if (!confirm(`Cancel friend request to ${receiverUsername}?`)) return;

    setProcessingId(requestId);

    try {
      const { error } = await supabase
        .from('friendship_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      // Remove from local state
      setSentRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error canceling request:', error);
      alert('Failed to cancel request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <Loader2 className="animate-spin mx-auto mb-3 text-black" size={40} />
          <p className="font-black text-black text-lg">Loading Requests...</p>
        </div>
      </div>
    );
  }

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
                <Inbox size={28} />
                Friend Requests
              </h1>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {receivedRequests.length} received • {sentRequests.length} sent
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* TABS */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('received')}
            className={clsx(
              "flex-1 py-3 px-4 border-[3px] border-black font-black text-sm transition-all duration-150 flex items-center justify-center gap-2",
              activeTab === 'received'
                ? "bg-blue-500 text-white shadow-none translate-x-[2px] translate-y-[2px]"
                : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]",
              "dark:border-white",
              activeTab === 'received'
                ? "dark:shadow-none"
                : "dark:bg-slate-700 dark:text-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            )}
          >
            <Inbox size={18} />
            Received ({receivedRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={clsx(
              "flex-1 py-3 px-4 border-[3px] border-black font-black text-sm transition-all duration-150 flex items-center justify-center gap-2",
              activeTab === 'sent'
                ? "bg-blue-500 text-white shadow-none translate-x-[2px] translate-y-[2px]"
                : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]",
              "dark:border-white",
              activeTab === 'sent'
                ? "dark:shadow-none"
                : "dark:bg-slate-700 dark:text-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            )}
          >
            <Send size={18} />
            Sent ({sentRequests.length})
          </button>
        </div>

        {/* RECEIVED REQUESTS TAB */}
        {activeTab === 'received' && (
          <div>
            {receivedRequests.length === 0 ? (
              <div className="border-[3px] border-black border-dashed bg-white dark:bg-slate-800 p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <Inbox size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-black text-black dark:text-white mb-2">No pending requests</p>
                <p className="text-base font-semibold text-gray-600 dark:text-gray-400">
                  When someone sends you a friend request, it will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <div
                    key={request.id}
                    className={clsx(
                      "border-[3px] border-black bg-white dark:bg-slate-800 p-5",
                      "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Avatar */}
                        <div className="w-12 h-12 border-[3px] border-black dark:border-white bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-lg font-black text-white">
                            {request.sender_full_name
                              ? request.sender_full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : request.sender_username.slice(0, 2).toUpperCase()
                            }
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="font-black text-lg text-black dark:text-white">
                            {request.sender_full_name || request.sender_username}
                          </h3>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                            @{request.sender_username}
                          </p>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(request.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(request.id, request.sender_username)}
                        disabled={processingId === request.id}
                        className={clsx(
                          "flex-1 py-2 px-3 border-[3px] border-black bg-green-500 text-white font-black text-sm",
                          "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                          "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                          "transition-all duration-150",
                          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
                          "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                          "flex items-center justify-center gap-2"
                        )}
                      >
                        {processingId === request.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={16} />
                            Accept
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleReject(request.id, request.sender_username)}
                        disabled={processingId === request.id}
                        className={clsx(
                          "flex-1 py-2 px-3 border-[3px] border-black bg-red-500 text-white font-black text-sm",
                          "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                          "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                          "transition-all duration-150",
                          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
                          "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                          "flex items-center justify-center gap-2"
                        )}
                      >
                        {processingId === request.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <X size={16} />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SENT REQUESTS TAB */}
        {activeTab === 'sent' && (
          <div>
            {sentRequests.length === 0 ? (
              <div className="border-[3px] border-black border-dashed bg-white dark:bg-slate-800 p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <Send size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-black text-black dark:text-white mb-2">No pending requests</p>
                <p className="text-base font-semibold text-gray-600 dark:text-gray-400">
                  Friend requests you send will appear here until accepted or rejected
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <div
                    key={request.id}
                    className={clsx(
                      "border-[3px] border-black bg-white dark:bg-slate-800 p-5",
                      "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Avatar */}
                        <div className="w-12 h-12 border-[3px] border-black dark:border-white bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center">
                          <span className="text-lg font-black text-white">
                            {request.receiver_full_name
                              ? request.receiver_full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : request.receiver_username.slice(0, 2).toUpperCase()
                            }
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="font-black text-lg text-black dark:text-white">
                            {request.receiver_full_name || request.receiver_username}
                          </h3>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                            @{request.receiver_username}
                          </p>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            Sent {formatDate(request.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleCancel(request.id, request.receiver_username)}
                      disabled={processingId === request.id}
                      className={clsx(
                        "w-full py-2 px-3 border-[3px] border-black bg-gray-200 text-black font-black text-sm",
                        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                        "hover:bg-red-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                        "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                        "transition-all duration-150",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
                        "dark:border-white dark:bg-slate-600 dark:text-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                        "flex items-center justify-center gap-2"
                      )}
                    >
                      {processingId === request.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <X size={16} />
                          Cancel Request
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
