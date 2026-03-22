
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Users, Calendar, Megaphone, 
  CheckSquare, BarChart3, Settings, User, 
  Plus, Search, Filter, MoreVertical, 
  Clock, MapPin, AlertCircle, CheckCircle2,
  Trash2, Edit, Send, Download, QrCode, X, Check, History, Award, FileText, Eye, Briefcase, ExternalLink, Camera, TrendingUp, ShieldCheck, Bell, Mail, Github, Linkedin, Globe, XCircle
} from 'lucide-react';
import { UniGuildData } from '../data';
import DashboardShell from '../components/DashboardShell';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'events', label: 'My Events', icon: <Calendar size={20} /> },
  { id: 'attendance', label: 'Attendance', icon: <QrCode size={20} /> },
  { id: 'certificates', label: 'Certificates', icon: <Award size={20} /> },
  { id: 'volunteers', label: 'Volunteers', icon: <Users size={20} /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={20} /> },
  { id: 'team', label: 'My Team', icon: <Users size={20} /> },
  { id: 'announcements', label: 'Announcements', icon: <Megaphone size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
];

function normalizeCoordinatorEvent(event: any) {
  const total = Number(event?.slots?.total ?? event?.capacity ?? 100) || 100;
  const filled = Number(event?.slots?.filled ?? 0) || 0;

  return {
    ...event,
    title: event?.title || event?.name || 'Untitled Event',
    name: event?.name || event?.title || 'Untitled Event',
    createdBy: event?.created_by,
    registrationsCount: filled,
    slots: { filled, total },
  };
}

export default function EventCoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [coordinatorProfile, setCoordinatorProfile] = useState<any>(null);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [assignedEventIds, setAssignedEventIds] = useState<string[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      if (!loading) navigate('/login');
      return;
    }

    const fetchData = async () => {
      // Fetch Profile
      const { data: profile } = await supabase.from('users').select('*').eq('uid', currentUser.uid).single();
      if (profile) setCoordinatorProfile({ ...profile, uid: profile.uid || profile.id });
      setLoading(false);

      // Fetch assigned events - first get task assignments for this coordinator
      const { data: tasksData } = await supabase.from('tasks').select('event_id').eq('created_by', currentUser.uid);
      const eventIdsFromTasks = [...new Set((tasksData || []).map((t: any) => t.event_id).filter(Boolean))];
      
      // Also check volunteer_ids in events table
      const { data: eventsAsVolunteer } = await supabase.from('events').select('id').contains('volunteer_ids', [currentUser.uid]);
      const eventIdsAsVolunteer = (eventsAsVolunteer || []).map((e: any) => e.id);
      
      // Get coordinator's created events
      const { data: createdEvents } = await supabase.from('events').select('id').eq('created_by', currentUser.uid);
      const createdEventIds = (createdEvents || []).map((e: any) => e.id);
      
      // Combine all event IDs
      const allAssignedIds = [...new Set([...eventIdsFromTasks, ...eventIdsAsVolunteer, ...createdEventIds])];
      setAssignedEventIds(allAssignedIds);

      if (allAssignedIds.length > 0) {
        const { data: events } = await supabase.from('events').select('*').in('id', allAssignedIds).order('date', { ascending: false });
        if (events) setMyEvents(events.map(normalizeCoordinatorEvent));
      } else {
        setMyEvents([]);
      }

      // Fetch Volunteers
      const { data: vols } = await supabase.from('users').select('*').eq('role', 'volunteer');
      if (vols) setVolunteers(vols);

      // Fetch Jobs
      const { data: jobsList } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (jobsList) setJobs(jobsList.map(j => ({ ...j, createdAt: j.created_at })));
    };

    fetchData();

    // Subscribe to changes
    const profileChannel = supabase.channel(`profile_${currentUser.uid}`).on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `uid=eq.${currentUser.uid}` }, () => fetchData()).subscribe();
    const tasksChannel = supabase.channel('tasks_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `created_by=eq.${currentUser.uid}` }, () => fetchData()).subscribe();
    const volunteersChannel = supabase.channel('volunteers').on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `role=eq.volunteer` }, () => fetchData()).subscribe();
    const jobsChannel = supabase.channel('jobs').on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchData()).subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(volunteersChannel);
      supabase.removeChannel(jobsChannel);
    };
  }, [currentUser, navigate]);

  const handleSaveProfile = async (updatedProfile: any) => {
    if (!currentUser) return;
    try {
      const supabaseData: any = {
        name: updatedProfile.name,
        email: updatedProfile.email,
        college: updatedProfile.college,
        department: updatedProfile.department,
        year: updatedProfile.year,
        avatar: updatedProfile.avatar,
        phone: updatedProfile.phone,
        bio: updatedProfile.bio,
        github: updatedProfile.github,
        linkedin: updatedProfile.linkedin,
        website: updatedProfile.website,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('users').update(supabaseData).eq('uid', currentUser.uid);
      if (error) {
        setNotification({ message: `Profile update failed: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Profile updated successfully!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Profile update failed. Please try again.', type: 'error' });
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-bold animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab coordinator={coordinatorProfile} events={myEvents} assignedEventIds={assignedEventIds} setActiveTab={setActiveTab} onScanClick={() => setActiveTab('attendance')} />;
      case 'events': return <EventsTab events={myEvents} setActiveTab={setActiveTab} />;
      case 'attendance': return <AttendanceTab coordinatorId={coordinatorProfile?.id || coordinatorProfile?.uid} coordinatorName={coordinatorProfile?.name} assignedEventIds={assignedEventIds} myEvents={myEvents} />;
      case 'certificates': return <CertificatesTab setNotification={setNotification} setConfirmModal={setConfirmModal} assignedEventIds={assignedEventIds} myEvents={myEvents} />;
      case 'volunteers': return <VolunteersTab volunteers={volunteers} events={myEvents} setNotification={setNotification} assignedEventIds={assignedEventIds} />;
      case 'tasks': return <TasksTab coordinatorId={coordinatorProfile?.id || coordinatorProfile?.uid} events={myEvents} setNotification={setNotification} assignedEventIds={assignedEventIds} />;
      case 'team': return <TeamTab events={myEvents} setNotification={setNotification} setConfirmModal={setConfirmModal} />;
      case 'announcements': return <AnnouncementsTab events={myEvents} setNotification={setNotification} currentUser={currentUser} />;
      case 'analytics': return <AnalyticsTab events={myEvents} />;
      case 'profile': return <ProfileTab coordinator={coordinatorProfile} onSave={handleSaveProfile} />;
      default: return <OverviewTab coordinator={coordinatorProfile} events={myEvents} assignedEventIds={assignedEventIds} setActiveTab={setActiveTab} onScanClick={() => setActiveTab('attendance')} />;
    }
  };

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      roleName="Event Coordinator"
      userName={coordinatorProfile?.name || "Coordinator"}
      userAvatar={coordinatorProfile?.avatar}
    >
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

// --- EVENTS TAB ---
function EventsTab({ events, setActiveTab }: { events: any[], setActiveTab: (tab: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-display font-bold">My Events</h3>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," + "Event,Date,Participants,Status\n" + events.map(r => `${r.title || r.name},${r.date},${r.registrationsCount || 0},${r.status}`).join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", "events.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No events found. Create your first event!</div>
        ) : (
          events.map((event, i) => (
            <div key={event.id} className="card p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-red-50 text-red-primary rounded-xl flex items-center justify-center">
                  <Calendar size={24} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  (event.status || '').toLowerCase() === 'upcoming' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {event.status}
                </span>
              </div>
              <div>
                <h4 className="text-lg font-bold">{event.title || event.name}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock size={12} /> {event.date}
                </p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-400" />
                  <span className="text-xs font-bold">{event.registrationsCount || 0} Registered</span>
                </div>
                <button onClick={() => setActiveTab('attendance')} className="text-red-primary text-xs font-bold hover:underline">Manage</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


// --- OVERVIEW TAB (BENTO STYLE) ---
function OverviewTab({ coordinator, events, assignedEventIds, setActiveTab, onScanClick }: { coordinator: any, events: any[], assignedEventIds: string[], setActiveTab: (tab: string) => void, onScanClick: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [inlineNotice, setInlineNotice] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const latestEvent = events[0];
  const totalRegistrations = events.reduce((acc, curr) => acc + (curr.registrationsCount || 0), 0);

  useEffect(() => {
    if (!coordinator?.uid) return;
    const fetchTasks = async () => {
      const { data } = await supabase.from('tasks').select('*').eq('created_by', coordinator.uid).limit(5);
      if (data) setTasks(data.map(t => ({ ...t, coordinatorId: t.created_by })));
    };
    fetchTasks();
    const channel = supabase.channel(`overview_tasks_${coordinator.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `created_by=eq.${coordinator.uid}` }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coordinator?.uid]);

  useEffect(() => {
    if (assignedEventIds.length === 0) return;
    const fetchRegs = async () => {
      const { data } = await supabase.from('registrations').select('*').in('event_id', assignedEventIds).order('registered_at', { ascending: false }).limit(5);
      if (data) setRecentRegistrations(data.map(r => ({ ...r, studentName: r.student_name, eventName: r.event_name, createdAt: r.registered_at })));
    };
    fetchRegs();
    const channel = supabase.channel('overview_regs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => fetchRegs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [assignedEventIds]);

  const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed').length;

  const markTaskDone = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', taskId);
    if (error) {
      setInlineNotice({ message: `Task update failed: ${error.message}`, type: 'error' });
      return;
    }
    setInlineNotice({ message: 'Task marked as done.', type: 'success' });
  };

  useEffect(() => {
    if (!inlineNotice) return;
    const timer = setTimeout(() => setInlineNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [inlineNotice]);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Row 1: Welcome + Stats */}
      <div className="col-span-4 bg-gradient-to-r from-red-primary to-red-dark rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight mb-1">Welcome, {coordinator?.name || 'Coordinator'}</h2>
            <p className="opacity-90 text-sm">
              {latestEvent ? `Managing ${latestEvent.title || latestEvent.name}` : 'No events assigned yet'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onScanClick} className="bg-white text-red-primary px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg">
              <QrCode size={14} /> Scan
            </button>
            <button onClick={() => setActiveTab('tasks')} className="bg-white/20 border border-white/30 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-2">
              <CheckSquare size={14} /> Tasks
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Row 2: Stats Grid */}
      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-primary flex items-center justify-center">
          <Calendar size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{events.length}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Assigned Events</div>
        </div>
      </div>

      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
          <Users size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{totalRegistrations}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Registrations</div>
        </div>
      </div>

      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pendingTasks > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
          <CheckSquare size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{pendingTasks}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Pending Tasks</div>
        </div>
      </div>

      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <TrendingUp size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{events.length > 0 ? Math.round(totalRegistrations / events.length) : 0}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Avg per Event</div>
        </div>
      </div>

      {/* Row 3: Tasks + Live Updates */}
      <div className="col-span-2 card p-6">
        {inlineNotice && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-xs font-bold ${inlineNotice.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {inlineNotice.message}
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-display font-bold">Tasks</h3>
          <button onClick={() => setActiveTab('tasks')} className="text-red-primary text-xs font-bold hover:underline">View All</button>
        </div>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">No tasks assigned.</div>
          ) : (
            tasks.slice(0, 4).map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-red-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${t.status === 'todo' || t.status === 'pending' ? 'bg-red-primary' : t.status === 'inprogress' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <span className="text-sm font-medium">{t.title}</span>
                </div>
                <button onClick={() => markTaskDone(t.id)} className="text-gray-400 hover:text-green-600 p-1">
                  <CheckCircle2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="col-span-2 card p-6">
        <h3 className="text-lg font-display font-bold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentRegistrations.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">No recent registrations.</div>
          ) : (
            recentRegistrations.slice(0, 4).map((reg, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Users size={12} className="text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">{reg.studentName}</p>
                  <p className="text-gray-500 truncate">{reg.eventName}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, isUrgent, trend }: any) {
  return (
    <div className={`card p-5 ${isUrgent ? 'border-red-primary bg-red-50/20' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUrgent ? 'bg-red-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
          {icon}
        </div>
        {trend && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{trend}</span>}
      </div>
      <div className="text-3xl font-mono font-bold">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase font-bold mt-1 tracking-wider">{label}</div>
    </div>
  );
}

// --- VOLUNTEERS TAB ---
// --- ATTENDANCE TAB ---
function AttendanceTab({ coordinatorId, coordinatorName, assignedEventIds, myEvents }: { coordinatorId: string, coordinatorName: string, assignedEventIds: string[], myEvents: any[] }) {
  const [mode, setMode] = useState<'scan' | 'history'>('scan');
  const [selectedEventId, setSelectedEventId] = useState<string>(myEvents[0]?.id || '');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (mode === 'scan' && !scanResult && !isProcessing && !success && !error) {
      const scanner = new Html5QrcodeScanner(
        "reader-coordinator",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [mode, scanResult, isProcessing, success, error]);

  // Fetch history for assigned events only
  useEffect(() => {
    if (assignedEventIds.length === 0) return;
    const fetchHistoryData = async () => {
      const { data } = await supabase.from('registrations').select('*').in('event_id', assignedEventIds).eq('attended', true);
      if (data) setHistory(data.map(r => ({ ...r, studentName: r.student_name, eventName: r.event_name, attendedAt: r.attended_at })));
    };
    fetchHistoryData();
    const channel = supabase.channel('attendance_history').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: 'attended=eq.true' }, () => fetchHistoryData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [assignedEventIds]);

  async function onScanSuccess(decodedText: string) {
    if (isProcessing) return;
    
    setScanResult(decodedText);
    if (scannerRef.current) {
      await scannerRef.current.clear();
    }
    handleMarkAttendance(decodedText);
  }

  function onScanFailure(error: any) {}

  const handleMarkAttendance = async (registrationId: string) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('mark_attendance', {
        p_registration_id: registrationId,
        p_scanner_id: coordinatorId,
        p_scanner_name: coordinatorName,
      });

      if (rpcError) {
        setError('Failed to verify pass. Please try again.');
        return;
      }

      const result = data as {
        ok?: boolean;
        reason?: string;
        student_name?: string;
        event_name?: string;
      } | null;

      if (!result?.ok) {
        if (result?.reason === 'already_marked') {
          setError(`Already Marked: Attendance for ${result.event_name || 'this event'} was already recorded.`);
          return;
        }

        if (result?.reason === 'not_found') {
          setError('Invalid Pass: Registration not found.');
          return;
        }

        if (result?.reason === 'unauthorized') {
          setError('You are not allowed to mark attendance.');
          return;
        }

        setError('Could not mark attendance. Please retry.');
        return;
      }

      setSuccess(`Success! Attendance marked for ${result.student_name || 'participant'} - ${result.event_name || 'event'}`);
    } catch (err) {
      setError("Failed to mark attendance. Please try again.");
      handleSupabaseError(err, OperationType.UPDATE, `registrations/${registrationId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualId('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="card p-4">
        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Select Event for Attendance</label>
        <select 
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full md:w-64 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary"
        >
          {myEvents.map(e => (
            <option key={e.id} value={e.id}>{e.title || e.name}</option>
          ))}
          {myEvents.length === 0 && <option value="">No events assigned</option>}
        </select>
      </div>

      <div className="max-w-2xl mx-auto text-center">
        <div className="flex gap-4 border-b border-gray-200 mb-8">
          <button 
            onClick={() => setMode('scan')}
            className={`flex-1 pb-3 text-sm font-bold transition-all relative ${mode === 'scan' ? 'text-red-primary' : 'text-gray-400'}`}
          >
            Check-In Scanner
            {mode === 'scan' && <motion.div layoutId="att-coord" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-primary" />}
          </button>
          <button 
            onClick={() => setMode('history')}
            className={`flex-1 pb-3 text-sm font-bold transition-all relative ${mode === 'history' ? 'text-red-primary' : 'text-gray-400'}`}
          >
            History ({history.length})
            {mode === 'history' && <motion.div layoutId="att-coord" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-primary" />}
          </button>
        </div>

        {mode === 'scan' ? (
          <div className="space-y-6">
            {!scanResult && !success && !error ? (
              <div className="space-y-8">
                <div id="reader-coordinator" className="overflow-hidden rounded-3xl border-4 border-red-primary shadow-2xl bg-black min-h-[400px]" />
                <div className="text-center">
                  <h3 className="text-2xl font-display font-bold">Participant Check-In</h3>
                  <p className="text-sm text-gray-500 mt-2 px-8">Scan the student's QR code from their UniGuild event pass.</p>
                </div>
                
                <div className="pt-8 border-t border-gray-100">
                  <div className="card p-6 bg-gray-50/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-widest text-center">Manual Entry (7-Digit ID)</p>
                    <div className="flex flex-col gap-4 max-w-sm mx-auto">
                      <input 
                        type="text" 
                        maxLength={7}
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 1234567" 
                        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-2xl font-mono font-bold text-center tracking-[0.5em] outline-none focus:border-red-primary focus:ring-4 focus:ring-red-primary/5 transition-all"
                      />
                      <button 
                        onClick={() => handleMarkAttendance(manualId)}
                        disabled={manualId.length !== 7 || isProcessing}
                        className="btn-primary w-full py-4 text-sm font-bold shadow-xl shadow-red-primary/20 disabled:opacity-50 transition-all font-display"
                      >
                        {isProcessing ? 'Verifying...' : 'Verify & Mark Attendance'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-12 space-y-6">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-16 h-16 border-4 border-red-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-lg font-bold text-gray-500 uppercase tracking-widest">Verifying Pass...</p>
                  </div>
                ) : (
                  <>
                    {success && (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                          <Check size={48} />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-green-600">Verified Successfully</h3>
                        <p className="text-lg text-gray-600 font-bold">{success}</p>
                      </div>
                    )}
                    {error && (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-24 h-24 bg-red-100 text-red-primary rounded-full flex items-center justify-center">
                          <X size={48} />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-red-primary">Verification Failed</h3>
                        <p className="text-lg text-gray-600">{error}</p>
                      </div>
                    )}
                    <button 
                      onClick={resetScanner}
                      className="btn-primary w-full py-4 text-lg mt-4 shadow-xl shadow-red-primary/10"
                    >
                      Scan Next Pass
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-left">
            {history.length > 0 ? (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Student</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Event</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Time</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Scanner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-all">
                          <td className="px-6 py-4 text-sm font-bold">{item.studentName}</td>
                          <td className="px-6 py-4 text-xs font-medium">{item.eventName}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">{new Date(item.attendedAt).toLocaleString()}</td>
                          <td className="px-6 py-4 text-xs font-bold text-red-primary">{item.scannedByName || 'System'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-gray-400 card">
                <History size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No attendance records found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- VOLUNTEERS TAB ---
function VolunteersTab({ volunteers, events, setNotification, assignedEventIds }: { volunteers: any[], events: any[], setNotification: (n: any) => void, assignedEventIds: string[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddVolunteerModal, setShowAddVolunteerModal] = useState(false);
  const [allVolunteers, setAllVolunteers] = useState<any[]>([]);
  const assignedEvents = events.filter(e => assignedEventIds.includes(e.id));
  const [selectedEventForVolunteer, setSelectedEventForVolunteer] = useState(assignedEvents[0]?.id || '');

  useEffect(() => {
    const fetchAllVols = async () => {
      const { data } = await supabase.from('users').select('*').eq('role', 'volunteer');
      if (data) setAllVolunteers(data);
    };
    fetchAllVols();
    const channel = supabase.channel('all_volunteers').on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: 'role=eq.volunteer' }, () => fetchAllVols()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const assignedVolunteerIds = assignedEvents
    .flatMap(e => e.volunteer_ids || [])
    .filter(Boolean);

  const handleAddVolunteerToEvent = async (volunteerId: string) => {
    if (!selectedEventForVolunteer) return;
    try {
      const { data: event } = await supabase.from('events').select('volunteer_ids').eq('id', selectedEventForVolunteer).single();
      const currentIds = event?.volunteer_ids || [];
      if (!currentIds.includes(volunteerId)) {
        const { error } = await supabase.from('events').update({
          volunteer_ids: [...currentIds, volunteerId]
        }).eq('id', selectedEventForVolunteer);
        if (error) {
          setNotification({ message: `Failed to add volunteer: ${error.message}`, type: 'error' });
          return;
        }
      }
      setNotification({ message: 'Volunteer added to event successfully!', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Failed to add volunteer. Please try again.', type: 'error' });
    }
  };

  const filteredVolunteers = allVolunteers.filter(v => {
    const matchesSearch = 
      v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const isFromAssignedEvents = assignedVolunteerIds.includes(v.id);
    return matchesSearch && isFromAssignedEvents;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-display font-bold">Volunteer Directory</h3>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search volunteers..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-primary w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddVolunteerModal(true)}
            className="btn-primary py-2 text-xs flex items-center gap-2"
          >
            <Plus size={16} /> Add Volunteer
          </button>
        </div>
      </div>

      {/* Add Volunteer Modal */}
      <AnimatePresence>
        {showAddVolunteerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddVolunteerModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">Add Volunteer to Event</h3>
                <button onClick={() => setShowAddVolunteerModal(false)} className="text-gray-400 hover:text-red-primary"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Select Event</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-red-primary"
                    value={selectedEventForVolunteer}
                    onChange={e => setSelectedEventForVolunteer(e.target.value)}
                  >
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Available Volunteers</label>
                  {allVolunteers.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <img src={v.avatar || `https://i.pravatar.cc/150?u=${v.id}`} className="w-8 h-8 rounded-full" alt="" />
                        <div>
                          <p className="text-xs font-bold">{v.name}</p>
                          <p className="text-[8px] text-gray-500">{v.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddVolunteerToEvent(v.id)}
                        className="p-1.5 bg-red-primary text-white rounded-lg hover:bg-red-dark transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                  {allVolunteers.length === 0 && <p className="text-center py-4 text-gray-400 text-xs">No volunteers found.</p>}
                </div>
              </div>

              <button onClick={() => setShowAddVolunteerModal(false)} className="btn-secondary w-full py-2">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Name</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Department</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Role</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredVolunteers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No volunteers found.</td>
              </tr>
            ) : (
              filteredVolunteers.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={v.avatar || `https://i.pravatar.cc/150?u=${v.id}`} className="w-8 h-8 rounded-full" alt="" />
                      <div>
                        <p className="text-sm font-bold">{v.name}</p>
                        <p className="text-[10px] text-gray-500">{v.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium">{v.department || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] bg-red-50 text-red-primary px-2 py-0.5 rounded font-bold uppercase">{v.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600" /> Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => window.open(`mailto:${v.email}`, '_blank')} className="p-2 text-gray-400 hover:text-red-primary"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- TASKS TAB ---
function TasksTab({ coordinatorId, events, setNotification, assignedEventIds }: { coordinatorId: string, events: any[], setNotification: (n: any) => void, assignedEventIds: string[] }) {
  const [activeBoard, setActiveBoard] = useState('all');
  const [tasks, setTasks] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const assignedEvents = events.filter(e => assignedEventIds.includes(e.id));
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'Logistics',
    eventId: assignedEvents[0]?.id || '',
    priority: 'Medium',
    deadline: '',
    assignedTo: [] as string[]
  });
  const [eventVolunteers, setEventVolunteers] = useState<any[]>([]);

  useEffect(() => {
    if (!newTask.eventId) return;
    const fetchEventVols = async () => {
      const { data: event } = await supabase.from('events').select('volunteer_ids').eq('id', newTask.eventId).single();
      const vIds = event?.volunteer_ids || [];
      if (vIds.length > 0) {
        const { data: vols } = await supabase.from('users').select('*').in('id', vIds);
        if (vols) setEventVolunteers(vols);
      } else {
        setEventVolunteers([]);
      }
    };
    fetchEventVols();
    const channel = supabase.channel(`event_vols_${newTask.eventId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${newTask.eventId}` }, () => fetchEventVols()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [newTask.eventId]);

  useEffect(() => {
    if (!coordinatorId) return;
    const fetchTasksData = async () => {
      const { data } = await supabase.from('tasks').select('*').eq('created_by', coordinatorId);
      if (data) setTasks(data.map(t => ({ ...t, coordinatorId: t.created_by, eventId: t.event_id, assignedTo: t.assigned_to, createdAt: t.created_at })));
    };
    fetchTasksData();
    const channel = supabase.channel(`coord_tasks_${coordinatorId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `created_by=eq.${coordinatorId}` }, () => fetchTasksData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coordinatorId]);

  const handleCreateTask = async () => {
    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        category: newTask.category,
        event_id: newTask.eventId,
        priority: newTask.priority,
        deadline: newTask.deadline || null,
        assigned_to: newTask.assignedTo,
        created_by: coordinatorId,
        status: 'todo',
        created_at: new Date().toISOString()
      };
      const { error } = await supabase.from('tasks').insert(taskData);
      if (error) {
        setNotification({ message: `Task creation failed: ${error.message}`, type: 'error' });
        return;
      }
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', category: 'Logistics', eventId: events[0]?.id || '', priority: 'Medium', deadline: '', assignedTo: [] });
      setNotification({ message: 'Task created successfully!', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Task creation failed. Please try again.', type: 'error' });
    }
  };

  const filteredTasks = tasks.filter(t => activeBoard === 'all' || t.status === activeBoard.replace(' ', ''));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-4 border-b border-gray-200">
          {['All Tasks', 'To Do', 'In Progress', 'Done'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveBoard(tab.toLowerCase())}
              className={`pb-3 px-2 text-sm font-bold transition-all relative ${
                activeBoard === tab.toLowerCase() ? 'text-red-primary' : 'text-gray-400'
              }`}
            >
              {tab}
              {activeBoard === tab.toLowerCase() && <motion.div layoutId="task-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-primary" />}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary py-2 text-xs flex items-center gap-2"><Plus size={16} /> New Task</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {['todo', 'inprogress', 'done'].map(status => (
          <div key={status} className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                {status === 'todo' ? 'To Do' : status === 'inprogress' ? 'In Progress' : 'Done'}
              </h4>
              <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold">
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>
            {tasks.filter(t => t.status === status).map(task => (
              <div key={task.id} className="card p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    task.category === 'Logistics' ? 'bg-red-50 text-red-primary' : task.category === 'Marketing' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {task.category}
                  </span>
                  <button onClick={async () => {
                    const next = task.status === 'todo' ? 'inprogress' : task.status === 'inprogress' ? 'done' : 'todo';
                    const { error } = await supabase.from('tasks').update({ status: next, updated_at: new Date().toISOString() }).eq('id', task.id);
                    if (error) {
                      setNotification({ message: `Task update failed: ${error.message}`, type: 'error' });
                      return;
                    }
                    setNotification({ message: 'Task status updated successfully!', type: 'success' });
                  }} className="text-gray-300 hover:text-red-primary"><MoreVertical size={14} /></button>
                </div>
                <p className="text-sm font-bold">{task.title}</p>
                <p className="text-[10px] text-gray-500 line-clamp-2">{task.description}</p>
                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                  <div className="flex -space-x-2">
                    {(task.assignedTo || []).slice(0, 3).map((v: any, j: number) => (
                      <img key={j} src={`https://i.pravatar.cc/100?u=${v}`} className="w-5 h-5 rounded-full border-2 border-white" alt="" />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                    <Clock size={10} /> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                  </div>
                </div>
              </div>
            ))}
            {tasks.filter(t => t.status === status).length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl text-gray-300 text-[10px] font-bold uppercase">No Tasks</div>
            )}
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-display font-bold">Create New Task</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Task Title</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-red-primary"
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Enter task title..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Description</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-red-primary h-16 resize-none"
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Describe the task..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Event</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary"
                      value={newTask.eventId}
                      onChange={e => setNewTask({...newTask, eventId: e.target.value})}
                    >
                      {events.map(e => <option key={e.id} value={e.id}>{e.title || e.name}</option>)}
                      {events.length === 0 && <option value="">No events assigned</option>}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Category</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary"
                      value={newTask.category}
                      onChange={e => setNewTask({...newTask, category: e.target.value})}
                    >
                      <option>Logistics</option>
                      <option>Marketing</option>
                      <option>Technical</option>
                      <option>Hospitality</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Deadline</label>
                    <input 
                      type="date" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary"
                      value={newTask.deadline}
                      onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Priority</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary"
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value})}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Assign Volunteers ({eventVolunteers.length} available)</label>
                  <div className="max-h-24 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50">
                    {eventVolunteers.map(v => (
                      <label key={v.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="accent-red-primary"
                          checked={newTask.assignedTo.includes(v.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTask({...newTask, assignedTo: [...newTask.assignedTo, v.id]});
                            } else {
                              setNewTask({...newTask, assignedTo: newTask.assignedTo.filter(id => id !== v.id)});
                            }
                          }}
                        />
                        <span className="text-xs">{v.name}</span>
                      </label>
                    ))}
                    {eventVolunteers.length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-2">No volunteers in this event</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
                <button onClick={handleCreateTask} disabled={!newTask.title.trim() || !newTask.eventId} className="btn-primary flex-1 py-2 text-sm disabled:opacity-50">Create Task</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// --- ANNOUNCEMENTS TAB ---
function AnnouncementsTab({ events, setNotification, currentUser }: { events: any[], setNotification: (n: any) => void, currentUser: any }) {
  const [audience, setAudience] = useState('All');
  const [targetEvent, setTargetEvent] = useState('All Events');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(10);
      if (data) setRecentBroadcasts(data.map(b => ({ ...b, createdAt: b.created_at, authorId: b.author_id })));
    };
    fetchBroadcasts();
    const channel = supabase.channel('broadcasts').on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, () => fetchBroadcasts()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleBroadcast = async () => {
    if (!subject || !message) {
      setNotification({ message: 'Please fill in both subject and message.', type: 'error' });
      return;
    }
    try {
      const { error } = await supabase.from('broadcasts').insert({
        subject,
        message,
        audience,
        target_event: targetEvent,
        created_at: new Date().toISOString(),
        author_id: currentUser?.uid
      });
      if (error) {
        setNotification({ message: `Broadcast failed: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: `Announcement broadcasted to ${audience} for ${targetEvent}!`, type: 'success' });
      setSubject('');
      setMessage('');
    } catch (err) {
      setNotification({ message: 'Broadcast failed. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-6">
          <h3 className="text-xl font-display font-bold mb-6">Send New Announcement</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Target Event</label>
              <select 
                value={targetEvent}
                onChange={(e) => setTargetEvent(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary"
              >
                <option>All Events</option>
                {events.map(e => <option key={e.id} value={e.title || e.name}>{e.title || e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Target Audience</label>
              <div className="flex gap-3">
                {['All', 'Volunteers', 'Participants', 'Coordinators'].map(t => (
                  <button 
                    key={t} 
                    onClick={() => setAudience(t)}
                    className={`flex-1 py-2 border rounded-lg text-[10px] font-bold uppercase transition-all ${
                      audience === t ? 'bg-red-primary text-white border-red-primary' : 'border-gray-200 text-gray-500 hover:border-red-primary hover:text-red-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                placeholder="Emergency Update / General Info..." 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Message</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary h-32 resize-none" 
                placeholder="Type your message here..." 
              />
            </div>
            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-red-primary" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Send as Push</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-red-primary" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Send as Email</span>
                </label>
              </div>
              <button onClick={handleBroadcast} className="btn-primary py-2 text-xs flex items-center gap-2"><Send size={16} /> Broadcast</button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-display font-bold">Recent Broadcasts</h3>
        <div className="space-y-4">
          {recentBroadcasts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No recent broadcasts.</div>
          ) : (
            recentBroadcasts.map(ann => (
              <div key={ann.id} className="card p-4 border-l-4 border-red-primary">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold">{ann.subject}</p>
                  <span className="text-[8px] text-gray-400">
                    {ann.createdAt ? new Date(ann.createdAt).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-2">{ann.message}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                  <span className="text-[8px] font-bold text-red-primary uppercase">Sent to: {ann.audience}</span>
                  <button onClick={async () => {
                    const { error } = await supabase.from('broadcasts').delete().eq('id', ann.id);
                    if (error) {
                      setNotification({ message: `Delete failed: ${error.message}`, type: 'error' });
                      return;
                    }
                    setNotification({ message: 'Broadcast deleted successfully!', type: 'success' });
                  }} className="text-gray-400 hover:text-red-primary"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --- ANALYTICS TAB ---
function AnalyticsTab({ events }: { events: any[] }) {
  const totalRegistrations = events.reduce((acc, curr) => acc + (curr.registrationsCount || 0), 0);
  const avgRegistrations = events.length > 0 ? Math.round(totalRegistrations / events.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Total Registrations</p>
          <p className="text-4xl font-mono font-bold text-red-primary">{totalRegistrations}</p>
          <p className="text-[10px] text-green-600 font-bold mt-2">Across {events.length} events</p>
        </div>
        <div className="card p-6 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Avg per Event</p>
          <p className="text-4xl font-mono font-bold text-red-primary">{avgRegistrations}</p>
          <p className="text-[10px] text-gray-400 font-bold mt-2">Registration rate</p>
        </div>
        <div className="card p-6 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Active Events</p>
          <p className="text-4xl font-mono font-bold text-red-primary">{events.filter(e => (e.status || '').toLowerCase() === 'upcoming').length}</p>
          <p className="text-[10px] text-red-primary font-bold mt-2">Currently live</p>
        </div>
        <div className="card p-6 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Feedback Score</p>
          <p className="text-4xl font-mono font-bold text-red-primary">4.8</p>
          <p className="text-[10px] text-amber-500 font-bold mt-2">★★★★★</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold">Registration Trend</h3>
            <button onClick={() => {
              const rows = events.map((e) => `${e.title || e.name},${e.date},${e.registrationsCount || 0},${e.status || 'Upcoming'}`).join('\n');
              const csv = `data:text/csv;charset=utf-8,Event,Date,Registrations,Status\n${rows}`;
              const link = document.createElement('a');
              link.setAttribute('href', encodeURI(csv));
              link.setAttribute('download', 'registration-trend.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} className="p-2 border border-gray-100 rounded-lg text-gray-400 hover:text-red-primary"><Download size={18} /></button>
          </div>
          <div className="h-64 bg-gray-50 rounded-xl border border-gray-100 p-4 overflow-y-auto">
            <div className="space-y-3">
              {events.length === 0 && <p className="text-xs text-gray-400 font-bold uppercase tracking-widest text-center pt-20">No data yet</p>}
              {events.slice(0, 8).map((e) => {
                const total = e?.slots?.total || 100;
                const filled = e?.registrationsCount || e?.slots?.filled || 0;
                const percent = Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
                return (
                  <div key={e.id}>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="truncate max-w-[70%]">{e.title || e.name}</span>
                      <span className="text-red-primary">{filled}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-xl font-display font-bold mb-6">Department Performance</h3>
          <div className="space-y-6">
            {[
              { dept: 'Technical', val: 95 },
              { dept: 'Marketing', val: 78 },
              { dept: 'Logistics', val: 88 },
              { dept: 'Hospitality', val: 92 }
            ].map(d => (
              <div key={d.dept}>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>{d.dept}</span>
                  <span className="text-red-primary">{d.val}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-primary transition-all duration-1000" style={{ width: `${d.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- PROFILE TAB - BENTO BOX 4-COLUMN GRID ---
function ProfileTab({ coordinator, onSave }: { coordinator: any, onSave: (data: any) => void }) {
  const [localProfile, setLocalProfile] = useState(coordinator);
  const [newSkill, setNewSkill] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState(coordinator?.avatar);

  useEffect(() => {
    setLocalProfile(coordinator);
    setAvatarPreview(coordinator?.avatar);
  }, [coordinator]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !localProfile.skills?.includes(newSkill.trim())) {
      setLocalProfile({
        ...localProfile,
        skills: [...(localProfile.skills || []), newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setLocalProfile({ ...localProfile, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({ ...localProfile, avatar: avatarPreview });
  };

  if (!coordinator) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* ROW 1: Avatar + Links (col-span-2) */}
      <div className="col-span-2 card p-6 flex flex-col items-center text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <img 
            src={avatarPreview || "https://picsum.photos/seed/coordinator/200/200"} 
            className="w-full h-full rounded-full border-4 border-red-primary p-1" 
            alt="" 
          />
          <button 
            onClick={() => avatarInputRef.current?.click()} 
            className="absolute bottom-0 right-0 w-9 h-9 bg-red-primary text-white rounded-full flex items-center justify-center border-4 border-white"
          >
            <Camera size={16} />
          </button>
        </div>
        <h3 className="text-xl font-display font-bold">{localProfile.name}</h3>
        <span className="bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase mt-2">Event Coordinator</span>
        <p className="text-sm text-gray-500 mb-4 mt-2">{localProfile.college}</p>
        <div className="flex justify-center gap-3 mb-4">
          <a href={localProfile.github || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:text-red-primary hover:bg-red-50 transition-all"><Github size={18} /></a>
          <a href={localProfile.linkedin || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:text-red-primary hover:bg-red-50 transition-all"><Linkedin size={18} /></a>
          <a href={localProfile.website || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:text-red-primary hover:bg-red-50 transition-all"><Globe size={18} /></a>
        </div>
        <div className="flex items-center gap-3 w-full">
          <input 
            type="text" 
            placeholder="GitHub URL" 
            value={localProfile.github || ''}
            onChange={e => setLocalProfile({...localProfile, github: e.target.value})}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-primary"
          />
          <input 
            type="text" 
            placeholder="LinkedIn URL" 
            value={localProfile.linkedin || ''}
            onChange={e => setLocalProfile({...localProfile, linkedin: e.target.value})}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-primary"
          />
        </div>
      </div>

      {/* ROW 1: Personal Info (col-span-1) */}
      <div className="col-span-1 card p-6">
        <h4 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <User size={16} className="text-red-primary" /> Personal Info
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Full Name</label>
            <input 
              type="text" 
              value={localProfile.name} 
              onChange={e => setLocalProfile({...localProfile, name: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Email</label>
            <input 
              type="email" 
              value={localProfile.email} 
              disabled
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-xs outline-none cursor-not-allowed" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">College</label>
            <input 
              type="text" 
              value={localProfile.college} 
              onChange={e => setLocalProfile({...localProfile, college: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Department</label>
            <input 
              type="text" 
              value={localProfile.department || ''} 
              onChange={e => setLocalProfile({...localProfile, department: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Year</label>
            <input 
              type="text" 
              value={localProfile.year || ''} 
              onChange={e => setLocalProfile({...localProfile, year: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
        </div>
      </div>

      {/* ROW 1: Coordinator Stats (col-span-1) */}
      <div className="col-span-1 card p-6 flex flex-col items-center">
        <h4 className="text-lg font-display font-bold mb-4 flex items-center gap-2 self-start">
          <TrendingUp size={16} className="text-red-primary" /> Stats
        </h4>
        <div className="grid grid-cols-2 gap-3 w-full text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-red-primary">{coordinator.eventsManaged || 12}</p>
            <p className="text-[8px] text-gray-400 uppercase">Events Managed</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-green-600">{coordinator.volunteersLed || 150}+</p>
            <p className="text-[8px] text-gray-400 uppercase">Volunteers Led</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-amber-500">{coordinator.avgRating || 4.9}</p>
            <p className="text-[8px] text-gray-400 uppercase">Avg Rating</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-blue-600">{coordinator.tasksCompleted || 85}%</p>
            <p className="text-[8px] text-gray-400 uppercase">Task Done</p>
          </div>
        </div>
      </div>

      {/* ROW 2: Skills (col-span-2) */}
      <div className="col-span-2 card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-display font-bold flex items-center gap-2">
            <Award size={16} className="text-red-primary" /> Skills
          </h4>
          <span className="text-[10px] bg-red-50 text-red-primary px-2 py-0.5 rounded-full font-bold">{localProfile.skills?.length || 0} skills</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {localProfile.skills?.map((skill: string) => (
            <span key={skill} className="bg-red-50 text-red-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-red-100">
              {skill} 
              <button onClick={() => setLocalProfile({...localProfile, skills: localProfile.skills.filter((s: string) => s !== skill)})} className="hover:text-red-dark">
                <XCircle size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddSkill()}
            placeholder="Add a new skill..."
            className="flex-1 border border-gray-200 px-3 py-2 rounded-lg text-xs outline-none focus:border-red-primary bg-gray-50"
          />
          <button onClick={handleAddSkill} className="btn-primary px-4 py-2 text-xs flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Bio (150 chars)</label>
          <textarea 
            maxLength={150} 
            value={localProfile.bio}
            onChange={e => setLocalProfile({...localProfile, bio: e.target.value})}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs outline-none focus:border-red-primary h-20 resize-none" 
            placeholder="Tell us about yourself..." 
          />
        </div>
      </div>

      {/* ROW 2: Contact Info (col-span-2) */}
      <div className="col-span-2 card p-6">
        <h4 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <Mail size={16} className="text-red-primary" /> Contact Information
        </h4>
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Email Address</label>
            <input 
              type="email" 
              value={localProfile.email} 
              onChange={e => setLocalProfile({...localProfile, email: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs outline-none focus:border-red-primary" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Phone Number</label>
            <input 
              type="text" 
              value={localProfile.phone || ''} 
              onChange={e => setLocalProfile({...localProfile, phone: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs outline-none focus:border-red-primary" 
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="btn-primary px-6 py-2 flex items-center gap-2 shadow-lg shadow-red-primary/30">
            <CheckCircle2 size={16} /> Save Changes
          </button>
        </div>
      </div>

      {/* ROW 3: Social Links (col-span-4) */}
      <div className="col-span-4 card p-6">
        <h4 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <ExternalLink size={16} className="text-red-primary" /> Social Links
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-2">GitHub</label>
            <div className="relative">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="url" 
                value={localProfile.github || ''}
                onChange={e => setLocalProfile({...localProfile, github: e.target.value})}
                placeholder="https://github.com/username"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:border-red-primary" 
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-2">LinkedIn</label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="url" 
                value={localProfile.linkedin || ''}
                onChange={e => setLocalProfile({...localProfile, linkedin: e.target.value})}
                placeholder="https://linkedin.com/in/username"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:border-red-primary" 
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="url" 
                value={localProfile.website || ''}
                onChange={e => setLocalProfile({...localProfile, website: e.target.value})}
                placeholder="https://yoursite.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:border-red-primary" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- TEAM TAB ---
function TeamTab({ events, setNotification, setConfirmModal }: { 
  events: any[], 
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void 
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    
    const fetchTeam = async () => {
      const { data: event } = await supabase.from('events').select('volunteer_ids').eq('id', selectedEventId).single();
      const volunteerIds = event?.volunteer_ids || [];
      
      if (volunteerIds.length > 0) {
        const { data: vols } = await supabase.from('users').select('*').in('id', volunteerIds);
        if (vols) setTeamMembers(vols);
      } else {
        setTeamMembers([]);
      }
      setLoading(false);
    };

    fetchTeam();
    const channel = supabase.channel(`team_${selectedEventId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${selectedEventId}` }, () => fetchTeam()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedEventId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold">Team Management</h3>
          <p className="text-sm text-gray-500">Volunteers assigned to your events</p>
        </div>
        <select 
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-red-primary"
        >
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
          {events.length === 0 && <option value="">No Events Found</option>}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6 bg-red-50 border-red-100">
          <p className="text-[10px] text-red-primary font-bold uppercase mb-1">Total Volunteers</p>
          <p className="text-3xl font-mono font-bold text-red-primary">{teamMembers.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Active Now</p>
          <p className="text-3xl font-mono font-bold">{teamMembers.filter(m => m.status === 'Active').length || teamMembers.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Tasks Completed</p>
          <p className="text-3xl font-mono font-bold">85%</p>
        </div>
      </div>
      
      <div className="card p-6">
        <h4 className="font-bold mb-4">Assigned Volunteers</h4>
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading team...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="pb-4">Volunteer</th>
                  <th className="pb-4">Department</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teamMembers.map(m => (
                  <tr key={m.id} className="group hover:bg-gray-50/50 transition-all">
                    <td className="py-4">
                      <div>
                        <p className="text-sm font-bold">{m.name}</p>
                        <p className="text-[10px] text-gray-500">{m.email}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-xs font-medium text-gray-600">{m.department || 'General'}</span>
                    </td>
                    <td className="py-4">
                      <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-[10px] font-bold uppercase">Active</span>
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: 'Remove Volunteer',
                            message: `Remove ${m.name} from this event?`,
                            onConfirm: async () => {
                              try {
                                const { data: event } = await supabase.from('events').select('volunteer_ids').eq('id', selectedEventId).single();
                                const currentIds = event?.volunteer_ids || [];
                                const { error } = await supabase.from('events').update({
                                  volunteer_ids: currentIds.filter(id => id !== m.id)
                                }).eq('id', selectedEventId);
                                if (error) {
                                  setNotification({ message: `Failed to remove volunteer: ${error.message}`, type: 'error' });
                                  return;
                                }
                                setNotification({ message: `${m.name} removed from event`, type: 'success' });
                              } catch (err) {
                                setNotification({ message: 'Failed to remove volunteer. Please try again.', type: 'error' });
                              }
                            }
                          });
                        }}
                        className="text-gray-400 hover:text-red-primary p-2 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {teamMembers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                      No volunteers assigned to this event yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- CERTIFICATES TAB ---
function CertificatesTab({ setNotification, setConfirmModal, assignedEventIds, myEvents }: { 
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void,
  assignedEventIds: string[],
  myEvents: any[]
}) {
  const [template, setTemplate] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [namePosition, setNamePosition] = useState({ x: 50, y: 50 });
  const [participants, setParticipants] = useState<any[]>([]);
  const [isIssuing, setIsIssuing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>(myEvents[0]?.id || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (assignedEventIds.length === 0) return;
    const fetchParticipants = async () => {
      const { data } = await supabase.from('registrations').select('*').in('event_id', assignedEventIds).eq('attended', true);
      if (data) setParticipants(data.map(r => ({ ...r, studentName: r.student_name, studentId: r.student_id, certificateIssued: r.certificate_issued, certificateUrl: r.certificate_url, issuedAt: r.issued_at })));
    };
    fetchParticipants();
    const channel = supabase.channel('participants_certs').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: 'attended=eq.true' }, () => fetchParticipants()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [assignedEventIds]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTemplatePreview(reader.result as string);
        setTemplate(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNamePosition({ x, y });
  };

  const handleIssueCertificate = async (participantId: string) => {
    if (!template) {
      setNotification({ message: "Please upload a certificate template first.", type: 'error' });
      return;
    }

    setIsIssuing(true);
    try {
      const { error } = await supabase.from('registrations').update({
        certificate_issued: true,
        certificate_url: 'https://example.com/certificate-template.pdf',
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', participantId);
      if (error) {
        setNotification({ message: `Certificate issue failed: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Certificate issued successfully!', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Certificate issue failed. Please try again.', type: 'error' });
    } finally {
      setIsIssuing(false);
    }
  };

  const handleIssueAll = async () => {
    if (!template) {
      setNotification({ message: "Please upload a certificate template first.", type: 'error' });
      return;
    }

    const pending = filteredParticipants.filter(p => !p.certificateIssued);
    if (pending.length === 0) {
      setNotification({ message: "No pending certificates to issue.", type: 'error' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Issue Certificates',
      message: `Are you sure you want to issue certificates to all ${pending.length} pending participants?`,
      onConfirm: async () => {
        setIsIssuing(true);
        try {
          for (const p of pending) {
            const { error } = await supabase.from('registrations').update({
              certificate_issued: true,
              certificate_url: 'https://example.com/certificate-template.pdf',
              issued_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).eq('id', p.id);
            if (error) {
              throw new Error(error.message);
            }
          }
          setNotification({ message: `Successfully issued ${pending.length} certificates!`, type: 'success' });
        } catch (err) {
          setNotification({ message: `Failed to issue some certificates: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' });
        } finally {
          setIsIssuing(false);
        }
      }
    });
  };

  const filteredParticipants = selectedEventId
    ? participants.filter(p => p.eventId === selectedEventId || p.event_id === selectedEventId).filter(p => 
        p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : participants.filter(p => 
        p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Issue Certificates</h2>
          <p className="text-sm text-gray-500">Generate and send certificates to verified participants.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-red-primary"
          >
            <option value="">All Events</option>
            {myEvents.map(e => (
              <option key={e.id} value={e.id}>{e.title || e.name}</option>
            ))}
          </select>
          <button 
            onClick={handleIssueAll}
            disabled={isIssuing || !template || filteredParticipants.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Award size={16} /> Issue All
          </button>
          <button onClick={() => {
            const rows = filteredParticipants.map((p) => `${p.studentName},${p.studentId},${p.eventName || ''},${p.certificateIssued ? 'Issued' : 'Pending'}`).join('\n');
            const csv = `data:text/csv;charset=utf-8,Student,Student ID,Event,Certificate Status\n${rows}`;
            const link = document.createElement('a');
            link.setAttribute('href', encodeURI(csv));
            link.setAttribute('download', 'certificates-list.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FileText size={18} className="text-red-primary" /> Template
            </h3>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".png,.jpg,.jpeg"
              onChange={handleFileChange}
            />
            <div 
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative overflow-hidden ${
                template ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-red-primary hover:bg-red-50'
              }`}
              onClick={() => !templatePreview && fileInputRef.current?.click()}
            >
              {templatePreview ? (
                <div className="space-y-3">
                  <div 
                    ref={previewRef}
                    className="relative w-full aspect-[1.414/1] bg-white shadow-inner rounded overflow-hidden cursor-crosshair"
                    onClick={handlePreviewClick}
                  >
                    <img src={templatePreview} className="w-full h-full object-contain" alt="Template Preview" />
                    <div 
                      className="absolute pointer-events-none border-2 border-red-primary bg-red-primary/10 px-2 py-1 rounded text-[10px] font-bold text-red-primary whitespace-nowrap"
                      style={{ 
                        left: `${namePosition.x}%`, 
                        top: `${namePosition.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      [STUDENT NAME]
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-green-600 uppercase font-bold truncate">{template}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="text-[10px] font-bold text-red-primary uppercase hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                    <Plus size={20} />
                  </div>
                  <p className="text-sm font-bold text-gray-600">Upload Template</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">PNG/JPG</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
              <h3 className="font-bold">Participants ({filteredParticipants.length})</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredParticipants.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-all">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-red-50 text-red-primary flex items-center justify-center font-bold text-xs">
                            {p.studentName?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-medium">{p.studentName}</span>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-gray-500">{p.eventName || 'N/A'}</td>
                      <td className="py-3">
                        {p.certificateIssued ? (
                          <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit">
                            <Check size={8} /> Issued
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {p.certificateIssued ? (
                          <button onClick={() => p.certificateUrl && window.open(p.certificateUrl, '_blank')} className="text-gray-400 hover:text-red-primary p-1">
                            <Eye size={14} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleIssueCertificate(p.id)}
                            disabled={isIssuing || !template}
                            className="btn-primary py-1 px-2 text-[10px] disabled:opacity-50"
                          >
                            Issue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredParticipants.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 text-xs">
                        No eligible participants found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
