import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HomeIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import {
  getInstitutionProfile,
  getInstitutionRequests,
  getInstitutionStats,
  getInstitutionDonations,
  createBloodRequest,
  updateBloodRequestStatus,
  updateBloodRequest,
  deleteBloodRequest,
  updateDonationStatus,
  getRecentActivity,
  updateInstitutionProfile,
} from '../services/supabaseService';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['low', 'moderate', 'high', 'critical'];

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');

  // Data
  const [stats, setStats] = useState({ activeRequests: 0, fulfilledRequests: 0, totalRequests: 0, upcomingDonations: 0, completedDonations: 0, uniqueDonors: 0 });
  const [bloodRequests, setBloodRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [institutionProfile, setInstitutionProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [formData, setFormData] = useState({
    blood_type_needed: 'A+', units_needed: 1, urgency_level: 'moderate',
    description: '', date_needed: '', time_needed: '', contact_phone: '',
    max_donors: 1,
  });
  const [creating, setCreating] = useState(false);

  // Request filters
  const [filters, setFilters] = useState({ bloodType: '', urgency: '', status: '' });

  // Edit request modal
  const [editingRequest, setEditingRequest] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Delete confirmation modal
  const [deletingRequestId, setDeletingRequestId] = useState(null);

  // Complete donation modal
  const [completingDonation, setCompletingDonation] = useState(null);
  const [completionUnits, setCompletionUnits] = useState(1);

  // Profile edit
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);

  // Notifications panel
  const [showNotifications, setShowNotifications] = useState(false);

  // ─── Notification Badge: only count activity since last seen ───
  const lastSeenRef = useRef(localStorage.getItem('institution_notification_last_seen'));
  const [newActivityCount, setNewActivityCount] = useState(0);

  const recalcNewActivity = useCallback((activityList) => {
    const since = lastSeenRef.current;
    if (!since) {
      setNewActivityCount(activityList.length);
    } else {
      const count = activityList.filter(a => new Date(a.created_at) > new Date(since)).length;
      setNewActivityCount(count);
    }
  }, []);

  const resetNotificationBadge = useCallback(() => {
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    setNewActivityCount(0);
    localStorage.setItem('institution_notification_last_seen', now);
  }, []);

  // Toggle notifications panel — reset badge when closing
  const handleToggleNotifications = useCallback(() => {
    setShowNotifications(prev => {
      if (prev) {
        // Closing the panel → reset
        resetNotificationBadge();
      }
      return !prev;
    });
  }, [resetNotificationBadge]);

  // Keep a ref to loadDashboardData so the realtime callback never goes stale
  const loadDashboardDataRef = useRef(null);

  useEffect(() => {
    if (currentUser?.id) {
      loadDashboardData();

      // ─── Real-time Notifications Subscription ───
      // Listen for donations activity for this institution
      const donationSubscription = supabase
        .channel('institution-donations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'donations',
            filter: `institution_id=eq.${currentUser.id}`,
          },
          (payload) => {
            console.log('[iDonate:Realtime] Donation event:', payload.eventType);
            if (payload.eventType === 'INSERT') {
              toast.info('New donor volunteer response! Check your donations tab.');
            }
            // Immediately bump the badge count so it feels instant
            const eventTime = payload.new?.created_at;
            if (eventTime && lastSeenRef.current) {
              if (new Date(eventTime) > new Date(lastSeenRef.current)) {
                setNewActivityCount(prev => prev + 1);
              }
            } else if (payload.eventType === 'INSERT') {
              setNewActivityCount(prev => prev + 1);
            }
            // Then refresh the full data in the background
            loadDashboardDataRef.current?.();
          }
        )
        .subscribe((status) => {
          console.log('[iDonate:Realtime] Subscription status:', status);
        });

      return () => {
        supabase.removeChannel(donationSubscription);
      };
    }
  }, [currentUser?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    let requests = [];
    let donationsData = [];

    // Fetch each independently so one failure doesn't block the rest
    try { const profile = await getInstitutionProfile(currentUser.id); setInstitutionProfile(profile); if (profile) setProfileForm({ institution_name: profile.name || '', email: profile.email || '', phone: profile.phone || '', website: profile.website || '', address: profile.address || '' }); }
    catch (e) { console.error('Profile fetch failed:', e); }

    try { requests = await getInstitutionRequests(currentUser.id); setBloodRequests(requests); }
    catch (e) { console.error('Requests fetch failed:', e); }

    try { donationsData = await getInstitutionDonations(currentUser.id); setDonations(donationsData); }
    catch (e) { console.error('Donations fetch failed:', e); }

    // Compute stats from already-fetched data (no extra queries)
    try { const statsData = await getInstitutionStats(currentUser.id, requests, donationsData); setStats(statsData); }
    catch (e) { console.error('Stats compute failed:', e); }

    try { const activityData = await getRecentActivity(currentUser.id, 20); setActivity(activityData); recalcNewActivity(activityData); }
    catch (e) { console.error('Activity fetch failed:', e); }

    setLoading(false);
  };
  loadDashboardDataRef.current = loadDashboardData;

  const handleLogout = async () => {
    try { await logout(); navigate('/'); } catch { toast.error('Failed to log out'); }
  };

  // ─── Create Request ───
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createBloodRequest({
        requester_id: currentUser.id,
        request_type: 'institution',
        blood_type_needed: formData.blood_type_needed,
        units_needed: parseInt(formData.units_needed, 10),
        urgency_level: formData.urgency_level,
        description: formData.description || null,
        max_donors: parseInt(formData.max_donors, 10) || 1,
        date_needed: formData.date_needed || null,
        time_needed: formData.time_needed || null,
        contact_phone: formData.contact_phone || null,
      });
      toast.success('Blood request created!');
      setFormData({ blood_type_needed: 'A+', units_needed: 1, urgency_level: 'moderate', description: '', date_needed: '', time_needed: '', contact_phone: '', max_donors: 1 });
      await loadDashboardData();
      setActiveTab('requests');
    } catch (error) {
      toast.error('Failed: ' + error.message);
    } finally { setCreating(false); }
  };

  // ─── Request Actions ───
  const handleStatusChange = async (requestId, newStatus) => {
    try {
      await updateBloodRequestStatus(requestId, newStatus);
      toast.success(`Request ${newStatus}!`);
      await loadDashboardData();
    } catch (error) { toast.error('Failed: ' + error.message); }
  };

  const handleDelete = async (requestId) => {
    setDeletingRequestId(requestId);
  };

  const confirmDelete = async () => {
    if (!deletingRequestId) return;
    try {
      await deleteBloodRequest(deletingRequestId);
      toast.success('Request deleted');
      await loadDashboardData();
    } catch (error) { toast.error('Failed: ' + error.message); }
    finally { setDeletingRequestId(null); }
  };

  const handleEditSave = async () => {
    if (!editingRequest) return;
    try {
      await updateBloodRequest(editingRequest.id, editForm);
      toast.success('Request updated!');
      setEditingRequest(null);
      await loadDashboardData();
    } catch (error) { toast.error('Failed: ' + error.message); }
  };

  // ─── Donation Actions ───
  const handleDonationAction = async (donationId, status, units) => {
    try {
      await updateDonationStatus(donationId, status, units);
      toast.success(`Donation ${status}!`);
      await loadDashboardData();
    } catch (error) { toast.error('Failed: ' + error.message); }
  };

  // ─── Profile Save ───
  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      await updateInstitutionProfile(currentUser.id, profileForm);
      toast.success('Profile updated!');
      setProfileEditing(false);
      await loadDashboardData();
    } catch (error) { toast.error('Failed: ' + error.message); }
    finally { setProfileSaving(false); }
  };

  // ─── Filtered Requests ───
  // Filter out soft-deleted requests globally
  const activeRequests = useMemo(() => bloodRequests.filter(r => r.status !== 'deleted'), [bloodRequests]);

  const filteredRequests = useMemo(() => {
    return activeRequests.filter(r => {
      if (filters.bloodType && r.blood_type_needed !== filters.bloodType) return false;
      if (filters.urgency && r.urgency_level !== filters.urgency) return false;
      if (filters.status && r.status !== filters.status) return false;
      return true;
    });
  }, [activeRequests, filters]);

  // ─── Analytics Data ───
  const analyticsData = useMemo(() => {
    // Monthly trends (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const count = donations.filter(don => don.status === 'completed' && don.scheduled_date?.startsWith(key)).length;
      months.push({ key, label, count });
    }
    const maxMonthly = Math.max(...months.map(m => m.count), 1);

    // Blood type demand
    const bloodTypeCounts = {};
    activeRequests.forEach(r => {
      bloodTypeCounts[r.blood_type_needed] = (bloodTypeCounts[r.blood_type_needed] || 0) + 1;
    });
    const maxBt = Math.max(...Object.values(bloodTypeCounts), 1);

    // Fulfillment rate
    const total = activeRequests.length;
    const fulfilled = activeRequests.filter(r => r.status === 'completed').length;
    const rate = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

    return { months, maxMonthly, bloodTypeCounts, maxBt, rate, total, fulfilled };
  }, [donations, activeRequests]);

  const upcomingDonations = useMemo(() => {
    return donations.filter(d => d.status === 'scheduled' || d.status === 'confirmed')
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  }, [donations]);

  // ─── Helpers ───
  const urgencyColor = (l) => ({ critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', moderate: 'bg-yellow-100 text-yellow-800', low: 'bg-green-100 text-green-800' }[l] || 'bg-gray-100 text-gray-800');
  const statusColor = (s) => ({ open: 'bg-blue-100 text-blue-800', matched: 'bg-yellow-100 text-yellow-800', in_progress: 'bg-orange-100 text-orange-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-600', expired: 'bg-gray-100 text-gray-400' }[s] || 'bg-gray-100 text-gray-800');
  const donationStatusColor = (s) => ({ scheduled: 'bg-blue-100 text-blue-800', confirmed: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-600', no_show: 'bg-red-100 text-red-700' }[s] || 'bg-gray-100 text-gray-800');

  // ─── Render Tabs ───
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Active Requests', value: stats.activeRequests, colorClass: 'text-red-600' },
                { label: 'Fulfilled', value: stats.fulfilledRequests, colorClass: 'text-green-600' },
                { label: 'Total Requests', value: stats.totalRequests, colorClass: 'text-blue-600' },
                { label: 'Upcoming Donations', value: stats.upcomingDonations, colorClass: 'text-indigo-600' },
                { label: 'Completed Donations', value: stats.completedDonations, colorClass: 'text-emerald-600' },
                { label: 'Unique Donors', value: stats.uniqueDonors, colorClass: 'text-purple-600' },
              ].map(({ label, value, colorClass }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className={`text-2xl font-bold ${colorClass} mt-1`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button onClick={() => { setFormData(f => ({ ...f, urgency_level: 'critical' })); setActiveTab('create'); }}
                className="inline-flex items-center px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors gap-2">
                <PlusIcon className="h-4 w-4" /> Create Urgent Request
              </button>
              <button onClick={() => setActiveTab('donations')}
                className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors gap-2">
                <CalendarDaysIcon className="h-4 w-4" /> View Donations
              </button>
            </div>

            {/* Upcoming Donations */}
            {upcomingDonations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Donations</h3>
                <div className="space-y-3">
                  {upcomingDonations.slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-indigo-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {d.donors?.blood_type || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{d.profiles?.full_name || 'Donor'}</p>
                          <p className="text-xs text-gray-500">{new Date(d.scheduled_date).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${donationStatusColor(d.status)}`}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Requests</h3>
                {activeRequests.length > 0 && (
                  <button onClick={() => setActiveTab('requests')} className="text-sm text-red-600 hover:text-red-700 font-medium">View all →</button>
                )}
              </div>
              {activeRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-3">No blood requests yet</p>
                  <button onClick={() => setActiveTab('create')} className="text-sm text-red-600 hover:text-red-700 font-medium">Create your first request →</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRequests.slice(0, 5).map(req => (
                    <div key={req.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setActiveTab('requests')}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold text-sm flex-shrink-0">{req.blood_type_needed}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {req.blood_type_needed} · {req.units_needed} unit{req.units_needed > 1 ? 's' : ''}{req.patient_name && <span className="text-gray-500 font-normal"> · {req.patient_name}</span>}
                            </p>
                            {req.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{req.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {req.date_needed && (
                                <span className="text-xs text-gray-400">Needed by {new Date(req.date_needed).toLocaleDateString()}</span>
                              )}
                              {req.date_needed && <span className="text-xs text-gray-300">·</span>}
                              <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${urgencyColor(req.urgency_level)}`}>{req.urgency_level}</span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(req.status)}`}>{req.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'create':
        return (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Create Blood Request</h2>
              <form onSubmit={handleCreateRequest} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type *</label>
                    <select value={formData.blood_type_needed} onChange={e => setFormData(p => ({ ...p, blood_type_needed: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-red-500 focus:ring-red-500 bg-white text-gray-900">
                      {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Units Needed *</label>
                    <input type="number" min={1} value={formData.units_needed}
                      onChange={e => setFormData(p => ({ ...p, units_needed: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-red-500 focus:ring-red-500 text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Donors Needed (Target)</label>
                  <input type="number" min={1} value={formData.max_donors}
                    onChange={e => setFormData(p => ({ ...p, max_donors: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-red-500 focus:ring-red-500 text-gray-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level *</label>
                    <select value={formData.urgency_level} onChange={e => setFormData(p => ({ ...p, urgency_level: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-red-500 focus:ring-red-500 bg-white text-gray-900">
                      {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Needed</label>
                    <input type="date" value={formData.date_needed}
                      onChange={e => setFormData(p => ({ ...p, date_needed: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-red-500 focus:ring-red-500 text-gray-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Needed</label>
                    <input type="time" value={formData.time_needed}
                      onChange={e => setFormData(p => ({ ...p, time_needed: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-red-500 focus:ring-red-500 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Contact (Phone)</label>
                    <input type="tel" value={formData.contact_phone} onChange={e => setFormData(p => ({ ...p, contact_phone: e.target.value }))}
                      placeholder="Optional — e.g. +1 234 567 8900" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-red-500 focus:ring-red-500 text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Request</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Surgery scheduled, accident victim, thalassemia patient..." className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-red-500 focus:ring-red-500 text-gray-900" />
                </div>
                <button type="submit" disabled={creating}
                  className="w-full py-3 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {creating ? 'Creating...' : 'Create Request'}
                </button>
              </form>
            </div>
          </div>
        );

      case 'requests':
        return (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-500">Filter:</span>
                <select value={filters.bloodType} onChange={e => setFilters(f => ({ ...f, bloodType: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white text-gray-700">
                  <option value="">All blood types</option>
                  {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filters.urgency} onChange={e => setFilters(f => ({ ...f, urgency: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white text-gray-700">
                  <option value="">All urgencies</option>
                  {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white text-gray-700">
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="matched">Matched</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {(filters.bloodType || filters.urgency || filters.status) && (
                  <button onClick={() => setFilters({ bloodType: '', urgency: '', status: '' })}
                    className="text-xs text-red-500 hover:text-red-700 font-medium">Clear</button>
                )}
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Blood Requests ({filteredRequests.length})</h2>
                <button onClick={() => setActiveTab('create')}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                  <PlusIcon className="h-4 w-4 mr-1.5" /> New
                </button>
              </div>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No requests match your filters</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        {['Blood Type', 'Units', 'Patient', 'Reason', 'Urgency', 'Status', 'Date/Time', 'Actions'].map(h => (
                          <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRequests.map(req => (
                        <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4"><span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-100 text-red-700 font-bold text-sm">{req.blood_type_needed}</span></td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.units_needed}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{req.patient_name || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]"><span className="line-clamp-2">{req.description || '—'}</span></td>
                           <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${urgencyColor(req.urgency_level)}`}>{req.urgency_level}</span></td>
                          <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(req.status)}`}>{req.status}</span></td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div>{req.date_needed ? new Date(req.date_needed).toLocaleDateString() : new Date(req.created_at).toLocaleDateString()}</div>
                            {req.time_needed && <div className="text-xs text-gray-400 font-medium">{req.time_needed}</div>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {['open', 'matched', 'in_progress'].includes(req.status) && (
                                <>
                                  <button onClick={() => { setEditingRequest(req); setEditForm({ units_needed: req.units_needed, urgency_level: req.urgency_level, description: req.description || '', date_needed: req.date_needed || '', time_needed: req.time_needed || '' }); }}
                                    className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">Edit</button>
                                  <button onClick={() => handleStatusChange(req.id, 'completed')}
                                    className="text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors">Complete</button>
                                  <button onClick={() => handleStatusChange(req.id, 'cancelled')}
                                    className="text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors">Cancel</button>
                                </>
                              )}
                              <button onClick={() => handleDelete(req.id)}
                                className="text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Edit Modal */}
            {editingRequest && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingRequest(null)}>
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Request</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Units Needed</label>
                      <input type="number" min={1} value={editForm.units_needed} onChange={e => setEditForm(f => ({ ...f, units_needed: parseInt(e.target.value, 10) }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                      <select value={editForm.urgency_level} onChange={e => setEditForm(f => ({ ...f, urgency_level: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white text-gray-900">
                        {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" value={editForm.date_needed} onChange={e => setEditForm(f => ({ ...f, date_needed: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input type="time" value={editForm.time_needed} onChange={e => setEditForm(f => ({ ...f, time_needed: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleEditSave} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Save</button>
                      <button onClick={() => setEditingRequest(null)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingRequestId && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeletingRequestId(null)}>
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Request</h3>
                  <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this blood request? This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button onClick={confirmDelete}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
                      Delete
                    </button>
                    <button onClick={() => setDeletingRequestId(null)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'donations':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Donation Appointments</h2>
            </div>
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No donations yet. Donors can book appointments from the mobile app.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Donor', 'Blood Type', 'Scheduled Date', 'Status', 'Units', 'Actions'].map(h => (
                        <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {donations.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {d.profiles?.avatar_url ? (
                              <img src={d.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
                                {d.profiles?.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{d.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{d.profiles?.phone_number || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-100 text-red-700 font-bold text-sm">{d.donors?.blood_type || '?'}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(d.scheduled_date).toLocaleString()}</td>
                        <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${donationStatusColor(d.status)}`}>{d.status.replace('_', ' ')}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-600">{d.units_donated || '—'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {d.status === 'scheduled' && (
                              <button onClick={() => handleDonationAction(d.id, 'confirmed')}
                                className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors">Confirm</button>
                            )}
                            {(d.status === 'scheduled' || d.status === 'confirmed') && (
                              <>
                                <button onClick={() => { setCompletingDonation(d.id); setCompletionUnits(1); }}
                                  className="text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors">Complete</button>
                                <button onClick={() => handleDonationAction(d.id, 'no_show')}
                                  className="text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">No Show</button>
                                <button onClick={() => handleDonationAction(d.id, 'cancelled')}
                                  className="text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors">Cancel</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Complete Donation Modal */}
            {completingDonation && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCompletingDonation(null)}>
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Complete Donation</h3>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Units Donated</label>
                    <input type="number" min={1} value={completionUnits}
                      onChange={e => setCompletionUnits(parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:ring-green-500" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { handleDonationAction(completingDonation, 'completed', completionUnits); setCompletingDonation(null); }}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
                      Mark Complete
                    </button>
                    <button onClick={() => setCompletingDonation(null)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Donations (Last 6 Months)</h3>
                <div className="flex items-end gap-3 h-48">
                  {analyticsData.months.map(m => (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-gray-700">{m.count}</span>
                      <div className="w-full bg-red-500 rounded-t-md transition-all"
                        style={{ height: `${(m.count / analyticsData.maxMonthly) * 140}px`, minHeight: m.count > 0 ? '8px' : '2px', backgroundColor: m.count > 0 ? '#EF4444' : '#E5E7EB' }} />
                      <span className="text-xs text-gray-500">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blood Type Demand */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Blood Type Demand</h3>
                <div className="space-y-3">
                  {BLOOD_TYPES.map(bt => {
                    const count = analyticsData.bloodTypeCounts[bt] || 0;
                    return (
                      <div key={bt} className="flex items-center gap-3">
                        <span className="w-8 text-sm font-bold text-gray-700">{bt}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full transition-all flex items-center justify-end pr-2"
                            style={{ width: `${Math.max((count / analyticsData.maxBt) * 100, count > 0 ? 15 : 0)}%` }}>
                            {count > 0 && <span className="text-xs font-bold text-white">{count}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fulfillment Rate */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fulfillment Rate</h3>
              <div className="flex items-center gap-8">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="#E5E7EB" strokeWidth="12" />
                    <circle cx="64" cy="64" r="56" fill="none" stroke="#22C55E" strokeWidth="12"
                      strokeDasharray={`${analyticsData.rate * 3.52} 352`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{analyticsData.rate}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{analyticsData.fulfilled} of {analyticsData.total} requests fulfilled</p>
                  <p className="text-xs text-gray-400 mt-1">Based on all-time request data</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Institution Profile</h2>
                {!profileEditing ? (
                  <button onClick={() => setProfileEditing(true)}
                    className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors">
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleProfileSave} disabled={profileSaving}
                      className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                      {profileSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setProfileEditing(false); if (institutionProfile) setProfileForm({ institution_name: institutionProfile.name || '', email: institutionProfile.email || '', phone: institutionProfile.phone || '', website: institutionProfile.website || '', address: institutionProfile.address || '' }); }}
                      className="text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {institutionProfile ? (
                <div className="space-y-5">
                  {[
                    { label: 'Institution Name', key: 'institution_name', type: 'text' },
                    { label: 'Email', key: 'email', type: 'email' },
                    { label: 'Phone', key: 'phone', type: 'text' },
                    { label: 'Website', key: 'website', type: 'text' },
                    { label: 'Address', key: 'address', type: 'text' },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">{label}</label>
                      {profileEditing ? (
                        <input type={type} value={profileForm[key] || ''}
                          onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-red-500 focus:ring-red-500" />
                      ) : (
                        <p className="text-base text-gray-900 font-medium">{profileForm[key] || '—'}</p>
                      )}
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Type</label>
                      <p className="text-base text-gray-900 font-medium capitalize">{institutionProfile.type || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Status</label>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${institutionProfile.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {institutionProfile.verified ? '✓ Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  {institutionProfile.contactPerson && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Contact Person</label>
                        <p className="text-base text-gray-900">{institutionProfile.contactPerson.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Role</label>
                        <p className="text-base text-gray-900">{institutionProfile.contactPerson.role}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Loading profile...</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-100 flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-red-600">iDonate</h1>
            <p className="text-sm text-gray-400 mt-1">Institution Dashboard</p>
          </div>
          <nav className="flex-1 mt-2 px-3">
            {[
              { key: 'home', icon: HomeIcon, label: 'Dashboard' },
              { key: 'create', icon: PlusIcon, label: 'Create Request' },
              { key: 'requests', icon: ClipboardDocumentListIcon, label: 'Manage Requests' },
              { key: 'donations', icon: CalendarDaysIcon, label: 'Donations' },
              { key: 'analytics', icon: ChartBarIcon, label: 'Analytics' },
              { key: 'profile', icon: UserCircleIcon, label: 'Profile' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center w-full px-4 py-3 mb-1 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === key ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon className="h-5 w-5 mr-3" />{label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 truncate">{currentUser?.email}</p>
            <button onClick={handleLogout}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors">
              Log out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {{ home: 'Dashboard', create: 'Create Request', requests: 'Manage Requests', donations: 'Donations', analytics: 'Analytics', profile: 'Profile' }[activeTab]}
                </h1>
                <p className="text-sm text-gray-400 mt-1">{institutionProfile?.name || 'Loading...'}</p>
              </div>
              {/* Notification Bell */}
              <div className="relative">
                <button onClick={handleToggleNotifications}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <BellIcon className="h-6 w-6 text-gray-500" />
                  {newActivityCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                      {Math.min(newActivityCount, 9)}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
                    </div>
                    {activity.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">No activity yet</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {activity.slice(0, 10).map(a => (
                          <div key={a.id} className="px-4 py-3 hover:bg-gray-50">
                            <p className="text-sm text-gray-900">
                              <span className="font-medium">{a.profiles?.full_name || 'A donor'}</span>
                              {' '}{a.status === 'scheduled' ? 'booked an appointment' : a.status === 'confirmed' ? 'confirmed their appointment' : a.status === 'completed' ? 'completed a donation' : a.status === 'cancelled' ? 'cancelled their appointment' : 'updated their appointment'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;