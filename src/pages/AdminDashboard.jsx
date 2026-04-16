import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  getPlatformStats,
  getAllInstitutions,
  getInstitutionsByStatus,
  updateInstitutionStatus,
  getAllUsers,
  getAllBloodRequests,
} from '../services/supabaseService';
import { logoutAdmin, getCurrentAdmin } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import {
  BuildingOfficeIcon,
  DocumentIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  HomeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  ChevronRightIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

// ─── Tabs ───────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Overview', icon: HomeIcon },
  { key: 'institutions', label: 'Institutions', icon: BuildingOfficeIcon },
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'requests', label: 'Blood Requests', icon: ClipboardDocumentListIcon },
  { key: 'settings', label: 'Settings', icon: Cog6ToothIcon },
];

const INST_FILTERS = ['all', 'pending', 'approved', 'rejected', 'suspended'];

const urgencyColor = (u) => {
  const map = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', moderate: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };
  return map[u] || 'bg-gray-100 text-gray-600';
};
const statusColor = (s) => {
  const map = { 
    open: 'bg-blue-100 text-blue-700',
    matched: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-600',
    expired: 'bg-gray-100 text-gray-400',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-orange-100 text-orange-700'
  };
  return map[s] || 'bg-gray-100 text-gray-600';
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const admin = getCurrentAdmin();
  const [activeTab, setActiveTab] = useState('overview');

  // Data
  const [stats, setStats] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [users, setUsers] = useState([]);
  const [bloodRequests, setBloodRequests] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [instFilter, setInstFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestUrgencyFilter, setRequestUrgencyFilter] = useState('all');

  // Notification bell state
  const [notifOpen, setNotifOpen] = useState(false);
  const [newPendingCount, setNewPendingCount] = useState(0);
  const [pendingNotifs, setPendingNotifs] = useState([]);
  const loadAllDataRef = useRef(null);

  // ─── Notification helpers ─────────────────────────────────────
  const recalcNewPending = useCallback((instList) => {
    const lastSeen = localStorage.getItem('admin_notif_lastSeen') || '1970-01-01T00:00:00Z';
    const pending = instList.filter(i => i.status === 'pending');
    const newOnes = pending.filter(i => new Date(i.createdAt) > new Date(lastSeen));
    setNewPendingCount(newOnes.length);
    setPendingNotifs(pending);
  }, []);

  const handleNotifToggle = () => {
    if (notifOpen) {
      // Closing — mark as seen
      localStorage.setItem('admin_notif_lastSeen', new Date().toISOString());
      setNewPendingCount(0);
    }
    setNotifOpen(!notifOpen);
  };

  // ─── Data Loading ───────────────────────────────────────────────
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getPlatformStats(),
        getAllInstitutions(),
        getAllUsers(),
        getAllBloodRequests(),
      ]);
      if (results[0].status === 'fulfilled') setStats(results[0].value);
      if (results[1].status === 'fulfilled') setInstitutions(results[1].value);
      if (results[2].status === 'fulfilled') setUsers(results[2].value);
      if (results[3].status === 'fulfilled') setBloodRequests(results[3].value);
      // Log any failures
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[Admin] Query ${i} failed:`, r.reason);
      });
    } catch (err) {
      console.error('[Admin] Load error:', err);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
      // Update notification badge after load
      if (institutions.length > 0 || !loading) {
        // Will be called again after state updates via the effect below
      }
    }
  };

  // Keep loadAllDataRef current for realtime callback
  loadAllDataRef.current = loadAllData;

  // Recalc notifications whenever institutions data changes
  useEffect(() => {
    if (institutions.length > 0 || !loading) {
      recalcNewPending(institutions);
    }
  }, [institutions, loading, recalcNewPending]);

  // ─── Realtime subscription for new institutions ─────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-institutions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => {
        // Refresh all data when institutions table changes
        if (loadAllDataRef.current) loadAllDataRef.current();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Institution Actions ────────────────────────────────────────
  const handleStatusUpdate = async (institutionId, status) => {
    const actionLabels = { approved: 'approve', rejected: 'reject', suspended: 'suspend' };
    const label = actionLabels[status] || status;
    if (!window.confirm(`Are you sure you want to ${label} this institution?`)) return;

    try {
      await updateInstitutionStatus(institutionId, status);
      toast.success(`Institution ${status} successfully`);
      setSelectedInstitution(null);
      // Refresh
      const instData = await getAllInstitutions();
      setInstitutions(instData);
      const statsData = await getPlatformStats();
      setStats(statsData);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const handleDownloadDocument = async (url, filename) => {
    try {
      const filePath = url.split('/').pop();
      const fullPath = `institutions/${filePath}`;
      const { data, error } = await supabase.storage.from('idonate').download(fullPath);
      if (error) throw new Error(`Download failed: ${error.message}`);
      const blob = new Blob([data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Document downloaded');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ─── Filtered Data ──────────────────────────────────────────────
  const filteredInstitutions = useMemo(() => {
    if (instFilter === 'all') return institutions;
    return institutions.filter(i => i.status === instFilter);
  }, [institutions, instFilter]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (userRoleFilter !== 'all') {
      result = result.filter(u => u.user_type === userRoleFilter);
    }
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      result = result.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, userRoleFilter, userSearch]);

  const filteredRequests = useMemo(() => {
    let result = bloodRequests;
    if (requestStatusFilter !== 'all') {
      result = result.filter(r => r.status === requestStatusFilter);
    }
    if (requestUrgencyFilter !== 'all') {
      result = result.filter(r => r.urgency_level === requestUrgencyFilter);
    }
    return result;
  }, [bloodRequests, requestStatusFilter, requestUrgencyFilter]);

  // ─── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // ─── Overview Tab ───────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Platform Overview</h2>
        <p className="text-sm text-gray-500">Key metrics across the iDonate platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Donors', value: stats?.totalDonors, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Institutions', value: stats?.totalInstitutions, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Approval', value: stats?.pendingInstitutions, color: 'text-yellow-600', bg: 'bg-yellow-50', action: () => { setActiveTab('institutions'); setInstFilter('pending'); } },
          { label: 'Active Requests', value: stats?.activeRequests, color: 'text-orange-600', bg: 'bg-orange-50', action: () => { setActiveTab('requests'); setRequestStatusFilter('pending'); } },
          { label: 'Completed Donations', value: stats?.completedDonations, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, color, bg, action }) => (
          <div
            key={label}
            onClick={action}
            className={`${bg} rounded-xl p-5 ${action ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow border border-gray-100`}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold ${color} mt-2`}>{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Approved Institutions', value: stats?.approvedInstitutions },
          { label: 'Suspended', value: stats?.suspendedInstitutions },
          { label: 'Total Requests', value: stats?.totalRequests },
          { label: 'Total Donations', value: stats?.totalDonations },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setActiveTab('institutions'); setInstFilter('pending'); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium">
            <ClockIcon className="h-4 w-4" />
            Review Pending ({stats?.pendingInstitutions || 0})
          </button>
          <button onClick={() => { setActiveTab('requests'); setRequestStatusFilter('pending'); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Active Requests ({stats?.activeRequests || 0})
          </button>
          <button onClick={() => { setActiveTab('users'); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
            <UsersIcon className="h-4 w-4" />
            Manage Users ({users.length})
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Institutions Tab ───────────────────────────────────────────
  const renderInstitutions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Institutions</h2>
          <p className="text-sm text-gray-500">{filteredInstitutions.length} institution{filteredInstitutions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {INST_FILTERS.map(f => {
          const count = f === 'all' ? institutions.length : institutions.filter(i => i.status === f).length;
          return (
            <button key={f} onClick={() => setInstFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${instFilter === f ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Institution List */}
      {filteredInstitutions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No institutions found for this filter</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Name', 'Type', 'Location', 'Status', 'Registered', 'Actions'].map(h => (
                    <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInstitutions.map(inst => (
                  <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{inst.name}</p>
                      <p className="text-xs text-gray-400">{inst.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{inst.type || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inst.location?.city && inst.location?.region ? `${inst.location.city}, ${inst.location.region}` : inst.address || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(inst.status)}`}>{inst.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(inst.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelectedInstitution(inst)}
                        className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Users Tab ──────────────────────────────────────────────────
  const renderUsers = () => {
    const roles = ['all', ...new Set(users.map(u => u.user_type).filter(Boolean))];
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
          </div>
          <div className="flex gap-2">
            {roles.map(r => (
              <button key={r} onClick={() => setUserRoleFilter(r)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${userRoleFilter === r ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                {r === 'all' ? 'All' : r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Name', 'Email', 'Role', 'Blood Type', 'Joined'].map(h => (
                    <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.slice(0, 100).map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs flex-shrink-0">
                          {(user.full_name || '?')[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.user_type === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.user_type === 'institution' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {user.user_type || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      {user.donors?.[0]?.blood_type || user.donors?.blood_type || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length > 100 && (
            <div className="p-4 text-center text-sm text-gray-400 border-t border-gray-100">
              Showing first 100 of {filteredUsers.length} users
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Blood Requests Tab ─────────────────────────────────────────
  const renderRequests = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Blood Requests</h2>
        <p className="text-sm text-gray-500">{filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {['all', 'open', 'matched', 'in_progress', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => setRequestStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${requestStatusFilter === s ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['all', 'critical', 'high', 'moderate', 'low'].map(u => (
            <button key={u} onClick={() => setRequestUrgencyFilter(u)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${requestUrgencyFilter === u ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {u === 'all' ? 'All Urgency' : u.charAt(0).toUpperCase() + u.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No requests match your filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Blood Type', 'Units', 'Patient', 'Description', 'Urgency', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.slice(0, 100).map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-100 text-red-700 font-bold text-sm">{req.blood_type_needed}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.units_needed}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{req.patient_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                      <span className="line-clamp-1">{req.description || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${urgencyColor(req.urgency_level)}`}>{req.urgency_level}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(req.status)}`}>{req.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {req.date_needed ? new Date(req.date_needed).toLocaleDateString() : new Date(req.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredRequests.length > 100 && (
          <div className="p-4 text-center text-sm text-gray-400 border-t border-gray-100">
            Showing first 100 of {filteredRequests.length} requests
          </div>
        )}
      </div>
    </div>
  );

  // ─── Settings Tab ───────────────────────────────────────────────
  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Settings</h2>

      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Profile</h3>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{admin?.full_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{admin?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="mt-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Admin</span>
            </dd>
          </div>
        </dl>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <button onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Content Router ─────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'institutions': return renderInstitutions();
      case 'users': return renderUsers();
      case 'requests': return renderRequests();
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
  };

  // ─── Main Layout ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-red-600">iDonate</h1>
              <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
            </div>
            <div className="relative">
              <button onClick={handleNotifToggle}
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <BellIcon className="h-5 w-5" />
                {newPendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                    {newPendingCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Pending Approvals</h3>
                    <span className="text-xs text-gray-400">{pendingNotifs.length} total</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {pendingNotifs.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-400">No pending institutions</div>
                    ) : (
                      pendingNotifs.map(inst => (
                        <button key={inst.id}
                          onClick={() => { setSelectedInstitution(inst); setNotifOpen(false); localStorage.setItem('admin_notif_lastSeen', new Date().toISOString()); setNewPendingCount(0); }}
                          className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                              <BuildingOfficeIcon className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{inst.name}</p>
                              <p className="text-xs text-gray-400">{inst.type || 'Institution'} · {new Date(inst.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">Review</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {pendingNotifs.length > 0 && (
                    <div className="p-3 border-t border-gray-100">
                      <button onClick={() => { setActiveTab('institutions'); setInstFilter('pending'); setNotifOpen(false); localStorage.setItem('admin_notif_lastSeen', new Date().toISOString()); setNewPendingCount(0); }}
                        className="w-full text-center text-xs font-medium text-red-600 hover:text-red-700 py-1">
                        View all in Institutions tab →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-red-50 text-red-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <Icon className="h-5 w-5" />
              {label}
              {key === 'institutions' && stats?.pendingInstitutions > 0 && (
                <span className="ml-auto bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {stats.pendingInstitutions}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
              {(admin?.full_name || 'A')[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{admin?.full_name || 'Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{admin?.email || ''}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {renderContent()}
        </div>
      </main>

      {/* Institution Detail Modal */}
      {selectedInstitution && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedInstitution.name}</h2>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(selectedInstitution.status)}`}>
                      {selectedInstitution.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedInstitution(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Institution Details</h3>
                  <dl className="space-y-3">
                    {[
                      { label: 'Type', value: selectedInstitution.type },
                      { label: 'Email', value: selectedInstitution.email },
                      { label: 'Phone', value: selectedInstitution.phone },
                      { label: 'Location', value: selectedInstitution.location?.city && selectedInstitution.location?.region ? `${selectedInstitution.location.city}, ${selectedInstitution.location.region}` : selectedInstitution.address },
                      { label: 'License Number', value: selectedInstitution.licenseNumber },
                      { label: 'Website', value: selectedInstitution.website, isLink: true },
                      { label: 'Contact Person', value: selectedInstitution.contactPerson ? `${selectedInstitution.contactPerson.name} (${selectedInstitution.contactPerson.role})` : null },
                      { label: 'Registered', value: selectedInstitution.createdAt ? new Date(selectedInstitution.createdAt).toLocaleDateString() : null },
                      { label: 'Verified At', value: selectedInstitution.verifiedAt ? new Date(selectedInstitution.verifiedAt).toLocaleDateString() : null },
                    ].map(({ label, value, isLink }) => value ? (
                      <div key={label}>
                        <dt className="text-xs font-medium text-gray-400 uppercase">{label}</dt>
                        <dd className="mt-0.5 text-sm text-gray-900">
                          {isLink ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">{value}</a> : value}
                        </dd>
                      </div>
                    ) : null)}
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Accreditation Document</h3>
                  {selectedInstitution.documents?.license ? (
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center mb-4 gap-3">
                        <DocumentIcon className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedInstitution.documents.license.name}</p>
                          <p className="text-xs text-gray-500">{selectedInstitution.documents.license.type}</p>
                        </div>
                      </div>
                      <iframe src={selectedInstitution.documents.license.url} title="PDF Preview"
                        width="100%" height="250px" style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <div className="flex gap-3 mt-4">
                        <a href={selectedInstitution.documents.license.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                          View in New Tab
                        </a>
                        <button onClick={() => handleDownloadDocument(selectedInstitution.documents.license.url, selectedInstitution.documents.license.name)}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors">
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 text-sm">
                      No document uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                {selectedInstitution.status === 'pending' && (
                  <>
                    <button onClick={() => handleStatusUpdate(selectedInstitution.id, 'rejected')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors">
                      <XCircleIcon className="h-4 w-4" /> Reject
                    </button>
                    <button onClick={() => handleStatusUpdate(selectedInstitution.id, 'approved')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors">
                      <CheckCircleIcon className="h-4 w-4" /> Approve
                    </button>
                  </>
                )}
                {selectedInstitution.status === 'approved' && (
                  <button onClick={() => handleStatusUpdate(selectedInstitution.id, 'suspended')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 transition-colors">
                    <NoSymbolIcon className="h-4 w-4" /> Suspend
                  </button>
                )}
                {selectedInstitution.status === 'suspended' && (
                  <button onClick={() => handleStatusUpdate(selectedInstitution.id, 'approved')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors">
                    <CheckCircleIcon className="h-4 w-4" /> Unsuspend
                  </button>
                )}
                {selectedInstitution.status === 'rejected' && (
                  <button onClick={() => handleStatusUpdate(selectedInstitution.id, 'approved')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors">
                    <CheckCircleIcon className="h-4 w-4" /> Re-approve
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;