import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { toast } from 'react-toastify';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  CalendarDaysIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  getInstitutionConversations,
  getOrCreateConversation,
  getConversationMessages,
  sendConversationMessage,
  markConversationMessagesRead,
} from '../services/supabaseService';

const REMINDER_TEMPLATES = [
  'Your appointment is tomorrow. Please arrive on time.',
  'Please eat a light meal before donating.',
  'Please bring a valid ID to your appointment.',
];

const donationStatusColor = (s) =>
  ({
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    no_show: 'bg-rose-100 text-rose-700',
  }[s] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200');

const getDonorDisplayName = (profile) => {
  if (!profile) return 'Donor';
  if (profile.default_anonymous) return 'Anonymous Donor';
  return profile.full_name || 'Donor';
};

const AppointmentMessages = ({ institutionId, donations = [], initialAppointmentId = null }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [openingAppointmentId, setOpeningAppointmentId] = useState(null);
  const messagesEndRef = useRef(null);
  const lastOpenedAppointmentRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = useCallback(async () => {
    if (!institutionId) return;
    try {
      const data = await getInstitutionConversations(institutionId);
      setConversations(data);
      return data;
    } catch (err) {
      toast.error('Failed to load messages: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setMessagesLoading(true);
    try {
      const data = await getConversationMessages(conversationId);
      setMessages(data);
      if (institutionId) {
        await markConversationMessagesRead(conversationId, institutionId);
      }
      scrollToBottom();
    } catch (err) {
      toast.error('Failed to load conversation: ' + err.message);
    } finally {
      setMessagesLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!initialAppointmentId || loading) return;
    if (lastOpenedAppointmentRef.current === initialAppointmentId) return;

    const openInitial = async () => {
      lastOpenedAppointmentRef.current = initialAppointmentId;
      const existing = conversations.find((c) => c.appointment_id === initialAppointmentId);
      if (existing) {
        setSelectedId(existing.id);
        return;
      }

      const donation = donations.find((d) => d.id === initialAppointmentId);
      if (!donation?.donor_id) return;

      setOpeningAppointmentId(initialAppointmentId);
      try {
        const conv = await getOrCreateConversation(initialAppointmentId, institutionId, donation.donor_id);
        await loadConversations();
        setSelectedId(conv.id);
      } catch (err) {
        toast.error('Could not open conversation: ' + err.message);
      } finally {
        setOpeningAppointmentId(null);
      }
    };

    openInitial();
  }, [initialAppointmentId, conversations, donations, institutionId, loading, loadConversations]);

  useEffect(() => {
    if (!institutionId) return;

    const channel = supabase
      .channel(`institution-messages:${institutionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new;
          if (selectedId && newMsg.conversation_id === selectedId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender_id !== institutionId) {
              markConversationMessagesRead(selectedId, institutionId);
            }
            scrollToBottom();
          }
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `institution_id=eq.${institutionId}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[iDonate:Messages] Realtime subscription failed — run migration 021 in Supabase');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [institutionId, selectedId, loadConversations]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, loadMessages]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const messageableAppointments = useMemo(() => {
    const withConversation = new Set(conversations.map((c) => c.appointment_id));
    return donations.filter(
      (d) =>
        d.donor_id &&
        !withConversation.has(d.id) &&
        ['scheduled', 'confirmed'].includes(d.status)
    );
  }, [donations, conversations]);

  const handleOpenAppointment = async (donation) => {
    if (!donation.donor_id) return;
    setOpeningAppointmentId(donation.id);
    try {
      const conv = await getOrCreateConversation(donation.id, institutionId, donation.donor_id);
      await loadConversations();
      setSelectedId(conv.id);
    } catch (err) {
      toast.error('Could not start conversation: ' + err.message);
    } finally {
      setOpeningAppointmentId(null);
    }
  };

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? messageText).trim();
    if (!text || !selectedId || !institutionId || sending) return;

    setSending(true);
    try {
      const sent = await sendConversationMessage(selectedId, institutionId, text);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setMessageText('');
      scrollToBottom();
      loadConversations();
    } catch (err) {
      toast.error('Failed to send message: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mb-4" />
        <p className="font-semibold">Loading appointment messages...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[600px] flex flex-col lg:flex-row">
        {/* Conversation List */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-rose-500" />
              Appointment Messages
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Coordinate with donors about scheduled appointments
            </p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[280px] lg:max-h-none">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold">No conversations yet</p>
                <p className="text-xs mt-1">Start messaging from an upcoming appointment below</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {conversations.map((conv) => {
                  const donorName = getDonorDisplayName(conv.profiles);
                  const appointmentDate = conv.donations?.scheduled_date
                    ? new Date(conv.donations.scheduled_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';
                  const isSelected = conv.id === selectedId;

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full text-left p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        isSelected ? 'bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{donorName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <CalendarDaysIcon className="h-3.5 w-3.5" />
                            {appointmentDate}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
                              {conv.lastMessage.sender_id === institutionId ? 'You: ' : ''}
                              {conv.lastMessage.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {conv.donations?.status && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${donationStatusColor(conv.donations.status)}`}
                            >
                              {conv.donations.status.replace('_', ' ')}
                            </span>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {messageableAppointments.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                Start a conversation
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messageableAppointments.slice(0, 5).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={openingAppointmentId === d.id}
                    onClick={() => handleOpenAppointment(d)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-rose-300 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {getDonorDisplayName(d.profiles)}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(d.scheduled_date).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 ml-2 flex-shrink-0">Message</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-h-[400px]">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <UserCircleIcon className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm font-semibold">Select a conversation</p>
              <p className="text-xs mt-1 text-center max-w-xs">
                Choose an existing chat or start one from an upcoming appointment
              </p>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {getDonorDisplayName(selectedConversation.profiles)}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Appointment:{' '}
                    {selectedConversation.donations?.scheduled_date
                      ? new Date(selectedConversation.donations.scheduled_date).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </p>
                  {selectedConversation.donations?.status && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${donationStatusColor(selectedConversation.donations.status)}`}
                    >
                      {selectedConversation.donations.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/30 dark:bg-slate-950/20">
                {messagesLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <ChatBubbleLeftRightIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-semibold">No messages yet</p>
                    <p className="text-xs mt-1">Send a reminder or reply to the donor</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === institutionId;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                            isOwn
                              ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-br-md'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                          <p
                            className={`text-[10px] mt-1 text-right ${
                              isOwn ? 'text-rose-100' : 'text-slate-400'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex flex-wrap gap-2 mb-3">
                  {REMINDER_TEMPLATES.map((template) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => handleSend(template)}
                      disabled={sending}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      {template.length > 42 ? template.slice(0, 42) + '…' : template}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 items-end">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={2}
                    maxLength={500}
                    className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:border-rose-500 focus:ring-rose-500 resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!messageText.trim() || sending}
                    className="p-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-rose-200 dark:shadow-none"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentMessages;
