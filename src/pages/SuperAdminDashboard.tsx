
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, School, Users, Calendar, Briefcase, Megaphone, 
  CheckSquare, BarChart3, Settings, ScrollText, TrendingUp, 
  ArrowUpRight, Clock, Download, Search, Filter, MoreVertical,
  UserPlus, Mail, Shield, UserX, ExternalLink, XCircle, Plus, X, Trash2, Edit,
  User, CheckCircle2, AlertCircle, Camera, Upload, ArrowLeft
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { UniGuildData } from '../data';
import DashboardShell from '../components/DashboardShell';
import { motion, AnimatePresence } from 'motion/react';
import QRScanner from '../components/QRScanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TableSkeleton, MetricsGridSkeleton, GridSkeleton } from '../components/SkeletonLoader';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'colleges', label: 'Colleges', icon: <School size={20} /> },
  { id: 'users', label: 'Users', icon: <Users size={20} /> },
  { id: 'events', label: 'Events', icon: <Calendar size={20} /> },
  { id: 'jobs', label: 'Jobs', icon: <Briefcase size={20} /> },
  { id: 'announcements', label: 'Announcements', icon: <Megaphone size={20} /> },
  { id: 'approvals', label: 'Approvals', icon: <CheckSquare size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  { id: 'audit', label: 'Audit Logs', icon: <ScrollText size={20} /> },
];

function mapJobPayload(jobData: any) {
  return {
    title: jobData.title,
    company: jobData.company,
    logo: jobData.logo || '',
    location: jobData.location || '',
    type: jobData.type || 'Full-time',
    salary: jobData.salary || '',
    description: jobData.description || '',
    requirements: Array.isArray(jobData.requirements) ? jobData.requirements : [],
    skills: Array.isArray(jobData.skills) ? jobData.skills : [],
    is_paid: jobData.isPaid !== undefined ? jobData.isPaid : jobData.is_paid !== undefined ? jobData.is_paid : true,
    stipend: jobData.stipend || '',
    deadline: jobData.deadline && !isNaN(new Date(jobData.deadline).getTime()) 
      ? new Date(jobData.deadline).toISOString() 
      : null,
    app_link: jobData.appLink || jobData.app_link || '',
    website: jobData.website || '',
    domain: jobData.domain || '',
    target_audience: jobData.targetAudience || 'All Students',
    target_section: jobData.targetSection || 'All',
    target_branch: jobData.targetBranch || 'All',
    target_year: jobData.targetYear || 'All',
    target_institution: jobData.targetInstitution || 'All',
  };
}

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean, title: string, message: string, placeholder: string, onConfirm: (value: string) => void } | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [admin, setAdmin] = useState({
    name: 'Admin User',
    email: 'admin@uniguild.com',
    role: 'Super Admin',
    avatar: 'https://i.pravatar.cc/300?u=admin'
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPostingJob, setIsPostingJob] = useState(false);

  const { currentUser } = useAuth();

  const handleSaveProfile = () => {
    setNotification({ message: 'Profile updated successfully!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSendAnnouncement = async (data: any) => {
    try {
      const allowedPriority = ['Low', 'Normal', 'High', 'Urgent'];
      const normalizedPriority = allowedPriority.includes(data.priority) ? data.priority : 'Normal';
      const { error } = await supabase.from('notifications').insert({
        ...data,
        priority: normalizedPriority,
        user_id: 'all',
        read: false,
        created_at: new Date().toISOString(),
        type: 'announcement'
      });

      if (error) {
        setNotification({ message: `Announcement failed: ${error.message}`, type: 'error' });
        setTimeout(() => setNotification(null), 3500);
        return;
      }

      setNotification({ message: 'Announcement sent successfully!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setNotification({ message: `Announcement failed: ${message}`, type: 'error' });
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const [jobs, setJobs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (data) setJobs(data.map((j: any) => ({ ...j, appLink: j.app_link, isPaid: j.is_paid, applicationsCount: j.applications_count, createdBy: j.created_by, createdAt: j.created_at })));
    };
    fetchJobs();
    const channel = supabase.channel('admin_jobs').on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchJobs()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .neq('status', 'archived')
        .order('date', { ascending: false });
      if (data) setEvents(data.map((e: any) => ({ ...e, bannerUrl: e.banner_url, targetAudience: e.target_audience, createdBy: e.created_by, createdAt: e.created_at })));
    };
    fetchEvents();
    const channel = supabase.channel('admin_events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchNotifs = async () => {
      const { data } = await supabase.from('notifications').select('*').or(`user_id.eq.${currentUser.uid},user_id.eq.all`).order('created_at', { ascending: false }).limit(20);
      if (data) setNotifications(data.map((n: any) => ({ ...n, createdAt: n.created_at, userId: n.user_id })));
    };
    fetchNotifs();
    const channel = supabase.channel('admin_notifs').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchNotifs()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.uid]);

  const handleCreateEvent = async (eventData: any): Promise<boolean> => {
    setIsPublishing(true);
    
    try {
      const eventDate = eventData.startDate || eventData.date;
      const formattedDate = (eventDate && !isNaN(new Date(eventDate).getTime()))
        ? new Date(eventDate).toISOString()
        : new Date().toISOString();
      const { error } = await supabase.from('events').insert({
        name: eventData.name,
        title: eventData.name,
        category: eventData.category || 'Hackathon',
        host: eventData.host || 'All',
        location: eventData.location || '',
        description: eventData.description || '',
        date: formattedDate,
        start_date: (eventData.startDate && !isNaN(new Date(eventData.startDate).getTime())) ? new Date(eventData.startDate).toISOString() : null,
        end_date: (eventData.endDate && !isNaN(new Date(eventData.endDate).getTime())) ? new Date(eventData.endDate).toISOString() : null,
        banner_url: eventData.bannerUrl || '',
        coordinator_email: eventData.coordinatorEmail || '',
        registration_type: eventData.registrationType || 'single',
        max_team_size: parseInt(eventData.maxTeamSize) || 1,
        target_audience: eventData.targetAudience || 'All Students',
        created_by: currentUser?.uid,
        created_at: new Date().toISOString(),
        status: 'Upcoming',
        slots: { filled: 0, total: parseInt(eventData.capacity) || 100 }
      });

      if (error) {
        setNotification({ message: `Event creation failed: ${error.message}`, type: 'error' });
        setTimeout(() => setNotification(null), 3500);
        return false;
      }

      setNotification({ message: 'Event created successfully!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setNotification({ message: `Event creation failed: ${message}`, type: 'error' });
      setTimeout(() => setNotification(null), 3500);
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePostJob = async (jobData: any): Promise<boolean> => {
    setIsPostingJob(true);
    
    try {
      const { error } = await supabase.from('jobs').insert({
        ...mapJobPayload(jobData),
        created_by: currentUser?.uid,
        created_at: new Date().toISOString(),
        applications_count: 0
      });

      if (error) {
        setNotification({ message: `Job posting failed: ${error.message}`, type: 'error' });
        setTimeout(() => setNotification(null), 3500);
        return false;
      }

      setNotification({ message: 'Job posted successfully!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setNotification({ message: `Job posting failed: ${message}`, type: 'error' });
      setTimeout(() => setNotification(null), 3500);
      return false;
    } finally {
      setIsPostingJob(false);
    }
  };

  const handleUpdateJob = async (jobData: any) => {
    try {
      const { id } = jobData;
      const { error } = await supabase.from('jobs').update({
        ...mapJobPayload(jobData)
      }).eq('id', id);
      if (error) {
        setNotification({ message: `Job update failed: ${error.message}`, type: 'error' });
        setTimeout(() => setNotification(null), 3500);
        return;
      }
      setNotification({ message: 'Job updated successfully!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setNotification({ message: `Job update failed: ${message}`, type: 'error' });
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) {
        setNotification({ message: `Event deletion failed: ${error.message}`, type: 'error' });
        setTimeout(() => setNotification(null), 3500);
        return;
      }
      setNotification({ message: 'Event deleted successfully!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({ message: 'Event deletion failed. Please try again.', type: 'error' });
    }
  };

  const handleClearAllEvents = async () => {
    if (events.length === 0) return;
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'archived' })
        .in('id', events.map(e => e.id));
      
      if (error) {
        setNotification({ message: `Failed to clear events: ${error.message}`, type: 'error' });
        return;
      }
      setEvents([]);
      setNotification({ message: 'All events cleared from your view', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Failed to clear events', type: 'error' });
    }
  };

  const handleClearAllJobs = async () => {
    if (jobs.length === 0) return;
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'archived' })
        .in('id', jobs.map(j => j.id));
      
      if (error) {
        setNotification({ message: `Failed to clear jobs: ${error.message}`, type: 'error' });
        return;
      }
      setJobs([]);
      setNotification({ message: 'All jobs cleared from your view', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Failed to clear jobs', type: 'error' });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', jobId);
      if (error) {
        setNotification({ message: `Job deletion failed: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Job deleted successfully!', type: 'success' });
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (error) {
      setNotification({ message: 'Job deletion failed', type: 'error' });
    }
  };

  const renderTabContent = () => {
    const tabs: Record<string, React.ReactNode> = {
      overview: <OverviewTab />,
      colleges: <CollegesTab setNotification={setNotification} setConfirmModal={setConfirmModal} setPromptModal={setPromptModal} />,
      users: <UsersTab setNotification={setNotification} setConfirmModal={setConfirmModal} setPromptModal={setPromptModal} />,
      events: <EventsTab events={events} onPost={handleCreateEvent} onDeleteEvent={handleDeleteEvent} onClearAll={handleClearAllEvents} isPublishing={isPublishing} setNotification={setNotification} setConfirmModal={setConfirmModal} />,
      jobs: <JobsTab jobs={jobs} onPost={handlePostJob} onUpdate={handleUpdateJob} onDeleteJob={handleDeleteJob} onClearAll={handleClearAllJobs} isPosting={isPostingJob} setNotification={setNotification} />,
      announcements: <AnnouncementsTab onSend={handleSendAnnouncement} setNotification={setNotification} setConfirmModal={setConfirmModal} setPromptModal={setPromptModal} />,
      approvals: <ApprovalsTab setNotification={setNotification} setConfirmModal={setConfirmModal} />,
      analytics: <AnalyticsTab />,
      certificates: <CertificatesTab setNotification={setNotification} setConfirmModal={setConfirmModal} />,
      profile: <ProfileTab admin={admin} setAdmin={setAdmin} onSave={handleSaveProfile} />,
      settings: <SettingsTab setNotification={setNotification} />,
      audit: <AuditTab />,
    };
    
    return (
      <ErrorBoundary key={activeTab}>
        {tabs[activeTab] || tabs.overview}
      </ErrorBoundary>
    );
  };

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      roleName="Super Admin"
      userName={admin?.name || "Admin"}
      userAvatar={admin?.avatar}
    >
      <AnimatePresence>
        {promptModal?.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <h3 className="text-xl font-display font-bold text-gray-900 mb-2">{promptModal.title}</h3>
              <p className="text-gray-600 mb-4 text-sm">
                {promptModal.message}
              </p>
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={promptModal.placeholder}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-primary/20 focus:border-red-primary outline-none transition-all mb-6"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setPromptModal(null);
                    setPromptValue('');
                  }}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    promptModal.onConfirm(promptValue);
                    setPromptModal(null);
                    setPromptValue('');
                  }}
                  className="px-4 py-2 rounded-xl bg-red-primary text-white hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-primary/20"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-4 text-amber-600">
                <AlertCircle size={24} />
                <h3 className="text-xl font-display font-bold text-gray-900">{confirmModal.title}</h3>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors font-medium shadow-lg shadow-amber-600/20"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </DashboardShell>
  );
}

// --- OVERVIEW TAB ---
function OverviewTab() {
  const [stats, setStats] = useState({ users: 0, events: 0, registrations: 0, jobs: 0, pendingApprovals: 0 });
  const [roleDistribution, setRoleDistribution] = useState<{ [key: string]: number }>({});
  const [eventsByCategory, setEventsByCategory] = useState<{ [key: string]: number }>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, eventsRes, regsRes, jobsRes, pendingRes, activityRes] = await Promise.all([
          supabase.from('users').select('uid', { count: 'exact', head: true }),
          supabase.from('events').select('id', { count: 'exact', head: true }),
          supabase.from('registrations').select('id', { count: 'exact', head: true }),
          supabase.from('jobs').select('id', { count: 'exact', head: true }),
          supabase.from('users').select('uid', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5)
        ]);

        setStats({
          users: usersRes.count || 0,
          events: eventsRes.count || 0,
          registrations: regsRes.count || 0,
          jobs: jobsRes.count || 0,
          pendingApprovals: pendingRes.count || 0
        });

        setRecentActivity(activityRes.data || []);

        const { data: allUsers } = await supabase.from('users').select('role');
        const roles: { [key: string]: number } = {};
        allUsers?.forEach((u: any) => {
          roles[u.role] = (roles[u.role] || 0) + 1;
        });
        setRoleDistribution(roles);

        const { data: allEvents } = await supabase.from('events').select('category');
        const categories: { [key: string]: number } = {};
        allEvents?.forEach((e: any) => {
          const cat = e.category || 'Other';
          categories[cat] = (categories[cat] || 0) + 1;
        });
        setEventsByCategory(categories);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Users',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, stats.users],
        borderColor: '#f40000',
        backgroundColor: 'rgba(244, 0, 0, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Events',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, stats.events],
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
      }
    ]
  };

  const doughnutData = {
    labels: Object.keys(roleDistribution).map(r => r.charAt(0).toUpperCase() + r.slice(1)),
    datasets: [{
      data: Object.values(roleDistribution),
      backgroundColor: ['#f40000', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e'],
      borderWidth: 0,
    }]
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <MetricsGridSkeleton count={5} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label="Total Users" value={stats.users.toLocaleString()} trend="Live" icon={<Users size={20} />} />
            <MetricCard label="Active Events" value={stats.events.toString()} trend="Live" icon={<Calendar size={20} />} />
            <MetricCard label="Registrations" value={stats.registrations.toLocaleString()} trend="Live" icon={<CheckSquare size={20} />} />
            <MetricCard label="Pending Approvals" value={stats.pendingApprovals.toString()} trend={stats.pendingApprovals > 0 ? "Urgent" : "Clear"} icon={<CheckSquare size={20} />} isUrgent={stats.pendingApprovals > 0} />
            <MetricCard label="Jobs Posted" value={stats.jobs.toString()} trend="Live" icon={<Briefcase size={20} />} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-xl font-display font-bold mb-6">Platform Growth (12 Months)</h3>
              <div className="h-80">
                <Line data={lineData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-xl font-display font-bold mb-6">User Distribution</h3>
              <div className="h-80 flex justify-center">
                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-6">
              <h3 className="text-xl font-display font-bold mb-6">Events by Category</h3>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: Object.keys(eventsByCategory).length > 0 ? Object.keys(eventsByCategory) : ['No Data'],
                    datasets: [{
                      label: 'Events',
                      data: Object.values(eventsByCategory).length > 0 ? Object.values(eventsByCategory) : [0],
                      backgroundColor: '#f40000',
                      borderRadius: 6,
                    }]
                  }} 
                  options={{ maintainAspectRatio: false }} 
                />
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-xl font-display font-bold mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.length > 0 ? recentActivity.map((log: any) => (
                  <div key={log.id} className="flex gap-3 border-l-2 border-red-primary pl-4 py-1">
                    <div>
                      <p className="text-xs font-bold">{log.action}</p>
                      <p className="text-[10px] text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-gray-500">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, trend, icon, isUrgent }: any) {
  return (
    <div className={`card p-4 ${isUrgent ? 'border-red-primary bg-red-50/30' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${isUrgent ? 'bg-red-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
        {icon}
      </div>
      <div className="text-2xl font-mono font-bold leading-tight">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">{label}</div>
      <div className={`text-[10px] font-bold mt-2 ${trend.includes('+') ? 'text-green-600' : isUrgent ? 'text-red-primary' : 'text-gray-400'}`}>
        {trend}
      </div>
    </div>
  );
}

// --- COLLEGES TAB ---
function CollegesTab({ setNotification, setConfirmModal, setPromptModal }: { 
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void,
  setPromptModal: (p: any) => void
}) {
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'students' | 'coordinators' | 'registrations'>('details');
  const [students, setStudents] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [allColleges, setAllColleges] = useState<{ college: string; studentCount: number; coordCount: number }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedEvent, setSelectedEvent] = useState<string>('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchColleges = async () => {
      const { data: users } = await supabase.from('users').select('college, role');
      const collegeMap: { [key: string]: { students: number; coords: number } } = {};
      users?.forEach((u: any) => {
        const college = u.college || 'Unknown';
        if (!collegeMap[college]) collegeMap[college] = { students: 0, coords: 0 };
        if (u.role === 'student') collegeMap[college].students++;
        if (u.role === 'coordinator') collegeMap[college].coords++;
      });
      setAllColleges(Object.entries(collegeMap).map(([college, counts]) => ({
        college,
        studentCount: counts.students,
        coordCount: counts.coords
      })));
    };
    fetchColleges();
  }, []);

  useEffect(() => {
    if (!selectedCollege) return;
    setLoading(true);
    
    const fetchData = async () => {
      const [studentsRes, coordsRes, regsRes, eventsRes] = await Promise.all([
        supabase.from('users').select('*').eq('college', selectedCollege).eq('role', 'student'),
        supabase.from('users').select('*').eq('college', selectedCollege).eq('role', 'coordinator'),
        supabase.from('registrations').select('*, events(name)').eq('student_college', selectedCollege),
        supabase.from('events').select('id, title, category').limit(50)
      ]);
      
      if (studentsRes.data) {
        setStudents(studentsRes.data);
        const depts = [...new Set(studentsRes.data.map((s: any) => s.department).filter(Boolean))];
        setDepartments(depts as string[]);
      }
      if (coordsRes.data) setCoordinators(coordsRes.data);
      if (regsRes.data) setRegistrations(regsRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel(`college_${selectedCollege}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `college=eq.${selectedCollege}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCollege]);

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      setNotification({ message: "No data to export.", type: 'error' });
      return;
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => `"${val}"`).join(",")
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCollegeReport = () => {
    const reportData = [
      { Metric: 'College Name', Value: selectedCollege },
      { Metric: 'Total Students', Value: students.length },
      { Metric: 'Total Coordinators', Value: coordinators.length },
      { Metric: 'Export Date', Value: new Date().toLocaleDateString() }
    ];
    downloadCSV(reportData, `${selectedCollege}_Report.csv`);
  };

  const handleDownloadStudentData = () => {
    const exportData = students.map(s => ({
      Name: s.name,
      Email: s.email,
      Department: s.department || 'N/A',
      Year: s.year || 'N/A',
      College: s.college
    }));
    downloadCSV(exportData, `${selectedCollege}_Students.csv`);
  };

  const handleDownloadCoordinatorData = () => {
    const exportData = coordinators.map(c => ({
      Name: c.name,
      Email: c.email,
      Department: c.department || 'N/A',
      College: c.college
    }));
    downloadCSV(exportData, `${selectedCollege}_Coordinators.csv`);
  };

  const handleDownloadRegistrations = () => {
    let filteredRegs = registrations;
    if (selectedDept !== 'All') {
      filteredRegs = filteredRegs.filter((r: any) => r.student_department === selectedDept);
    }
    if (selectedEvent !== 'All') {
      filteredRegs = filteredRegs.filter((r: any) => r.event_id === selectedEvent);
    }
    
    const exportData = filteredRegs.map((r: any) => ({
      Name: r.student_name || 'N/A',
      Email: r.student_email || 'N/A',
      Department: r.student_department || 'N/A',
      Event: r.events?.name || r.event_name || 'N/A',
      Attendance: r.attended ? 'Yes' : 'No',
      RegisteredAt: r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'
    }));
    downloadCSV(exportData, `${selectedCollege}_Registrations.csv`);
    setNotification({ message: `Exported ${exportData.length} registrations.`, type: 'success' });
  };

  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCollege) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const emails = lines.map(line => line.trim()).filter(line => line.includes('@'));
        
        if (emails.length === 0) {
          setNotification({ message: "No valid emails found in the file.", type: 'error' });
          return;
        }

        setLoading(true);
        let successCount = 0;
        
        try {
          for (const email of emails) {
            const { data: userData } = await supabase
              .from('users')
              .select('uid')
              .eq('email', email)
              .eq('role', 'student')
              .maybeSingle();

            if (userData) {
              await supabase
                .from('users')
                .update({ college: selectedCollege })
                .eq('uid', userData.uid);
              successCount++;
            }
          }
          setNotification({ message: `Successfully added ${successCount} students to ${selectedCollege}`, type: 'success' });
        } catch (error) {
          handleSupabaseError(error, OperationType.UPDATE, 'users');
        } finally {
          setLoading(false);
          setShowUploadModal(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const removeUserFromCollege = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove User',
      message: `Are you sure you want to remove ${name} from ${selectedCollege}?`,
      onConfirm: async () => {
        try {
          await supabase
            .from('users')
            .update({ college: 'Unassigned' })
            .eq('uid', id);
          setNotification({ message: `${name} removed from ${selectedCollege}`, type: 'success' });
        } catch (error) {
          handleSupabaseError(error, OperationType.UPDATE, `users/${id}`);
        }
      }
    });
  };

  const addStudent = () => {
    setPromptModal({
      isOpen: true,
      title: 'Add Student',
      message: `Enter student email to add to ${selectedCollege}:`,
      placeholder: 'student@example.com',
      onConfirm: async (email) => {
        if (email) {
          try {
            const { data: userData } = await supabase.from('users').select('*').eq('email', email).eq('role', 'student').maybeSingle();
            if (!userData) {
              setNotification({ message: "Student not found with this email.", type: 'error' });
              return;
            }
            const { error } = await supabase.from('users').update({ college: selectedCollege }).eq('uid', userData.uid);
            if (error) {
              setNotification({ message: `Failed to add student: ${error.message}`, type: 'error' });
              return;
            }
            setNotification({ message: `Student ${userData.name} added to ${selectedCollege}`, type: 'success' });
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, 'users');
          }
        }
      }
    });
  };

  const addCoordinator = () => {
    setPromptModal({
      isOpen: true,
      title: 'Add Coordinator',
      message: `Enter coordinator email to add to ${selectedCollege}:`,
      placeholder: 'coordinator@example.com',
      onConfirm: async (email) => {
        if (email) {
          try {
            const { data: userData } = await supabase.from('users').select('*').eq('email', email).eq('role', 'coordinator').maybeSingle();
            if (!userData) {
              setNotification({ message: "Coordinator not found with this email.", type: 'error' });
              return;
            }
            const { error } = await supabase.from('users').update({ college: selectedCollege }).eq('uid', userData.uid);
            if (error) {
              setNotification({ message: `Failed to add coordinator: ${error.message}`, type: 'error' });
              return;
            }
            setNotification({ message: `Coordinator ${userData.name} added to ${selectedCollege}`, type: 'success' });
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, 'users');
          }
        }
      }
    });
  };

  return (
    <div className="flex gap-6 relative">
      <div className={`flex-1 grid md:grid-cols-2 xl:grid-cols-3 gap-6 transition-all ${selectedCollege ? 'mr-96' : ''}`}>
        {allColleges.map(({ college, studentCount, coordCount }) => (
          <div 
            key={college} 
            onClick={() => {
              setSelectedCollege(college);
              setViewMode('details');
            }}
            className="card p-6 cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center font-display font-bold text-2xl group-hover:bg-red-primary group-hover:text-white transition-all">
                {college.charAt(0)}
              </div>
              <button className="text-gray-400 hover:text-red-primary"><MoreVertical size={18} /></button>
            </div>
            <h3 className="text-xl font-display font-bold mb-2 truncate">{college}</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Students</p>
                <p className="font-mono font-bold">{studentCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Coordinators</p>
                <p className="font-mono font-bold">{coordCount}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedCollege && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-16 right-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-[85] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-display font-bold text-red-primary truncate">{selectedCollege}</h2>
                <button onClick={() => setSelectedCollege(null)} className="p-2 hover:bg-gray-100 rounded-full"><XCircle size={24} /></button>
              </div>
              
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
                {(['details', 'students', 'coordinators', 'registrations'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all whitespace-nowrap ${
                      viewMode === mode ? 'bg-white text-red-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-8">
              {viewMode === 'details' && (
                <>
                  <section>
                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-widest">Quick Stats</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-lg font-mono font-bold">{students.length}</p>
                        <p className="text-[8px] uppercase font-bold text-gray-500">Students</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-lg font-mono font-bold">{coordinators.length}</p>
                        <p className="text-[8px] uppercase font-bold text-gray-500">Coords</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-lg font-mono font-bold">{registrations.length}</p>
                        <p className="text-[8px] uppercase font-bold text-gray-500">Regs</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-widest">Departments</h4>
                    <div className="flex flex-wrap gap-2">
                      {departments.map(dept => (
                        <span key={dept} className="text-[10px] bg-gray-100 px-2 py-1 rounded">{dept}</span>
                      ))}
                      {departments.length === 0 && <span className="text-xs text-gray-400">No departments</span>}
                    </div>
                  </section>

                  <button 
                    onClick={handleDownloadCollegeReport}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Download size={18} /> Download College Report
                  </button>
                </>
              )}

              {viewMode === 'students' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Student List ({students.length})</h4>
                    <button 
                      onClick={addStudent}
                      className="text-[10px] text-red-primary font-bold hover:underline"
                    >
                      Add Student
                    </button>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {students.map(stu => (
                      <div key={stu.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-primary/10 text-red-primary flex items-center justify-center font-bold text-xs">
                              {stu.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold">{stu.name}</p>
                              <p className="text-[10px] text-gray-500">{stu.department || stu.branch || 'N/A'} • {stu.year}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeUserFromCollege(stu.id, stu.name)}
                            className="text-gray-300 hover:text-red-primary opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={handleDownloadStudentData}
                    className="w-full btn-secondary py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Download Student Data (CSV)
                  </button>
                </div>
              )}

              {viewMode === 'coordinators' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Coordinator List ({coordinators.length})</h4>
                    <button 
                      onClick={addCoordinator}
                      className="text-[10px] text-red-primary font-bold hover:underline"
                    >
                      Add Coordinator
                    </button>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {coordinators.map(coord => (
                      <div key={coord.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-primary/10 text-red-primary flex items-center justify-center font-bold text-xs">
                              {coord.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{coord.name}</p>
                              <p className="text-xs text-gray-500">{coord.department || coord.dept || 'N/A'} Department</p>
                              <p className="text-[10px] text-gray-400 mt-1">{coord.email}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeUserFromCollege(coord.id, coord.name)}
                            className="text-red-200 hover:text-red-primary opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <UserX size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={handleDownloadCoordinatorData}
                    className="w-full btn-secondary py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Download Coordinator Data (CSV)
                  </button>
                </div>
              )}

              {viewMode === 'registrations' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Registrations ({registrations.length})</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Filter by Department</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-primary/50"
                    >
                      <option value="All">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Filter by Event</label>
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-primary/50"
                    >
                      <option value="All">All Events</option>
                      {events.map(evt => (
                        <option key={evt.id} value={evt.id}>{evt.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {registrations
                      .filter((r: any) => selectedDept === 'All' || r.student_department === selectedDept)
                      .filter((r: any) => selectedEvent === 'All' || r.event_id === selectedEvent)
                      .slice(0, 20)
                      .map((reg: any) => (
                        <div key={reg.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold">{reg.student_name || 'Unknown'}</p>
                              <p className="text-[10px] text-gray-500">{reg.student_email || 'N/A'}</p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {reg.events?.name || reg.event_name || 'Unknown Event'}
                              </p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${reg.attended ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                              {reg.attended ? 'Present' : 'Absent'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>

                  <button 
                    onClick={handleDownloadRegistrations}
                    className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Download Registrations (CSV)
                  </button>
                </div>
              )}

            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display font-bold">Upload Student Data</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-black">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select an Excel or CSV file containing student information for <strong>{selectedCollege}</strong>.
              </p>
              
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-red-primary transition-colors cursor-pointer relative">
                <Upload className="mx-auto mb-4 text-gray-400" size={32} />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">XLSX, XLS, or CSV (max. 10MB)</p>
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUploadExcel}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// --- USERS TAB ---
function UsersTab({ setNotification, setConfirmModal, setPromptModal }: { 
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void,
  setPromptModal: (m: any) => void
}) {
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'role_change'>('list');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');

  const AVAILABLE_ROLES = [
    { value: 'student', label: 'Student' },
    { value: 'volunteer', label: 'Volunteer' },
    { value: 'coordinator', label: 'Event Coordinator' },
    { value: 'head_coordinator', label: 'Head Coordinator' },
    { value: 'evaluator', label: 'Evaluator' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  const uniqueDepts = [...new Set(users.map(u => u.department).filter(Boolean))];
  const uniqueColleges = [...new Set(users.map(u => u.college).filter(Boolean))];
  const uniqueYears = [...new Set(users.map(u => u.year).filter(Boolean))];

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
      if (data) {
        setUsers(data.map(u => ({ ...u, createdAt: u.created_at })));
      }
      if (error) handleSupabaseError(error, OperationType.LIST, 'users');
      setLoading(false);
    };
    fetchUsers();

    const channel = supabase.channel('admin_users_tab')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'All' && user.role !== roleFilter.toLowerCase()) return false;
    if (deptFilter !== 'All' && user.department !== deptFilter) return false;
    if (collegeFilter !== 'All' && user.college !== collegeFilter) return false;
    if (yearFilter !== 'All' && user.year !== yearFilter) return false;
    return true;
  });

  const handleBackToList = () => {
    setView('list');
    setTargetUser(null);
  };

  const handleRemoveUser = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to permanently delete ${name}?`,
      onConfirm: async () => {
        try {
          const userEmail = users.find(u => (u.uid || u.id) === id)?.email || name;
          const { error } = await supabase.from('users').delete().eq('uid', id);
          if (error) {
            setNotification({ message: `Delete failed: ${error.message}`, type: 'error' });
            return;
          }
          await supabase.from('audit_logs').insert({
            action: `Deleted user: ${userEmail}`,
            performed_by: (await supabase.auth.getUser()).data.user?.id,
            target_table: 'users',
            target_id: id,
            metadata: { deletedUserEmail: userEmail }
          });
          setNotification({ message: `User ${name} deleted successfully`, type: 'success' });
        } catch (error) {
          setNotification({ message: 'Delete failed. Please try again.', type: 'error' });
        }
      }
    });
  };

  const handleExportUsers = () => {
    const rows = filteredUsers.map((u) => `${u.name},${u.email},${u.role},${u.college || 'Unassigned'},${u.status || 'active'}`).join('\n');
    const csv = `data:text/csv;charset=utf-8,Name,Email,Role,College,Status\n${rows}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'users-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddUser = () => {
    setPromptModal({
      isOpen: true,
      title: 'Create User',
      message: 'Enter new user email (role defaults to student):',
      placeholder: 'new.user@example.com',
      onConfirm: async (email: string) => {
        if (!email || !email.includes('@')) {
          setNotification({ message: 'Please enter a valid email address.', type: 'error' });
          return;
        }
        try {
          const { error } = await supabase.from('users').insert({
            uid: `manual_${Date.now()}`,
            name: email.split('@')[0],
            email,
            role: 'student',
            status: 'active',
            created_at: new Date().toISOString(),
          });
          if (error) {
            setNotification({ message: `Create user failed: ${error.message}`, type: 'error' });
            return;
          }
          setNotification({ message: 'User record created successfully.', type: 'success' });
        } catch (error) {
          setNotification({ message: 'Create user failed. Please try again.', type: 'error' });
        }
      }
    });
  };

  if (view === 'role_change' && targetUser) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={handleBackToList} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h3 className="text-2xl font-display font-bold text-gray-900">User Management</h3>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Access Control • {targetUser.email}</p>
          </div>
        </div>

        <div className="card p-8 md:p-16 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="max-w-xl">
              <h3 className="text-4xl font-display font-bold text-red-primary mb-4">Platform Permissions</h3>
              <p className="text-lg text-gray-500 leading-relaxed">
                Reassign user roles to adjust administrative access or student permissions across the UniGuild platform.
              </p>
            </div>
            
            <div className="w-full md:w-auto flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100 min-w-[300px]">
              <img 
                src={targetUser.avatar || `https://picsum.photos/seed/${targetUser.id}/80/80`} 
                className="w-20 h-20 rounded-2xl shadow-lg border-2 border-white" 
                alt="" 
              />
              <div>
                <p className="text-xl font-bold text-gray-900">{targetUser.name}</p>
                <p className="text-sm text-gray-500">{targetUser.email}</p>
                <div className="mt-2 text-[10px] font-bold text-red-primary uppercase bg-red-50 inline-block px-2 py-1 rounded">
                  Current: {targetUser.role}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-xs font-bold text-gray-400 uppercase block tracking-widest border-b border-gray-100 pb-4">Select New Global Role</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AVAILABLE_ROLES.map(role => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all group ${
                    selectedRole === role.value 
                      ? 'border-red-primary bg-red-50 shadow-lg shadow-red-500/5' 
                      : 'border-gray-100 hover:border-red-primary/30 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className={`font-bold text-lg ${selectedRole === role.value ? 'text-red-primary' : 'text-gray-900'}`}>{role.label}</p>
                    <Shield size={18} className={selectedRole === role.value ? 'text-red-primary' : 'text-gray-300'} />
                  </div>
                  <p className="text-xs text-gray-500 leading-tight">System identifier: {role.value}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-8 flex justify-end gap-4 border-t border-gray-100">
            <button 
              onClick={handleBackToList}
              className="px-10 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                try {
                  const oldRole = targetUser.role;
                  const { error } = await supabase
                    .from('users')
                    .update({ role: selectedRole })
                    .eq('uid', targetUser.uid);

                  if (error) {
                    setNotification({ message: `Update failed: ${error.message}`, type: 'error' });
                    return;
                  }

                  await supabase.from('audit_logs').insert({
                    action: `Role changed from ${oldRole} to ${selectedRole} for user ${targetUser.email}`,
                    performed_by: (await supabase.auth.getUser()).data.user?.id,
                    target_user: targetUser.id,
                    target_table: 'users',
                    metadata: { oldRole, newRole: selectedRole }
                  });

                  setNotification({ 
                    message: `Role changed successfully to ${AVAILABLE_ROLES.find(r => r.value === selectedRole)?.label}`, 
                    type: 'success' 
                  });
                  handleBackToList();
                } catch (error) {
                  handleSupabaseError(error, OperationType.UPDATE, `users/${targetUser.id}`);
                }
              }}
              disabled={selectedRole === targetUser.role}
              className="px-12 py-4 rounded-xl bg-red-primary text-white font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Permissions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          {['All', 'Students', 'Coordinators', 'Evaluators', 'Volunteers'].map(role => (
            <button 
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                roleFilter === role ? 'bg-red-primary text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-red-primary'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select 
            value={collegeFilter} 
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
          >
            <option value="All">All Colleges</option>
            {uniqueColleges.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={deptFilter} 
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
          >
            <option value="All">All Depts</option>
            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
          >
            <option value="All">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportUsers} className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"><Download size={16} /> Export CSV</button>
          <button onClick={handleAddUser} className="btn-primary py-2 px-4 text-xs flex items-center gap-2"><UserPlus size={16} /> Add User</button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      <div className="card border-none shadow-xl shadow-gray-200/50 overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">User Entity</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Designated Role</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">College Mapping</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Operational Status</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Onboarded</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-medium">Synchronizing user data...</td>
              </tr>
            ) : filteredUsers.length > 0 ? filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-all group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <img src={user.avatar || `https://picsum.photos/seed/${user.id}/40/40`} className="w-10 h-10 rounded-xl shadow-sm border-2 border-white group-hover:scale-110 transition-transform" alt="" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-[9px] bg-red-50 text-red-primary px-3 py-1.5 rounded-lg font-bold uppercase border border-red-primary/5 tracking-wider">{user.role}</span>
                </td>
                <td className="px-6 py-5 text-sm font-bold text-gray-700">{user.college || 'Unassigned'}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                    <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Active Status</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-gray-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => window.open(`mailto:${user.email}`, '_blank')} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-primary hover:border-red-primary/30 transition-all hover:shadow-sm"><ExternalLink size={16} /></button>
                    <button 
                      onClick={() => {
                        setTargetUser(user);
                        setSelectedRole(user.role);
                        setView('role_change');
                      }}
                      className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-primary hover:border-red-primary/30 transition-all hover:shadow-sm"
                    >
                      <Shield size={16} />
                    </button>
                    <button 
                      onClick={() => handleRemoveUser(user.id, user.name)}
                      className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-primary hover:border-red-primary/30 transition-all hover:shadow-sm"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-gray-400 border-none italic">No users matching your current filtration criteria were discovered.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- EVENTS TAB ---
function EventsTab({ events, onPost, onDeleteEvent, onClearAll, isPublishing, setNotification, setConfirmModal }: { 
  events: any[], 
  onPost: (evt: any) => Promise<boolean>, 
  onDeleteEvent?: (eventId: string) => void,
  onClearAll?: () => void,
  isPublishing?: boolean, 
  setNotification: (n: any) => void,
  setConfirmModal?: (m: any) => void
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managingEvent, setManagingEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [view, setView] = useState<'list' | 'create' | 'manage'>('list');
  const [newEvent, setNewEvent] = useState<{
    name: string; host: string; category: string; date: string; capacity: string;
    location: string; description: string; website: string; bannerUrl: string;
    status: string; targetAudience: string; fee: string;
  }>({
    name: '', host: 'All', category: 'Workshop', date: '', capacity: '',
    location: '', description: '', website: '', bannerUrl: '',
    status: 'Upcoming', targetAudience: 'All Students', fee: ''
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newEvent.name.trim()) newErrors.name = 'Event name is required';
    if (!newEvent.date) newErrors.date = 'Event date is required';
    if (newEvent.capacity && (isNaN(parseInt(newEvent.capacity)) || parseInt(newEvent.capacity) < 1)) {
      newErrors.capacity = 'Capacity must be a positive number';
    }
    if (newEvent.website && !/^https?:\/\/.+/.test(newEvent.website)) {
      newErrors.website = 'Website must be a valid URL';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    const ok = await onPost({
      ...newEvent,
      slots: { filled: 0, total: parseInt(newEvent.capacity) || 100 }
    });
    if (ok) {
      setErrors({});
      setNewEvent({
        name: '', host: 'All', category: 'Workshop', date: '', capacity: '',
        location: '', description: '', website: '', bannerUrl: '',
        status: 'Upcoming', targetAudience: 'All Students', fee: ''
      });
      setView('list');
    }
  };

  const handleIssueCertificate = async (regId: string) => {
    try {
      const { error } = await supabase.from('registrations').update({
        certificate_issued: true,
        issued_at: new Date().toISOString()
      }).eq('id', regId);
      if (error) {
        setNotification({ message: `Certificate issue failed: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Certificate issued successfully!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Certificate issue failed. Please try again.', type: 'error' });
    }
  };

  const handleMarkAttendance = async (regId: string) => {
    try {
      const { data, error } = await supabase.rpc('mark_attendance', {
        p_registration_id: regId,
        p_scanner_id: 'super_admin',
        p_scanner_name: 'Super Admin'
      });
      if (error) {
        setNotification({ message: `Attendance update failed: ${error.message}`, type: 'error' });
        return;
      }
      const result = data as { ok?: boolean; reason?: string } | null;
      if (!result?.ok) {
        setNotification({ message: `Attendance update failed: ${result?.reason || 'unknown reason'}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Attendance marked successfully!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Attendance update failed. Please try again.', type: 'error' });
    }
  };

  const handleScan = (data: string | null) => {
    if (data) {
      handleMarkAttendance(data);
      setShowScanner(false);
      setNotification({ message: "Attendance marked successfully!", type: 'success' });
    }
  };

  useEffect(() => {
    if (managingEvent) {
      const fetchRegs = async () => {
        const { data } = await supabase.from('registrations').select('*').eq('event_id', managingEvent.id);
        if (data) setRegistrations(data.map(r => ({ ...r, studentName: r.student_name, studentEmail: r.student_email, certificateIssued: r.certificate_issued })));
      };
      fetchRegs();
      const channel = supabase.channel(`event_regs_${managingEvent.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `event_id=eq.${managingEvent.id}` }, () => fetchRegs())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [managingEvent]);

  const handleBackToList = () => {
    setView('list');
    setManagingEvent(null);
    setShowCreateModal(false);
  };

  if (view === 'create') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={handleBackToList} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
            <X size={24} />
          </button>
          <div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Create New Event</h3>
            <p className="text-sm text-gray-500">Fill in the details to publish a new event across all colleges.</p>
          </div>
        </div>

        <div className="card p-8 md:p-16 space-y-10">
          <div>
            <h3 className="text-3xl font-display font-bold text-red-primary mb-2">Event Details</h3>
            <p className="text-base text-gray-500">Basic information about the event and its target audience.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Event Name</label>
              <input 
                type="text" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm" 
                placeholder="e.g. Annual Tech Symposium"
                value={newEvent.name}
                onChange={e => setNewEvent({...newEvent, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Host Institution</label>
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm"
                value={newEvent.host}
                onChange={e => setNewEvent({...newEvent, host: e.target.value})}
              >
                <option value="All">All Institutions</option>
                {UniGuildData.colleges.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Category</label>
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm"
                value={newEvent.category}
                onChange={e => setNewEvent({...newEvent, category: e.target.value})}
              >
                {['Hackathon', 'Webinar', 'Workshop', 'Competition', 'Cultural'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Event Date</label>
              <input 
                type="date" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm" 
                value={newEvent.date}
                onChange={e => setNewEvent({...newEvent, date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Capacity</label>
              <input 
                type="number" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm" 
                placeholder="e.g. 500"
                value={newEvent.capacity}
                onChange={e => setNewEvent({...newEvent, capacity: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 grid md:grid-cols-2 gap-10 border-t border-gray-100 pt-10 mt-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Target Audience</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm"
                  value={newEvent.targetAudience || 'All Students'}
                  onChange={e => setNewEvent({...newEvent, targetAudience: e.target.value})}
                >
                  <option>All Students</option>
                  <option>Specific Branch</option>
                  <option>Specific Year</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Registration Fee</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm" 
                  placeholder="e.g. Free or ₹100"
                  value={newEvent.fee || ''}
                  onChange={e => setNewEvent({...newEvent, fee: e.target.value})}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Location / Link</label>
              <input 
                type="text" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm" 
                placeholder="e.g. Main Auditorium or Zoom Link"
                value={newEvent.location}
                onChange={e => setNewEvent({...newEvent, location: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Banner Image</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm" 
                  placeholder="Paste banner image URL here..."
                  value={newEvent.bannerUrl}
                  onChange={e => setNewEvent({...newEvent, bannerUrl: e.target.value})}
                />
                <input
                  type="file"
                  id="banner-upload-inline"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        setNotification({ message: "Image size should be less than 2MB", type: 'error' });
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewEvent({ ...newEvent, bannerUrl: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <button 
                  type="button"
                  onClick={() => document.getElementById('banner-upload-inline')?.click()}
                  className="px-8 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all shadow-sm"
                >
                  <Upload size={20} /> Browse File
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Website URL (Optional)</label>
              <input 
                type="url" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all shadow-sm" 
                placeholder="https://event-website.com"
                value={newEvent.website}
                onChange={e => setNewEvent({...newEvent, website: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-3 tracking-widest">Detailed Description</label>
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-red-primary focus:bg-white transition-all h-48 shadow-sm" 
                placeholder="What is this event about? Mention any prerequisites, rules, or agenda..."
                value={newEvent.description}
                onChange={e => setNewEvent({...newEvent, description: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-10 border-t border-gray-100 flex justify-end gap-5">
            <button onClick={handleBackToList} className="px-10 py-4 rounded-xl text-gray-500 font-bold hover:bg-gray-50 transition-all">Discard Changes</button>
            <button 
              onClick={async () => {
                await handleCreate();
                if (Object.keys(errors).length === 0) setView('list');
              }} 
              disabled={isPublishing}
              className="px-12 py-4 rounded-xl bg-red-primary text-white font-bold flex items-center gap-3 hover:bg-red-dark transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Event'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'manage' && managingEvent) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={handleBackToList} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
            <X size={24} />
          </button>
          <div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Manage: {managingEvent.name}</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{managingEvent.date} • {managingEvent.host}</p>
          </div>
        </div>

        <div className="card p-8 md:p-12 space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-3xl font-display font-bold text-red-primary mb-2">Registration Oversight</h3>
              <p className="text-base text-gray-500">Monitor attendee registrations and track event metrics.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowScanner(true)}
                className="px-6 py-3 rounded-xl bg-red-primary text-white font-bold text-sm flex items-center gap-2 hover:bg-red-dark transition-all shadow-lg shadow-red-500/10"
              >
                <Camera size={20} /> Live Attendance Scanner
              </button>
              <button 
                onClick={() => {
                  const csv = [
                    ['Student Name', 'Email', 'College', 'Department', 'Status'],
                    ...registrations.map(r => [r.studentName, r.studentEmail, r.college, r.department, r.status])
                  ].map(e => e.join(",")).join("\n");
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.setAttribute('href', url);
                  a.setAttribute('download', `${managingEvent.name}-registrations.csv`);
                  a.click();
                }}
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all"
              >
                <Download size={20} /> Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="text-3xl font-mono font-bold text-gray-900">{registrations.length}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Registered</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="text-3xl font-mono font-bold text-green-600">{registrations.filter(r => r.status === 'attended').length}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Checked In</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="text-3xl font-mono font-bold text-amber-600">{registrations.filter(r => r.status === 'registered').length}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Waitlist / Pending</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="text-3xl font-mono font-bold text-red-primary">{Math.round((registrations.filter(r => r.status === 'attended').length / (registrations.length || 1)) * 100)}%</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Attendance Rate</div>
            </div>
          </div>

          <div className="border border-gray-100 rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5 text-xs font-bold uppercase text-gray-400 tracking-widest">Student</th>
                  <th className="px-8 py-5 text-xs font-bold uppercase text-gray-400 tracking-widest">College Details</th>
                  <th className="px-8 py-5 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.length === 0 ? (
                  <tr><td colSpan={3} className="px-8 py-10 text-center text-gray-400 italic">No registrations for this event yet.</td></tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50/50 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-base">{reg.studentName}</span>
                          <span className="text-sm text-gray-400">{reg.studentEmail}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700">{reg.college}</span>
                          <span className="text-xs text-gray-400">{reg.department} • {reg.year} Year</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-3">
                          {!reg.certificateIssued && reg.status === 'attended' && (
                            <button 
                              onClick={() => handleIssueCertificate(reg.id)}
                              className="px-4 py-2 rounded-lg bg-green-50 text-green-600 font-bold text-xs hover:bg-green-100 transition-all"
                            >
                              Issue Cert
                            </button>
                          )}
                          {reg.certificateIssued && (
                            <span className="flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-3 py-2 rounded-lg">
                              <Shield size={12} /> Certified
                            </span>
                          )}
                          {reg.status !== 'attended' && (
                            <button 
                              onClick={() => handleMarkAttendance(reg.id)}
                              className="px-4 py-2 rounded-lg bg-red-50 text-red-primary font-bold text-xs hover:bg-red-100 transition-all"
                            >
                              Mark Presence
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-display font-bold text-gray-900 tracking-tight">Event Ecosystem</h3>
          <p className="text-base text-gray-500 mt-1">Monitor, create, and manage cross-institutional events.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onClearAll}
            className="px-6 py-4 rounded-xl border border-gray-200 text-gray-400 font-bold flex items-center gap-3 hover:text-red-primary hover:border-red-primary transition-all shadow-sm bg-white"
          >
            <Trash2 size={24} /> Clear All
          </button>
          <button 
            onClick={() => setView('create')}
            className="px-8 py-4 rounded-xl bg-red-primary text-white font-bold flex items-center gap-3 hover:bg-red-dark transition-all shadow-xl shadow-red-500/20"
          >
            <Plus size={24} /> New Event
          </button>
        </div>
      </div>

      <div className="card border-none shadow-xl shadow-gray-200/50 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-6 text-xs font-bold uppercase text-gray-400 tracking-widest">Event Identity</th>
              <th className="px-8 py-6 text-xs font-bold uppercase text-gray-400 tracking-widest">Host Institution</th>
              <th className="px-8 py-6 text-xs font-bold uppercase text-gray-400 tracking-widest text-center">Engagement</th>
              <th className="px-8 py-6 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Action Interface</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <Calendar size={64} />
                    <p className="font-bold text-xl uppercase tracking-widest">No Events Found</p>
                  </div>
                </td>
              </tr>
            ) : (
              events.map(event => (
                <tr key={event.id} className="hover:bg-gray-50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-lg group-hover:text-red-primary transition-colors">{event.name}</span>
                      <span className="text-sm text-gray-400 font-medium flex items-center gap-2 mt-1">
                        <Calendar size={14} className="opacity-50" /> {event.date} • {event.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-base font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-full border border-gray-200">{event.host}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-mono font-bold text-gray-900 text-lg">{event.slots?.filled || 0} / {event.slots?.total || 0}</span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden border border-gray-100">
                        <div 
                          className="h-full bg-red-primary" 
                          style={{ width: `${Math.min(((event.slots?.filled || 0) / (event.slots?.total || 1)) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setManagingEvent(event);
                          setView('manage');
                        }}
                        className="px-6 py-3 rounded-xl bg-red-primary text-white font-bold text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
                      >
                        Management <ExternalLink size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to PERMANENTLY delete this event?')) {
                            onDeleteEvent?.(event.id);
                          }
                        }}
                        className="p-3 rounded-xl bg-gray-50 text-gray-400 hover:text-red-primary transition-all border border-gray-100"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (setConfirmModal && onDeleteEvent) {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Delete Event',
                              message: `Are you sure you want to delete "${event.name}"? This action cannot be undone and will remove all registrations.`,
                              onConfirm: () => onDeleteEvent(event.id)
                            });
                          }
                        }}
                        className="p-3 bg-gray-50 text-gray-400 hover:text-red-primary hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Event"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScanner(false)}
              className="absolute inset-0 bg-gray-900/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold">Scan Attendance QR</h3>
                <button onClick={() => setShowScanner(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8">
                <div className="aspect-square bg-black rounded-xl overflow-hidden relative">
                  <QRScanner 
                    onScanSuccess={handleScan}
                    onScanError={(err) => console.warn(err)}
                  />
                </div>
                <p className="mt-4 text-center text-xs text-gray-500">Align the student's QR code within the frame to scan.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- JOBS TAB ---
function JobsTab({ jobs, onPost, onUpdate, onDeleteJob, onClearAll, isPosting, setNotification }: { 
  jobs: any[], 
  onPost: (job: any) => Promise<boolean>, 
  onUpdate: (job: any) => void,
  onDeleteJob?: (jobId: string) => void,
  onClearAll?: () => void,
  isPosting?: boolean, 
  setNotification: (n: any) => void 
}) {
  const [view, setView] = useState<'list' | 'post' | 'edit' | 'applications'>('list');
  const [editingJob, setEditingJob] = useState<any>(null);
  const [viewingApplications, setViewingApplications] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    logo: '',
    skills: '',
    isPaid: true,
    stipend: '',
    appLink: '',
    website: '',
    type: 'Full-time',
    domain: 'Engineering',
    targetSection: 'All',
    targetBranch: 'All',
    targetYear: 'All',
    targetPersona: 'All',
    targetInstitution: 'All',
    targetCoordinator: 'All',
    deadline: ''
  });

  const handlePost = async () => {
    if (!newJob.title || !newJob.company) {
      setNotification({ message: "Please fill in title and company.", type: 'error' });
      return;
    }
    const ok = await onPost({
      ...newJob,
      skills: typeof newJob.skills === 'string' ? newJob.skills.split(',').map(s => s.trim()) : newJob.skills
    });
    if (ok) {
      setView('list');
      setNewJob({
        title: '',
        company: '',
        logo: '',
        skills: '',
        isPaid: true,
        stipend: '',
        appLink: '',
        website: '',
        type: 'Full-time',
        domain: 'Engineering',
        targetSection: 'All',
        targetBranch: 'All',
        targetYear: 'All',
        targetPersona: 'All',
        targetInstitution: 'All',
        targetCoordinator: 'All',
        deadline: ''
      });
    }
  };

  const handleUpdate = () => {
    if (!editingJob.title || !editingJob.company) {
      setNotification({ message: "Please fill in title and company.", type: 'error' });
      return;
    }
    onUpdate({
      ...editingJob,
      skills: typeof editingJob.skills === 'string' ? editingJob.skills.split(',').map(s => s.trim()) : editingJob.skills
    });
    setView('list');
    setEditingJob(null);
  };

  useEffect(() => {
    const fetchApplications = async () => {
      if (!viewingApplications?.id) {
        setApplications([]);
        return;
      }
      const { data } = await supabase.from('applications').select('*').eq('job_id', viewingApplications.id).order('applied_at', { ascending: false });
      if (data) setApplications(data);
    };
    fetchApplications();
  }, [viewingApplications?.id]);

  if (view === 'post') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-all text-gray-400 hover:text-red-primary">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="text-3xl font-display font-bold text-gray-900">Post New Opportunity</h3>
            <p className="text-gray-500 text-sm">Share a new job or internship opportunity with the community.</p>
          </div>
        </div>

        <div className="card p-8 md:p-16">
          <div className="max-w-4xl mx-auto space-y-12">
            <div>
              <h3 className="text-2xl font-display font-bold text-red-primary mb-2">Opportunity Details</h3>
              <p className="text-sm text-gray-500">Fill in the core information about the job position.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Job Title</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                  placeholder="e.g. Software Engineer Intern"
                  value={newJob.title}
                  onChange={e => setNewJob({...newJob, title: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Company Name</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                  placeholder="e.g. Google"
                  value={newJob.company}
                  onChange={e => setNewJob({...newJob, company: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Application Deadline</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                  value={newJob.deadline}
                  onChange={e => setNewJob({...newJob, deadline: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Company Logo</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  {newJob.logo && (
                    <div className="w-16 h-16 bg-white border border-gray-100 rounded-xl flex items-center justify-center p-2 shadow-sm">
                      <img src={newJob.logo} alt="Logo Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                      placeholder="Paste URL or upload image..."
                      value={newJob.logo}
                      onChange={e => setNewJob({...newJob, logo: e.target.value})}
                    />
                    <input 
                      type="file" 
                      ref={logoInputRef}
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            setNotification({ message: "Logo size should be less than 1MB", type: 'error' });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => setNewJob({...newJob, logo: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-6 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all border border-gray-200"
                    >
                      <Upload size={18} /> Upload
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Position Type</label>
                <div className="flex h-[54px] items-center px-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer w-full group">
                    <input 
                      type="checkbox" 
                      checked={newJob.isPaid} 
                      onChange={e => setNewJob({...newJob, isPaid: e.target.checked})}
                      className="w-5 h-5 accent-red-primary border-gray-300 rounded"
                    />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-black transition-colors">Paid Position</span>
                  </label>
                </div>
              </div>

              {newJob.isPaid && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Stipend / Salary</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                    placeholder="e.g. ₹25,000 / month"
                    value={newJob.stipend}
                    onChange={e => setNewJob({...newJob, stipend: e.target.value})}
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Required Skills (Optional, comma separated)</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                  placeholder="React, TypeScript, Node.js, GraphQL..."
                  value={newJob.skills}
                  onChange={e => setNewJob({...newJob, skills: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Official Application Link</label>
                <div className="relative">
                  <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="url" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                    placeholder="https://company.com/careers/job-123"
                    value={newJob.appLink}
                    onChange={e => setNewJob({...newJob, appLink: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield size={20} className="text-red-primary" /> Targeting Filters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <FilterSelect label="Section" value={newJob.targetSection} onChange={v => setNewJob({...newJob, targetSection: v})} options={['All', 'A', 'B', 'C']} />
                <FilterSelect label="Branch" value={newJob.targetBranch} onChange={v => setNewJob({...newJob, targetBranch: v})} options={['All', 'CSE', 'ECE', 'ME', 'CE']} />
                <FilterSelect label="Year" value={newJob.targetYear} onChange={v => setNewJob({...newJob, targetYear: v})} options={['All', '1st', '2nd', '3rd', '4th']} />
                <FilterSelect label="Persona" value={newJob.targetPersona} onChange={v => setNewJob({...newJob, targetPersona: v})} options={['All', 'Student', 'Volunteer', 'Coordinator']} />
                <FilterSelect label="Institution" value={newJob.targetInstitution} onChange={v => setNewJob({...newJob, targetInstitution: v})} options={['All', ...UniGuildData.colleges]} />
                <FilterSelect label="Coordinator" value={newJob.targetCoordinator} onChange={v => setNewJob({...newJob, targetCoordinator: v})} options={['All', 'Dr. Ramesh', 'Prof. Sunita']} />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-8">
              <button 
                onClick={() => setView('list')} 
                className="px-8 py-4 rounded-xl font-bold text-gray-500 hover:text-gray-900 transition-all border border-gray-200 hover:bg-gray-50"
              >
                Discard
              </button>
              <button 
                onClick={handlePost} 
                className="px-12 py-4 rounded-xl bg-red-primary text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center gap-3 disabled:opacity-50"
                disabled={isPosting}
              >
                {isPosting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Briefcase size={20} />}
                Publish Opportunity
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'edit' && editingJob) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('list'); setEditingJob(null); }} className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-all text-gray-400 hover:text-red-primary">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="text-3xl font-display font-bold text-gray-900">Edit Opportunity</h3>
            <p className="text-gray-500 text-sm">Update the details of this job or internship position.</p>
          </div>
        </div>

        <div className="card p-8 md:p-16">
          <div className="max-w-4xl mx-auto space-y-12">
            <div>
              <h3 className="text-2xl font-display font-bold text-red-primary mb-2">Update Opportunity</h3>
              <p className="text-sm text-gray-500">Modify the core information for this position.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Job Title</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                  value={editingJob.title}
                  onChange={e => setEditingJob({...editingJob, title: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Company Name</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                  value={editingJob.company}
                  onChange={e => setEditingJob({...editingJob, company: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Application Deadline</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                  value={editingJob.deadline}
                  onChange={e => setEditingJob({...editingJob, deadline: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Company Logo</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  {editingJob.logo && (
                    <div className="w-16 h-16 bg-white border border-gray-100 rounded-xl flex items-center justify-center p-2 shadow-sm">
                      <img src={editingJob.logo} alt="Logo Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                      placeholder="Paste URL or upload image..."
                      value={editingJob.logo}
                      onChange={e => setEditingJob({...editingJob, logo: e.target.value})}
                    />
                    <input 
                      type="file" 
                      ref={editLogoInputRef}
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            setNotification({ message: "Logo size should be less than 1MB", type: 'error' });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => setEditingJob({...editingJob, logo: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => editLogoInputRef.current?.click()}
                      className="px-6 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all border border-gray-200"
                    >
                      <Upload size={18} /> Upload
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Position Type</label>
                <div className="flex h-[54px] items-center px-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer w-full group">
                    <input 
                      type="checkbox" 
                      checked={editingJob.isPaid} 
                      onChange={e => setEditingJob({...editingJob, isPaid: e.target.checked})}
                      className="w-5 h-5 accent-red-primary border-gray-300 rounded"
                    />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-black transition-colors">Paid Position</span>
                  </label>
                </div>
              </div>

              {editingJob.isPaid && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Stipend / Salary</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                    value={editingJob.stipend}
                    onChange={e => setEditingJob({...editingJob, stipend: e.target.value})}
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Required Skills</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                  value={editingJob.skills}
                  onChange={e => setEditingJob({...editingJob, skills: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Official Application Link</label>
                <div className="relative">
                  <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="url" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm outline-none focus:border-red-primary focus:bg-white transition-all" 
                    placeholder="https://company.com/careers/job-123"
                    value={editingJob.appLink}
                    onChange={e => setEditingJob({...editingJob, appLink: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield size={20} className="text-red-primary" /> Targeting Filters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <FilterSelect label="Section" value={editingJob.targetSection} onChange={v => setEditingJob({...editingJob, targetSection: v})} options={['All', 'A', 'B', 'C']} />
                <FilterSelect label="Branch" value={editingJob.targetBranch} onChange={v => setEditingJob({...editingJob, targetBranch: v})} options={['All', 'CSE', 'ECE', 'ME', 'CE']} />
                <FilterSelect label="Year" value={editingJob.targetYear} onChange={v => setEditingJob({...editingJob, targetYear: v})} options={['All', '1st', '2nd', '3rd', '4th']} />
                <FilterSelect label="Persona" value={editingJob.targetPersona} onChange={v => setEditingJob({...editingJob, targetPersona: v})} options={['All', 'Student', 'Volunteer', 'Coordinator']} />
                <FilterSelect label="Institution" value={editingJob.targetInstitution} onChange={v => setEditingJob({...editingJob, targetInstitution: v})} options={['All', ...UniGuildData.colleges]} />
                <FilterSelect label="Coordinator" value={editingJob.targetCoordinator} onChange={v => setEditingJob({...editingJob, targetCoordinator: v})} options={['All', 'Dr. Ramesh', 'Prof. Sunita']} />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-8">
              <button 
                onClick={() => { setView('list'); setEditingJob(null); }} 
                className="px-8 py-4 rounded-xl font-bold text-gray-500 hover:text-gray-900 transition-all border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdate} 
                className="px-12 py-4 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg shadow-black/20 flex items-center gap-3"
              >
                <Download size={20} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'applications' && viewingApplications) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('list'); setViewingApplications(null); }} className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-all text-gray-400 hover:text-red-primary">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="text-3xl font-display font-bold text-gray-900 leading-tight">Applications for <span className="text-red-primary">{viewingApplications.title}</span></h3>
            <p className="text-gray-500 text-sm font-medium">{viewingApplications.company} • {applications.length} Candidates</p>
          </div>
        </div>

        <div className="card p-8 md:p-12">
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-50">
            <div>
              <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">Candidate List</h3>
              <p className="text-sm text-gray-500">Review and manage candidate applications for this position.</p>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-sm">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-50">
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Candidate</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applied On</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <Users size={64} className="mb-4" />
                        <p className="text-lg font-display font-bold">No Applications Yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{app.student_name || 'Anonymous Student'}</span>
                          <span className="text-xs text-gray-400">{app.student_email || 'no-email@uniguild.com'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <span className="text-sm font-medium text-gray-600">
                          {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          app.status === 'shortlisted' ? 'bg-green-50 text-green-600' : 
                          app.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {app.status || 'applied'}
                        </span>
                      </td>
                      <td className="px-4 py-6 text-right">
                        <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-primary hover:border-red-primary/30 transition-all hover:shadow-sm">
                          <ExternalLink size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-display font-bold text-gray-900">Job Board Management</h3>
          <p className="text-gray-500 text-sm mt-1">Manage professional opportunities and review student applications.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={onClearAll}
            className="flex-1 md:flex-initial px-6 py-4 rounded-xl border border-gray-200 text-gray-400 font-bold flex items-center justify-center gap-3 hover:text-red-primary hover:border-red-primary transition-all shadow-sm bg-white"
          >
            <Trash2 size={24} /> Clear All
          </button>
          <button 
            onClick={() => setView('post')}
            className="flex-1 md:flex-initial px-8 py-4 bg-red-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-95"
          >
            <Briefcase size={20} /> Post New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center justify-center card text-gray-400">
            <div className="p-6 bg-gray-50 rounded-full mb-6">
              <Briefcase size={40} className="opacity-20" />
            </div>
            <p className="text-lg font-display font-bold">No jobs posted yet</p>
            <p className="text-sm">Click the button above to post your first opportunity.</p>
          </div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="card p-6 flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  {job.logo ? (
                    <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center p-2 shadow-sm group-hover:scale-105 transition-transform">
                      <img src={job.logo} alt={job.company} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-red-50 text-red-primary border border-red-primary/10 rounded-2xl flex items-center justify-center font-display font-bold text-2xl">
                      {job.company?.charAt(0) || 'J'}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-red-primary transition-colors">{job.title}</h4>
                    <p className="text-xs font-bold text-red-primary tracking-wide uppercase italic">{job.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Apps</p>
                    <p className="text-sm font-mono font-bold text-gray-900">{job.applicationsCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8 mt-auto">
                <div className="bg-gray-900 text-white px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider">{job.type}</div>
                <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider">{job.domain}</div>
                <div className="bg-red-50 text-red-primary px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-red-primary/5">{job.stipend || 'Unpaid'}</div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => {
                    setViewingApplications(job);
                    setView('applications');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-primary text-white font-bold text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/10"
                >
                  Applicants <Users size={14} />
                </button>
                {job.appLink && (
                  <button 
                    onClick={() => window.open(job.appLink, '_blank')}
                    className="py-3 px-4 rounded-xl border border-gray-200 text-gray-400 hover:text-red-primary hover:border-red-primary/30 transition-all hover:bg-red-50"
                    title="View Original Posting"
                  >
                    <ExternalLink size={16} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to PERMANENTLY delete this job?')) {
                      onDeleteJob?.(job.id);
                    }
                  }}
                  className="py-3 px-4 rounded-xl border border-gray-200 text-gray-400 hover:text-red-primary hover:border-red-primary transition-all hover:bg-red-50"
                  title="Delete Job"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    setEditingJob({...job, skills: Array.isArray(job.skills) ? job.skills.join(', ') : job.skills});
                    setView('edit');
                  }}
                  className="py-3 px-6 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs hover:bg-gray-50 hover:text-black transition-all"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{label}</label>
      <select 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-red-primary"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

// --- ANNOUNCEMENTS TAB ---
function AnnouncementsTab({ onSend, setNotification, setConfirmModal, setPromptModal }: { 
  onSend: (data: any) => void, 
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void,
  setPromptModal: (p: any) => void
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [institution, setInstitution] = useState('all');
  const [targetRole, setTargetRole] = useState('all');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: notifs } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (notifs) setAnnouncements(notifs);

      const { data: users } = await supabase.from('users').select('college');
      const uniqueColleges = [...new Set(users?.map((u: any) => u.college).filter(Boolean))] as string[];
      setColleges(uniqueColleges);
    };
    fetchData();
  }, []);

  const handleSend = async () => {
    if (!subject || !message) {
      setNotification({ message: "Please fill in both subject and message.", type: 'error' });
      return;
    }

    setSending(true);
    try {
      const notificationData = {
        user_id: institution === 'all' ? 'all' : institution,
        title: subject,
        message: message,
        type: 'announcement',
        priority: priority.toLowerCase(),
        read: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('notifications').insert(notificationData);
      
      if (error) {
        setNotification({ message: `Send failed: ${error.message}`, type: 'error' });
      } else {
        await supabase.from('audit_logs').insert({
          action: `Sent announcement: ${subject}`,
          performed_by: (await supabase.auth.getUser()).data.user?.id,
          target_table: 'notifications',
          metadata: { institution, targetRole, priority }
        });
        
        setNotification({ message: 'Announcement sent successfully!', type: 'success' });
        setSubject('');
        setMessage('');
      }
    } catch (error) {
      setNotification({ message: 'Send failed. Please try again.', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="card p-8">
        <h3 className="text-2xl font-display font-bold mb-6">Create Platform Announcement</h3>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
              placeholder="Enter announcement subject..." 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Message</label>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary h-32 resize-none" 
              placeholder="Enter announcement message..." 
            />
            <div className="flex justify-end mt-1 text-[10px] text-gray-400">{message.length} / 500 characters</div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary"
              >
                <option>Normal</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Institution</label>
              <select 
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary"
              >
                <option value="all">All Institutions</option>
                {colleges.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Target Role</label>
              <select 
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="coordinator">Coordinators</option>
                <option value="evaluator">Evaluators</option>
                <option value="volunteer">Volunteers</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button 
              onClick={handleSend} 
              disabled={sending}
              className="btn-primary px-10 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-8">
        <h4 className="text-lg font-display font-bold mb-4">Recent Announcements</h4>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {announcements.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No announcements yet.</p>
          ) : announcements.map((ann) => (
            <div key={ann.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-bold text-sm">{ann.title}</h5>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  ann.priority === 'urgent' ? 'bg-red-100 text-red-600' : 
                  ann.priority === 'high' ? 'bg-orange-100 text-orange-600' : 
                  'bg-gray-100 text-gray-600'
                }`}>
                  {ann.priority?.toUpperCase() || 'NORMAL'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{ann.message}</p>
              <p className="text-[10px] text-gray-400">
                To: {ann.user_id === 'all' ? 'All Users' : ann.user_id} • {new Date(ann.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- APPROVALS TAB ---
function ApprovalsTab({ setNotification, setConfirmModal }: { 
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void 
}) {
  const [pendingCoordinators, setPendingCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingCoordinators = async () => {
      const { data } = await supabase.from('users').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      if (data) setPendingCoordinators(data);
      setLoading(false);
    };
    fetchPendingCoordinators();

    const channel = supabase.channel('admin_pending_coordinators').on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: 'status=eq.pending' }, fetchPendingCoordinators).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApproval = async (user: any, status: 'approved' | 'rejected') => {
    try {
      const newStatus = status === 'approved' ? 'active' : 'rejected';
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', user.id);
      if (error) {
        setNotification({ message: `Update failed: ${error.message}`, type: 'error' });
        return;
      }
      await supabase.from('audit_logs').insert({
        action: `Coordinator ${status}: ${user.email}`,
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        target_user: user.id,
        target_table: 'users',
        metadata: { status, previousStatus: 'pending', newStatus }
      });
      setNotification({ message: `Coordinator ${user.name} ${status}.`, type: status === 'approved' ? 'success' : 'error' });
    } catch (error) {
      setNotification({ message: 'Update failed. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <CheckSquare size={20} className="text-red-primary" />
          Pending Coordinator Approvals ({pendingCoordinators.length})
        </h3>
        {loading ? (
          <div className="card p-8 text-center text-gray-400">Loading...</div>
        ) : pendingCoordinators.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">No pending coordinator approvals.</div>
        ) : (
          <div className="space-y-4">
            {pendingCoordinators.map((user) => (
              <div key={user.id} className="card p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <img src={user.avatar || `https://picsum.photos/seed/${user.id}/80/80`} className="w-12 h-12 rounded-full" alt="" />
                  <div>
                    <h4 className="font-bold">{user.name}</h4>
                    <p className="text-xs text-gray-500">{user.email} • {user.college || 'No college'} • {user.department || 'No department'}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Role: {user.role?.toUpperCase()} • Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleApproval(user, 'approved')} className="btn-primary py-2 px-6 text-xs">Approve</button>
                  <button onClick={() => setConfirmModal({ isOpen: true, title: 'Reject Request', message: `Do you want to reject ${user.name}'s coordinator request?`, onConfirm: () => handleApproval(user, 'rejected') })} className="bg-gray-100 text-gray-600 font-bold py-2 px-4 rounded-lg text-xs hover:bg-gray-200">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// --- ANALYTICS TAB ---
function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [collegeStats, setCollegeStats] = useState<{ college: string; count: number }[]>([]);
  const [eventStats, setEventStats] = useState<any[]>([]);
  const [participationData, setParticipationData] = useState<number[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: users } = await supabase.from('users').select('college');
        const collegeCounts: { [key: string]: number } = {};
        users?.forEach((u: any) => {
          const college = u.college || 'Unknown';
          collegeCounts[college] = (collegeCounts[college] || 0) + 1;
        });
        const sortedColleges = Object.entries(collegeCounts)
          .map(([college, count]) => ({ college, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setCollegeStats(sortedColleges);

        const { data: events } = await supabase.from('events').select('category, title');
        const categoryCounts: { [key: string]: number } = {};
        events?.forEach((e: any) => {
          const cat = e.category || 'Other';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        setEventStats(Object.entries(categoryCounts).map(([category, count]) => ({ category, count })));

        const { data: registrations } = await supabase.from('registrations').select('event_id, attended');
        const totalRegs = registrations?.length || 0;
        const attendedRegs = registrations?.filter((r: any) => r.attended).length || 0;
        const participationRate = totalRegs > 0 ? Math.round((attendedRegs / totalRegs) * 100) : 0;
        setParticipationData([participationRate - 20, participationRate - 10, participationRate, participationRate]);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleDownloadReport = async () => {
    const { data: users } = await supabase.from('users').select('uid', { count: 'exact', head: true });
    const { data: events } = await supabase.from('events').select('id', { count: 'exact', head: true });
    const { data: regs } = await supabase.from('registrations').select('id', { count: 'exact', head: true });
    const { data: jobs } = await supabase.from('jobs').select('id', { count: 'exact', head: true });
    
    const csv = `data:text/csv;charset=utf-8,Metric,Value\nTotal Users,${users?.length || 0}\nActive Events,${events?.length || 0}\nRegistrations,${regs?.length || 0}\nJobs Posted,${jobs?.length || 0}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'platform-analytics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-display font-bold">Platform Analytics</h3>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="btn-primary py-1.5 px-4 text-xs">Download Report</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-primary"></div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h4 className="text-sm font-bold uppercase text-gray-400 mb-6 tracking-widest">Students by College</h4>
            <div className="h-80">
              <Bar 
                data={{
                  labels: collegeStats.length > 0 ? collegeStats.map(c => c.college) : ['No Data'],
                  datasets: [{
                    label: 'Students',
                    data: collegeStats.length > 0 ? collegeStats.map(c => c.count) : [0],
                    backgroundColor: '#f40000',
                    borderRadius: 4,
                  }]
                }} 
                options={{ indexAxis: 'y', maintainAspectRatio: false }} 
              />
            </div>
          </div>
          <div className="card p-6">
            <h4 className="text-sm font-bold uppercase text-gray-400 mb-6 tracking-widest">Event Participation Rate</h4>
            <div className="h-80">
              <Line 
                data={{
                  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                  datasets: [{
                    label: 'Participation %',
                    data: participationData.length > 0 ? participationData : [0, 0, 0, 0],
                    borderColor: '#f40000',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(244, 0, 0, 0.05)'
                  }]
                }} 
                options={{ maintainAspectRatio: false }} 
              />
            </div>
          </div>
          <div className="card p-6">
            <h4 className="text-sm font-bold uppercase text-gray-400 mb-6 tracking-widest">Events by Category</h4>
            <div className="h-80">
              <Doughnut 
                data={{
                  labels: eventStats.length > 0 ? eventStats.map(e => e.category) : ['No Data'],
                  datasets: [{
                    data: eventStats.length > 0 ? eventStats.map(e => e.count) : [1],
                    backgroundColor: ['#f40000', '#333333', '#666666', '#999999', '#cccccc', '#444444'],
                    borderWidth: 0,
                  }]
                }} 
                options={{ maintainAspectRatio: false }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- CERTIFICATES TAB ---
function CertificatesTab({ setNotification, setConfirmModal }: { 
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void 
}) {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [eventName, setEventName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    const fetchCertificates = async () => {
      const { data } = await supabase.from('registrations').select('*').eq('certificate_issued', true).order('issued_at', { ascending: false }).limit(50);
      if (data) setCertificates(data);
    };
    fetchCertificates();
    const channel = supabase.channel('admin_certificates').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchCertificates).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleIssueSingle = async () => {
    if (!recipientEmail || !eventName) {
      setNotification({ message: 'Enter event name and recipient email.', type: 'error' });
      return;
    }
    const { data: reg } = await supabase
      .from('registrations')
      .select('*')
      .eq('student_email', recipientEmail)
      .ilike('event_name', eventName)
      .maybeSingle();

    if (!reg) {
      setNotification({ message: 'Registration not found for this event/email.', type: 'error' });
      return;
    }

    const { error } = await supabase.from('registrations').update({
      certificate_issued: true,
      certificate_url: reg.certificate_url || 'https://example.com/certificate.pdf',
      issued_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', reg.id);
    if (error) {
      setNotification({ message: `Certificate issue failed: ${error.message}`, type: 'error' });
      return;
    }

    setNotification({ message: 'Certificate issued successfully.', type: 'success' });
    setEventName('');
    setRecipientEmail('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card divide-y divide-gray-100">
        <div className="p-6">
          <h3 className="text-xl font-display font-bold mb-6">Certificate Management</h3>
          <p className="text-gray-600">Manage event certificates, issue new ones, and track issued certificates.</p>
        </div>
        <div className="p-6">
          <h4 className="text-lg font-bold mb-4">Issued Certificates</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Certificate ID</th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Event</th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Recipient</th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Issued Date</th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certificates.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{row.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3">{row.event_name}</td>
                    <td className="px-4 py-3">{row.student_name}</td>
                    <td className="px-4 py-3">{row.issued_at ? new Date(row.issued_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => row.certificate_url && window.open(row.certificate_url, '_blank')} className="text-red-primary hover:underline text-xs font-bold">View</button>
                    </td>
                  </tr>
                ))}
                {certificates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No certificates issued yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-6">
          <h4 className="text-lg font-bold mb-4">Issue New Certificate</h4>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Event Name</label>
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" placeholder="e.g. Annual Tech Symposium" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Recipient Email</label>
              <input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} type="email" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" placeholder="recipient@example.com" />
            </div>
            <button onClick={handleIssueSingle} className="btn-primary px-6">Issue Certificate</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- PROFILE TAB ---
function ProfileTab({ admin, setAdmin, onSave }: { admin: any, setAdmin: (a: any) => void, onSave: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({ ...admin });
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedData({ ...admin });
  }, [admin]);

  if (!admin) return null;

  const handleSave = () => {
    setAdmin(editedData);
    setIsEditing(false);
    onSave();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="card p-8 flex flex-col md:flex-row gap-8 items-center">
        <div className="relative group">
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => setEditedData(prev => ({ ...prev, avatar: reader.result as string }));
            reader.readAsDataURL(file);
          }} />
          <img src={isEditing ? editedData.avatar : admin.avatar} className="w-32 h-32 rounded-full border-4 border-red-primary p-1" alt="" />
          <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 bg-red-primary text-white p-2 rounded-full shadow-lg transition-all"><Camera size={14} /></button>
        </div>
        <div className="text-center md:text-left flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            {isEditing ? (
              <input 
                type="text" 
                value={editedData.name} 
                onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                className="text-3xl font-display font-bold bg-gray-50 border border-gray-200 rounded px-2 outline-none focus:border-red-primary"
              />
            ) : (
              <h3 className="text-3xl font-display font-bold">{admin.name}</h3>
            )}
            <span className="bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase self-center md:self-auto">Super Admin</span>
          </div>
          <p className="text-gray-500 font-medium mb-6">Platform Administrator • UniGuild Central</p>
        </div>
        <div className="flex flex-col gap-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="btn-primary py-2 px-6 text-sm flex items-center gap-2 shadow-lg shadow-red-primary/30">
                <CheckCircle2 size={16} /> Save Changes
              </button>
              <button onClick={() => { setIsEditing(false); setEditedData(admin); }} className="btn-secondary py-2 px-6 text-sm">Cancel</button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-primary py-2 px-6 text-sm flex items-center gap-2">
              <Edit size={16} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h4 className="text-xl font-display font-bold mb-6 border-b border-gray-50 pb-2">Account Information</h4>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Email Address</label>
            {isEditing ? (
              <input 
                type="email" 
                value={editedData.email} 
                onChange={(e) => setEditedData({...editedData, email: e.target.value})}
                className="text-sm font-bold bg-gray-50 border border-gray-200 rounded px-2 w-full outline-none focus:border-red-primary"
              />
            ) : (
              <p className="text-sm font-bold">{admin.email}</p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Admin Level</label>
            <p className="text-sm font-bold">Level 10 (Full Access)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SETTINGS TAB ---
function SettingsTab({ setNotification }: { setNotification: (n: any) => void }) {
  const [jobBoardEnabled, setJobBoardEnabled] = useState(true);
  const [hackathonModeEnabled, setHackathonModeEnabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [selfRegistration, setSelfRegistration] = useState(true);
  const [platformName, setPlatformName] = useState('UniGuild');
  const [supportEmail, setSupportEmail] = useState('support@uniguild.com');

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button 
      onClick={onToggle} 
      className={`w-12 h-6 ${enabled ? 'bg-red-primary' : 'bg-gray-200'} rounded-full relative cursor-pointer transition-colors`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${enabled ? 'right-1' : 'left-1'}`} />
    </button>
  );

  const handleToggle = (feature: string, enabled: boolean) => {
    setNotification({ 
      message: `${feature} ${enabled ? 'enabled' : 'disabled'}.`, 
      type: 'success' 
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card divide-y divide-gray-100">
        <div className="p-6">
          <h3 className="text-xl font-display font-bold mb-6">Platform Information</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Platform Name</label>
              <input 
                type="text" 
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Support Email</label>
              <input 
                type="email" 
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-display font-bold mb-6">Feature Toggles</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Job Board</p>
                <p className="text-xs text-gray-500">Enable/disable job postings and applications</p>
              </div>
              <Toggle 
                enabled={jobBoardEnabled} 
                onToggle={() => { setJobBoardEnabled(!jobBoardEnabled); handleToggle('Job Board', !jobBoardEnabled); }} 
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Hackathon Mode</p>
                <p className="text-xs text-gray-500">Enable hackathon-specific features and judging</p>
              </div>
              <Toggle 
                enabled={hackathonModeEnabled} 
                onToggle={() => { setHackathonModeEnabled(!hackathonModeEnabled); handleToggle('Hackathon Mode', !hackathonModeEnabled); }} 
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Maintenance Mode</p>
                <p className="text-xs text-gray-500">Take the platform offline for updates</p>
              </div>
              <Toggle 
                enabled={maintenanceMode} 
                onToggle={() => { setMaintenanceMode(!maintenanceMode); handleToggle('Maintenance Mode', !maintenanceMode); }} 
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Self-Registration</p>
                <p className="text-xs text-gray-500">Allow new users to register without invite</p>
              </div>
              <Toggle 
                enabled={selfRegistration} 
                onToggle={() => { setSelfRegistration(!selfRegistration); handleToggle('Self-registration', !selfRegistration); }} 
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-display font-bold mb-6">Security & Policy</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Session Timeout (mins)</label>
              <input type="number" defaultValue={30} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Max File Size (MB)</label>
              <input type="number" defaultValue={5} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- AUDIT TAB ---
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();

    const channel = supabase.channel('admin_audit_logs').on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, fetchLogs).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target_table?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'All' || log.action?.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  const handleExportLogs = () => {
    const rows = filteredLogs.map(log => 
      `${new Date(log.created_at).toISOString()},${log.performed_by || 'System'},${log.action},${log.target_table || 'N/A'},${log.target_id || 'N/A'}`
    ).join('\n');
    const csv = `data:text/csv;charset=utf-8,Timestamp,Performed By,Action,Target Table,Target ID\n${rows}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'audit-logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueActions = [...new Set(logs.map(l => l.action?.split(' ')[0]).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-display font-bold">System Audit Logs</h3>
        <button onClick={handleExportLogs} className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"><Download size={16} /> Export Logs</button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-primary/50"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-primary/50"
        >
          <option value="All">All Actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Timestamp</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Action</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Target</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-gray-400">Loading...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-gray-400">No audit logs found.</td>
              </tr>
            ) : filteredLogs.map(log => (
              <tr key={log.id} className="text-xs">
                <td className="px-6 py-4 font-mono text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">{log.action}</span>
                </td>
                <td className="px-6 py-4 text-gray-600">{log.target_table || 'N/A'} {log.target_id ? `#${log.target_id.slice(0, 8)}...` : ''}</td>
                <td className="px-6 py-4 text-gray-400 text-[10px]">
                  {log.metadata ? Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(', ') : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
