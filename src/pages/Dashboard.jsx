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
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  BeakerIcon,
  ChevronRightIcon
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

  const handleToggleNotifications = useCallback(() => {
    setShowNotifications(prev => {
      if (prev) resetNotificationBadge();
      return !prev;
    });
  }, [resetNotificationBadge]);

  const loadDashboardDataRef = useRef(null);

  useEffect(() => {
    if (currentUser?.id) {
      loadDashboardData();

      const donationSubscription = supabase
        .channel('institution-donations')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'donations', filter: `institution_id=eq.${currentUser.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              toast.info('New donor volunteer response! Check your donations tab.');
            }
            const eventTime = payload.new?.created_at;
            if (eventTime && lastSeenRef.current) {
              if (new Date(eventTime) > new Date(lastSeenRef.current)) {
                setNewActivityCount(prev => prev + 1);
              }
            } else if (payload.eventType === 'INSERT') {
              setNewActivityCount(prev => prev + 1);
            }
            loadDashboardDataRef.current?.();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(donationSubscription);
      };
    }
  }, [currentUser?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    let requests = [];
    let donationsData = [];

    try { const profile = await getInstitutionProfile(currentUser.id); setInstitutionProfile(profile); if (profile) setProfileForm({ institution_name: profile.name || '', email: profile.email || '', phone: profile.phone || '', website: profile.website || '', address: profile.address || '' }); }
    catch (e) { console.error('Profile fetch failed:', e); }

    try { requests = await getInstitutionRequests(currentUser.id); setBloodRequests(requests); }
    catch (e) { console.error('Requests fetch failed:', e); }

    try { donationsData = await getInstitutionDonations(currentUser.id); setDonations(donationsData); }
    catch (e) { console.error('Donations fetch failed:', e); }

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

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      await updateBloodRequestStatus(requestId, newStatus);
      toast.success(`Request ${newStatus}!`);
      await loadDashboardData();
    } catch (error) { toast.error('Failed: ' + error.message); }
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

  const handleDonationAction = async (donationId, status, units) => {
    try {
      await updateDonationStatus(donationId, status, units);
      toast.success(`Donation ${status}!`);
      await loadDashboardData();
    } catch (error) { toast.error('Failed: ' + error.message); }
  };

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

  const activeRequests = useMemo(() => bloodRequests.filter(r => r.status !== 'deleted'), [bloodRequests]);

  const filteredRequests = useMemo(() => {
    return activeRequests.filter(r => {
      if (filters.bloodType && r.blood_type_needed !== filters.bloodType) return false;
      if (filters.urgency && r.urgency_level !== filters.urgency) return false;
      if (filters.status && r.status !== filters.status) return false;
      return true;
    });
  }, [activeRequests, filters]);

  const upcomingDonations = useMemo(() => {
    return donations.filter(d => d.status === 'scheduled' || d.status === 'confirmed')
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  }, [donations]);
  
  const awaitingVerification = useMemo(() => {
    return donations.filter(d => d.donor_confirmed === true && d.status !== 'completed');
  }, [donations]);

  const analyticsData = useMemo(() => {
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

    const bloodTypeCounts = {};
    activeRequests.forEach(r => {
      bloodTypeCounts[r.blood_type_needed] = (bloodTypeCounts[r.blood_type_needed] || 0) + 1;
    });
    const maxBt = Math.max(...Object.values(bloodTypeCounts), 1);

    const total = activeRequests.length;
    const fulfilled = activeRequests.filter(r => r.status === 'completed').length;
    const rate = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

    return { months, maxMonthly, bloodTypeCounts, maxBt, rate, total, fulfilled };
  }, [donations, activeRequests]);

  const urgencyColor = (l) => ({ critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', moderate: 'bg-amber-100 text-amber-700', low: 'bg-emerald-100 text-emerald-700' }[l] || 'bg-gray-100 text-gray-700');
  const statusColor = (s) => ({ open: 'bg-blue-100 text-blue-700', matched: 'bg-purple-100 text-purple-700', in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-slate-100 text-slate-600', expired: 'bg-slate-100 text-slate-400' }[s] || 'bg-slate-100 text-slate-700');
  const donationStatusColor = (s) => ({ scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-indigo-100 text-indigo-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-slate-100 text-slate-600', no_show: 'bg-rose-100 text-rose-700' }[s] || 'bg-slate-100 text-slate-700');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Active Requests', value: stats.activeRequests, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                { label: 'Fulfilled', value: stats.fulfilledRequests, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'Total Requests', value: stats.totalRequests, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: 'Upcoming Appts', value: stats.upcomingDonations, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                { label: 'Completed', value: stats.completedDonations, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
                { label: 'Unique Donors', value: stats.uniqueDonors, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} className={`rounded-2xl p-5 border ${border} ${bg} backdrop-blur-xl bg-opacity-50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions & Verification Alert */}
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={() => { setFormData(f => ({ ...f, urgency_level: 'critical' })); setActiveTab('create'); }}
                className="group relative overflow-hidden flex-1 inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-bold rounded-2xl hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <PlusIcon className="h-5 w-5 mr-2 relative z-10" />
                <span className="relative z-10">Create Urgent Request</span>
              </button>
              
              {awaitingVerification.length > 0 && (
                <button onClick={() => setActiveTab('donations')}
                  className="group flex-1 inline-flex items-center justify-between px-6 py-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold rounded-2xl hover:bg-amber-100 transition-colors">
                  <div className="flex items-center">
                    <span className="relative flex h-3 w-3 mr-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    {awaitingVerification.length} Donation{awaitingVerification.length > 1 ? 's' : ''} Awaiting Verification
                  </div>
                  <ChevronRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upcoming Donations */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5 text-indigo-500" /> Upcoming Donations
                  </h3>
                  <button onClick={() => setActiveTab('donations')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                <div className="space-y-4 flex-1">
                  {upcomingDonations.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <CalendarDaysIcon className="h-12 w-12 mb-3 opacity-20" />
                      <p>No upcoming appointments</p>
                    </div>
                  ) : (
                    upcomingDonations.slice(0, 4).map(d => (
                      <div key={d.id} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-black shadow-inner">
                            {d.donors?.blood_type || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{d.profiles?.full_name || 'Donor'}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {new Date(d.scheduled_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${donationStatusColor(d.status)}`}>
                          {d.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Requests */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BeakerIcon className="h-5 w-5 text-rose-500" /> Recent Requests
                  </h3>
                  <button onClick={() => setActiveTab('requests')} className="text-sm font-semibold text-rose-600 hover:text-rose-700">Manage</button>
                </div>
                <div className="space-y-4 flex-1">
                  {activeRequests.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <BeakerIcon className="h-12 w-12 mb-3 opacity-20" />
                      <p>No active requests</p>
                    </div>
                  ) : (
                    activeRequests.slice(0, 4).map(req => {
                      // Calculate progress based on max_donors
                      // We can estimate filled donors by counting donations for this request that are not cancelled/no_show
                      const requestDonations = donations.filter(d => d.blood_request_id === req.id && !['cancelled', 'no_show'].includes(d.status));
                      const progress = Math.min((requestDonations.length / (req.max_donors || 1)) * 100, 100);

                      return (
                        <div key={req.id} className="p-4 rounded-2xl bg-slate-50 hover:bg-rose-50/50 border border-transparent hover:border-rose-100 transition-all duration-300">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-red-200 flex items-center justify-center text-red-700 font-black shadow-inner">
                                {req.blood_type_needed}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{req.units_needed} Unit{req.units_needed > 1 ? 's' : ''}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(req.status)}`}>{req.status}</span>
                          </div>
                          {/* Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <span>Donors</span>
                              <span>{requestDonations.length} / {req.max_donors || 1}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-rose-500 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'create':
        return (
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10">
              <div className="mb-8 border-b border-slate-100 pb-6">
                <h2 className="text-2xl font-black text-slate-900">Create Blood Request</h2>
                <p className="text-sm text-slate-500 mt-2">Publish a new requirement to notify eligible donors in your area.</p>
              </div>
              <form onSubmit={handleCreateRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Blood Type *</label>
                    <select value={formData.blood_type_needed} onChange={e => setFormData(p => ({ ...p, blood_type_needed: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-rose-500 focus:ring-rose-500 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-900 font-semibold appearance-none">
                      {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Urgency Level *</label>
                    <select value={formData.urgency_level} onChange={e => setFormData(p => ({ ...p, urgency_level: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-rose-500 focus:ring-rose-500 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-900 font-semibold appearance-none">
                      {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-rose-50/50 p-6 rounded-2xl border border-rose-100/50">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Units Needed *</label>
                    <input type="number" min={1} value={formData.units_needed}
                      onChange={e => setFormData(p => ({ ...p, units_needed: e.target.value }))}
                      className="w-full rounded-xl border border-rose-200 px-4 py-3 focus:border-rose-500 focus:ring-rose-500 bg-white text-slate-900 font-semibold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Max Donors Needed</label>
                    <input type="number" min={1} value={formData.max_donors}
                      onChange={e => setFormData(p => ({ ...p, max_donors: e.target.value }))}
                      className="w-full rounded-xl border border-rose-200 px-4 py-3 focus:border-rose-500 focus:ring-rose-500 bg-white text-slate-900 font-semibold" />
                    <p className="text-xs text-rose-500/70">Number of donors to fulfill this request</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Needed</label>
                    <input type="date" value={formData.date_needed}
                      onChange={e => setFormData(p => ({ ...p, date_needed: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-rose-500 focus:ring-rose-500 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-900 font-semibold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time Needed</label>
                    <input type="time" value={formData.time_needed}
                      onChange={e => setFormData(p => ({ ...p, time_needed: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-rose-500 focus:ring-rose-500 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-900 font-semibold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reason / Description</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Surgery scheduled, accident victim, thalassemia patient..." 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-rose-500 focus:ring-rose-500 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-900 font-semibold resize-none" />
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={creating}
                    className="w-full py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all transform hover:-translate-y-0.5">
                    {creating ? 'Publishing Request...' : 'Publish Blood Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case 'requests':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Type</span>
                  <select value={filters.bloodType} onChange={e => setFilters(f => ({ ...f, bloodType: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700 font-semibold focus:border-rose-500 focus:ring-rose-500 appearance-none">
                    <option value="">All</option>
                    {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Urgency</span>
                  <select value={filters.urgency} onChange={e => setFilters(f => ({ ...f, urgency: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700 font-semibold focus:border-rose-500 focus:ring-rose-500 appearance-none">
                    <option value="">All</option>
                    {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700 font-semibold focus:border-rose-500 focus:ring-rose-500 appearance-none">
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="matched">Matched</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                {(filters.bloodType || filters.urgency || filters.status) && (
                  <button onClick={() => setFilters({ bloodType: '', urgency: '', status: '' })}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider px-2 py-1 rounded hover:bg-rose-50 transition-colors">Clear Filters</button>
                )}
              </div>
            </div>

            {/* Requests Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredRequests.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
                  <p className="text-slate-500 font-medium">No requests match your filters.</p>
                </div>
              ) : (
                filteredRequests.map(req => {
                  const requestDonations = donations.filter(d => d.blood_request_id === req.id && !['cancelled', 'no_show'].includes(d.status));
                  const progress = Math.min((requestDonations.length / (req.max_donors || 1)) * 100, 100);

                  return (
                    <div key={req.id} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-red-200 flex items-center justify-center text-red-700 font-black text-xl shadow-inner">
                            {req.blood_type_needed}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-black text-slate-800">{req.units_needed} Unit{req.units_needed > 1 ? 's' : ''}</h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${urgencyColor(req.urgency_level)}`}>{req.urgency_level}</span>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-1">{req.description || 'No description provided'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Donor Responses</span>
                          <span className="text-sm font-black text-slate-700">{requestDonations.length} / {req.max_donors || 1}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div className={`h-2 rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-1"><ClockIcon className="h-4 w-4" /> {req.date_needed ? new Date(req.date_needed).toLocaleDateString() : 'Flexible'}</div>
                          <div className="flex items-center gap-1">Status: <span className={statusColor(req.status).split(' ')[1]}>{req.status.replace('_', ' ')}</span></div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {['open', 'matched', 'in_progress'].includes(req.status) && (
                          <>
                            <button onClick={() => { setEditingRequest(req); setEditForm({ units_needed: req.units_needed, max_donors: req.max_donors || 1, urgency_level: req.urgency_level, description: req.description || '', date_needed: req.date_needed || '', time_needed: req.time_needed || '' }); }}
                              className="flex-1 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">Edit</button>
                            <button onClick={() => handleStatusChange(req.id, 'completed')}
                              className="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">Complete</button>
                            <button onClick={() => handleStatusChange(req.id, 'cancelled')}
                              className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                          </>
                        )}
                        <button onClick={() => handleDelete(req.id)}
                          className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors">Delete</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Edit Modal */}
            {editingRequest && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={() => setEditingRequest(null)}>
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-black text-slate-900 mb-6">Edit Request</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Units Needed</label>
                        <input type="number" min={1} value={editForm.units_needed} onChange={e => setEditForm(f => ({ ...f, units_needed: parseInt(e.target.value, 10) }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-900 font-semibold focus:border-indigo-500 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Max Donors</label>
                        <input type="number" min={1} value={editForm.max_donors} onChange={e => setEditForm(f => ({ ...f, max_donors: parseInt(e.target.value, 10) }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-900 font-semibold focus:border-indigo-500 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Urgency</label>
                      <select value={editForm.urgency_level} onChange={e => setEditForm(f => ({ ...f, urgency_level: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-900 font-semibold focus:border-indigo-500 focus:ring-indigo-500">
                        {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
                        <input type="date" value={editForm.date_needed} onChange={e => setEditForm(f => ({ ...f, date_needed: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-900 font-semibold focus:border-indigo-500 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time</label>
                        <input type="time" value={editForm.time_needed} onChange={e => setEditForm(f => ({ ...f, time_needed: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-900 font-semibold focus:border-indigo-500 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button onClick={handleEditSave} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">Save Changes</button>
                      <button onClick={() => setEditingRequest(null)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'donations':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Awaiting Verification Banner */}
            {awaitingVerification.length > 0 && (
              <div className="bg-gradient-to-r from-amber-100 to-yellow-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-black text-amber-900 mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="h-6 w-6 text-amber-600" /> Donors Awaiting Verification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {awaitingVerification.map(d => (
                    <div key={d.id} className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-amber-100 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black">
                            {d.donors?.blood_type || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{d.profiles?.full_name}</p>
                            <p className="text-xs text-amber-600 font-semibold">Self-reported complete</p>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setCompletingDonation(d.id); setCompletionUnits(1); }}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all">
                        Verify & Complete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Donations */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900">All Appointments</h2>
              </div>
              {donations.length === 0 ? (
                <div className="text-center py-20">
                  <CalendarDaysIcon className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No donations scheduled yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Donor</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {donations.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {d.profiles?.avatar_url ? (
                                <img src={d.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-black shadow-sm">
                                  {d.profiles?.full_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-slate-800">{d.profiles?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-slate-500 font-medium">{d.profiles?.phone_number || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-red-100 text-red-700 font-black shadow-inner">
                              {d.donors?.blood_type || '?'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-700">{new Date(d.scheduled_date).toLocaleDateString()}</p>
                            <p className="text-xs text-slate-500 font-medium">{new Date(d.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${donationStatusColor(d.status)}`}>
                              {d.status.replace('_', ' ')}
                            </span>
                            {d.donor_confirmed && d.status !== 'completed' && (
                              <p className="text-[10px] font-bold text-amber-600 mt-1 uppercase tracking-wider">Awaiting Verification</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {d.status === 'scheduled' && (
                                <button onClick={() => handleDonationAction(d.id, 'confirmed')}
                                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">Confirm</button>
                              )}
                              {(d.status === 'scheduled' || d.status === 'confirmed') && (
                                <>
                                  <button onClick={() => { setCompletingDonation(d.id); setCompletionUnits(1); }}
                                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">Verify</button>
                                  <button onClick={() => handleDonationAction(d.id, 'no_show')}
                                    className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">No Show</button>
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
            </div>

            {/* Complete Donation Modal */}
            {completingDonation && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={() => setCompletingDonation(null)}>
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-6 mx-auto">
                    <CheckCircleIcon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 text-center">Verify Donation</h3>
                  <p className="text-sm text-slate-500 mb-6 text-center">Enter the units collected to complete this process.</p>
                  
                  <div className="space-y-6">
                    <div className="space-y-2 text-center">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Units Collected</label>
                      <input type="number" min={1} value={completionUnits}
                        onChange={e => setCompletionUnits(parseInt(e.target.value, 10) || 1)}
                        className="w-full text-center text-3xl font-black rounded-2xl border border-emerald-200 px-4 py-4 bg-emerald-50/50 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <button onClick={() => { handleDonationAction(completingDonation, 'completed', completionUnits); setCompletingDonation(null); }}
                        className="w-full py-4 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5">
                        Complete Donation
                      </button>
                      <button onClick={() => setCompletingDonation(null)}
                        className="w-full py-4 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 p-8">
                <h3 className="text-lg font-black text-slate-900 mb-6">Monthly Collection</h3>
                <div className="flex items-end justify-between h-48 gap-2">
                  {analyticsData.months.map(m => (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</span>
                      <div className="w-full max-w-[40px] bg-gradient-to-t from-indigo-100 to-indigo-500 rounded-t-xl transition-all duration-500 group-hover:shadow-lg group-hover:shadow-indigo-500/20"
                        style={{ height: `${(m.count / analyticsData.maxMonthly) * 120}px`, minHeight: '8px' }} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blood Type Demand */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 p-8">
                <h3 className="text-lg font-black text-slate-900 mb-6">Blood Type Demand</h3>
                <div className="space-y-4">
                  {BLOOD_TYPES.map(bt => {
                    const count = analyticsData.bloodTypeCounts[bt] || 0;
                    return (
                      <div key={bt} className="flex items-center gap-4">
                        <span className="w-10 text-sm font-black text-slate-700">{bt}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.max((count / analyticsData.maxBt) * 100, count > 0 ? 5 : 0)}%` }}>
                          </div>
                        </div>
                        <span className="w-8 text-right text-xs font-bold text-slate-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fulfillment Rate */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-emerald-500 opacity-10 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                <div className="relative w-40 h-40">
                  <svg className="w-40 h-40 transform -rotate-90 drop-shadow-xl" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                    <circle cx="64" cy="64" r="56" fill="none" stroke="#10b981" strokeWidth="12"
                      strokeDasharray={`${analyticsData.rate * 3.52} 352`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-white">{analyticsData.rate}%</span>
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-white mb-2">Fulfillment Rate</h3>
                  <p className="text-slate-400 font-medium mb-4">{analyticsData.fulfilled} of {analyticsData.total} requests successfully fulfilled</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-emerald-400 text-sm font-bold">
                    <CheckCircleIcon className="h-5 w-5" /> Excellent standing
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-8 border-b border-slate-200/60 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Institution Profile</h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Manage your public information</p>
                </div>
                {!profileEditing ? (
                  <button onClick={() => setProfileEditing(true)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-indigo-700 bg-white border border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={handleProfileSave} disabled={profileSaving}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all">
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => { setProfileEditing(false); if (institutionProfile) setProfileForm({ institution_name: institutionProfile.name || '', email: institutionProfile.email || '', phone: institutionProfile.phone || '', website: institutionProfile.website || '', address: institutionProfile.address || '' }); }}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="p-8">
                {institutionProfile ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { label: 'Institution Name', key: 'institution_name', type: 'text' },
                        { label: 'Email Address', key: 'email', type: 'email' },
                        { label: 'Phone Number', key: 'phone', type: 'text' },
                        { label: 'Website', key: 'website', type: 'text' },
                        { label: 'Full Address', key: 'address', type: 'text' },
                      ].map(({ label, key, type }) => (
                        <div key={key} className={key === 'address' ? 'md:col-span-2' : ''}>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
                          {profileEditing ? (
                            <input type={type} value={profileForm[key] || ''}
                              onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-900 font-semibold focus:border-indigo-500 focus:ring-indigo-500 transition-colors" />
                          ) : (
                            <p className="text-base text-slate-800 font-bold bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3">{profileForm[key] || '—'}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Type</label>
                        <p className="text-sm text-slate-800 font-bold capitalize">{institutionProfile.type || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white shadow-sm border border-slate-100">
                          {institutionProfile.verified ? (
                            <><CheckCircleIcon className="h-4 w-4 text-emerald-500" /> <span className="text-emerald-700">Verified</span></>
                          ) : (
                            <><ClockIcon className="h-4 w-4 text-amber-500" /> <span className="text-amber-700">Pending Review</span></>
                          )}
                        </div>
                      </div>
                    </div>

                    {institutionProfile.contactPerson && (
                      <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-black text-slate-900 mb-4">Primary Contact</h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
                            <p className="text-sm text-slate-800 font-bold">{institutionProfile.contactPerson.name}</p>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role</label>
                            <p className="text-sm text-slate-500 font-semibold">{institutionProfile.contactPerson.role}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-rose-200">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-slate-100 flex flex-col z-20">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">iDonate</h1>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-11">Institution</p>
          </div>
          
          <nav className="flex-1 mt-6 px-4 space-y-1.5 overflow-y-auto">
            {[
              { key: 'home', icon: HomeIcon, label: 'Overview' },
              { key: 'create', icon: PlusIcon, label: 'Create Request' },
              { key: 'requests', icon: ClipboardDocumentListIcon, label: 'Manage Requests' },
              { key: 'donations', icon: CalendarDaysIcon, label: 'Appointments' },
              { key: 'analytics', icon: ChartBarIcon, label: 'Analytics' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`group flex items-center w-full px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  activeTab === key 
                    ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-100/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}>
                <Icon className={`h-5 w-5 mr-3 transition-colors ${activeTab === key ? 'text-rose-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {label}
                {key === 'donations' && awaitingVerification.length > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] py-0.5 px-2 rounded-full font-black shadow-sm">
                    {awaitingVerification.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 mt-auto">
            <button onClick={() => setActiveTab('profile')}
              className={`flex items-center w-full p-3 rounded-2xl transition-all duration-300 border ${activeTab === 'profile' ? 'bg-slate-50 border-slate-200' : 'border-transparent hover:bg-slate-50'}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 border border-slate-200/50 shadow-sm">
                <UserCircleIcon className="h-6 w-6" />
              </div>
              <div className="ml-3 text-left overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{institutionProfile?.name || 'Institution'}</p>
                <p className="text-xs font-semibold text-slate-500 truncate">Settings & Profile</p>
              </div>
            </button>
            <button onClick={handleLogout}
              className="mt-3 flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors">
              Log out
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {/* Header */}
          <header className="h-24 bg-white/60 backdrop-blur-md border-b border-slate-100/50 flex items-center justify-between px-8 z-10 sticky top-0">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {{ home: 'Overview', create: 'Create Request', requests: 'Manage Requests', donations: 'Appointments', analytics: 'Analytics', profile: 'Institution Profile' }[activeTab]}
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <button onClick={handleToggleNotifications}
                  className="relative p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:shadow-sm transition-all focus:outline-none">
                  <BellIcon className="h-5 w-5" />
                  {newActivityCount > 0 && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 text-white text-[10px] font-black items-center justify-center ring-2 ring-white">
                        {Math.min(newActivityCount, 9)}
                      </span>
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-14 w-96 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4">
                    <div className="p-5 border-b border-slate-100/60 bg-white/50 flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">Recent Activity</h3>
                      {newActivityCount > 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">{newActivityCount} New</span>}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {activity.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm font-medium flex flex-col items-center">
                          <BellIcon className="h-8 w-8 mb-2 opacity-20" />
                          All caught up!
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {activity.slice(0, 10).map(a => (
                            <div key={a.id} className="p-4 hover:bg-slate-50/80 transition-colors flex gap-4 items-start">
                              <div className={`w-2 h-2 mt-1.5 rounded-full ${new Date(a.created_at) > new Date(lastSeenRef.current || 0) ? 'bg-rose-500' : 'bg-slate-200'}`}></div>
                              <div>
                                <p className="text-sm text-slate-700 leading-snug">
                                  <span className="font-bold text-slate-900">{a.profiles?.full_name || 'A donor'}</span>
                                  {' '}{a.status === 'scheduled' ? 'booked an appointment' : a.status === 'confirmed' ? 'confirmed their appointment' : a.status === 'completed' ? 'completed a donation' : a.status === 'cancelled' ? 'cancelled their appointment' : 'updated their appointment'}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">{new Date(a.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-8 relative">
            <div className="max-w-7xl mx-auto">
              {loading && !stats.totalRequests ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mb-4"></div>
                  <p className="font-semibold">Loading your dashboard...</p>
                </div>
              ) : (
                renderContent()
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;