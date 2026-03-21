import { useState, useEffect, useRef, type ChangeEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, PlusCircle, Users, ClipboardCheck, 
  Megaphone, BarChart3, User, Clock, CheckCircle2, MoreVertical,
  Download, Search, Filter, Mail, Trash2, Edit, ExternalLink,
  MapPin, Globe, Users2, UserPlus, Award, FileText, Check, Plus, Eye, QrCode, Briefcase, X, XCircle,
  TrendingUp, ArrowUpRight, ScrollText, CheckSquare, AlertCircle
} from 'lucide-react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { UniGuildData } from '../data';
import DashboardShell from '../components/DashboardShell';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { useAuth } from '../context/AuthContext';

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'my-events', label: 'My Events', icon: <Calendar size={20} /> },
  { id: 'create-event', label: 'Create Event', icon: <PlusCircle size={20} /> },
  { id: 'my-team', label: 'My Team', icon: <Users size={20} />, subItems: [
    { id: 'assign-evaluator', label: 'Assign Evaluator' },
    { id: 'assign-coordinator', label: 'Assign Event Coordinator' },
    { id: 'assign-volunteer', label: 'Assign Volunteers' }
  ]},
  { id: 'attendance', label: 'Attendance', icon: <ClipboardCheck size={20} /> },
  { id: 'certificates', label: 'Certificates', icon: <Award size={20} /> },
  { id: 'jobs', label: 'Jobs', icon: <Briefcase size={20} /> },
  { id: 'announcements', label: 'Announcements', icon: <Megaphone size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
];
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

function mapHeadCoordinatorJobPayload(jobData: any) {
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
    deadline: jobData.deadline ? new Date(jobData.deadline).toISOString() : null,
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

export default function HeadCoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [coordinator, setCoordinator] = useState({
    name: 'Dr. Ramesh Kumar',
    email: 'ramesh.kumar@iitb.ac.in',
    role: 'Head Coordinator',
    department: 'Computer Science & Engineering',
    college: 'IIT Bombay',
    avatar: 'https://i.pravatar.cc/300?u=ramesh'
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchJobs = async () => {
      const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (data) setJobs(data.map((j: any) => ({ ...j, appLink: j.app_link, isPaid: j.is_paid, applicationsCount: j.applications_count, createdBy: j.created_by, createdAt: j.created_at })));
    };

    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('*').order('date', { ascending: false });
      if (data) setEvents(data.map((e: any) => ({ ...e, bannerUrl: e.banner_url, targetAudience: e.target_audience, createdBy: e.created_by, createdAt: e.created_at })));
    };

    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications').select('*').or(`user_id.eq.${currentUser.uid},user_id.eq.all`).order('created_at', { ascending: false }).limit(20);
      if (data) setNotifications(data.map((n: any) => ({ ...n, createdAt: n.created_at, userId: n.user_id })));
    };

    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('*');
      if (data) setAvailableUsers(data);
    };

    const fetchAssignments = async () => {
      const { data } = await supabase.from('assignments').select('*');
      if (data) setAssignments(data);
    };

    const fetchRegistrations = async () => {
      const { data } = await supabase.from('registrations').select('*');
      if (data) setRegistrations(data);
    };

    fetchJobs();
    fetchEvents();
    fetchNotifications();
    fetchUsers();
    fetchAssignments();
    fetchRegistrations();

    const channel = supabase.channel('hc_dashboard_data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchJobs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => fetchAssignments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => fetchRegistrations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.uid]);

  const handleSaveProfile = () => {
    setNotification({ message: 'Profile updated successfully!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateEvent = async (eventData: any): Promise<boolean> => {
    if (!currentUser) return false;
    setIsPublishing(true);
    try {
      const eventDate = eventData.startDate || eventData.date;
      const formattedDate = new Date(eventDate).toISOString();
      
      const { bannerUrl, targetAudience, coordinatorEmail, registrationType, maxTeamSize } = eventData;
      const { error } = await supabase.from('events').insert({
        name: eventData.name,
        title: eventData.name,
        category: eventData.category || 'Hackathon',
        host: eventData.host || 'All',
        location: eventData.location || '',
        description: eventData.description || '',
        date: formattedDate,
        banner_url: bannerUrl || '',
        coordinator_email: coordinatorEmail || '',
        registration_type: registrationType || 'single',
        max_team_size: parseInt(maxTeamSize) || 1,
        target_audience: targetAudience || 'All Students',
        created_by: currentUser.uid,
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
      setActiveTab('my-events');
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
    if (!currentUser) return false;
    setIsPostingJob(true);
    try {
      const { error } = await supabase.from('jobs').insert({
        ...mapHeadCoordinatorJobPayload(jobData),
        created_by: currentUser.uid,
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
      setActiveTab('jobs');
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

  const handleSendAnnouncement = async (data: any) => {
    try {
      const { error } = await supabase.from('notifications').insert({
        ...data,
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab setActiveTab={setActiveTab} events={events} jobs={jobs} />;
      case 'my-events': return <MyEventsTab events={events} setNotification={setNotification} assignments={assignments} users={availableUsers} />;
      case 'create-event': return <CreateEventTab onPost={handleCreateEvent} isPublishing={isPublishing} setNotification={setNotification} currentUser={currentUser} />;
      case 'my-team': return <MyTeamTab events={events} users={availableUsers} assignments={assignments} setNotification={setNotification} setConfirmModal={setConfirmModal} />;
      case 'assign-evaluator': return <MyTeamTab initialSection="evaluator" events={events} users={availableUsers} assignments={assignments} setNotification={setNotification} setConfirmModal={setConfirmModal} />;
      case 'assign-coordinator': return <MyTeamTab initialSection="coordinator" events={events} users={availableUsers} assignments={assignments} setNotification={setNotification} setConfirmModal={setConfirmModal} />;
      case 'assign-volunteer': return <MyTeamTab initialSection="volunteer" events={events} users={availableUsers} assignments={assignments} setNotification={setNotification} setConfirmModal={setConfirmModal} />;
      case 'attendance': return <AttendanceTab events={events} registrations={registrations} setNotification={setNotification} />;
      case 'certificates': return <CertificatesTab events={events} registrations={registrations} setNotification={setNotification} setConfirmModal={setConfirmModal} />;
      case 'jobs': return <JobsTab jobs={jobs} onPost={handlePostJob} isPosting={isPostingJob} setNotification={setNotification} />;
      case 'announcements': return <AnnouncementsTab onSend={handleSendAnnouncement} setNotification={setNotification} notifications={notifications} />;
      case 'analytics': return <AnalyticsTab events={events} />;
      case 'profile': return <ProfileTab coordinator={coordinator} setCoordinator={setCoordinator} onSave={handleSaveProfile} setNotification={setNotification} />;
      default: return <OverviewTab setActiveTab={setActiveTab} events={events} jobs={jobs} />;
    }
  };

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      roleName="Head Coordinator"
      userName={coordinator?.name || "Coordinator"}
      userAvatar={coordinator?.avatar}
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

// --- OVERVIEW TAB ---
function OverviewTab({ setActiveTab, events, jobs }: { 
  setActiveTab: (tab: string) => void,
  events: any[],
  jobs: any[]
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-primary to-red-dark rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight mb-2">Good morning, Dr. Ramesh Kumar!</h2>
          <p className="opacity-90 mb-4">IIT Bombay • Department of Computer Science</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setActiveTab('create-event')}
              className="bg-white text-red-primary font-bold py-2 px-6 rounded-lg text-sm shadow-md hover:bg-gray-50 transition-all"
            >
              + Create Event
            </button>
            <button 
              onClick={() => setActiveTab('attendance')}
              className="bg-white/20 backdrop-blur text-white font-bold py-2 px-6 rounded-lg text-sm hover:bg-white/30 transition-all"
            >
              View Attendance
            </button>
          </div>
        </div>
        <div className="hidden lg:block">
          <img src="https://picsum.photos/seed/coordinator/300/200" className="w-64 rounded-xl shadow-2xl border-4 border-white/20" alt="" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Events Managed" value={events.length.toString()} icon={<Calendar size={20} />} />
        <StatCard label="Upcoming" value={events.filter((e: any) => e.status === 'Upcoming').length.toString()} icon={<Clock size={20} />} />
        <StatCard label="Jobs Active" value={jobs.length.toString()} icon={<Briefcase size={20} />} />
        <StatCard label="Participants" value="1,840" icon={<Users2 size={20} />} />
        <StatCard label="Avg Attendance" value="87%" icon={<CheckCircle2 size={20} />} />
        <StatCard label="Pending Tasks" value="5" icon={<ClipboardCheck size={20} />} isUrgent />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-xl font-display font-bold mb-6">Participation by Event</h3>
          <div className="h-64">
            <Bar 
              data={{
                labels: ['Code Rush', 'AI Summit', 'Design Day', 'Web Dev', 'Cyber Sec', 'ML Camp'],
                datasets: [{
                  label: 'Participants',
                  data: [423, 312, 250, 210, 180, 150],
                  backgroundColor: '#f40000',
                  borderRadius: 4
                }]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-xl font-display font-bold mb-6">Next 3 Events</h3>
          <div className="space-y-6">
            {events.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No upcoming events.</p>
            ) : (
              events.slice(0, 3).map((event: any, i: number) => {
                const eventDate = new Date(event.date);
                const day = eventDate.getDate();
                const month = eventDate.toLocaleString('default', { month: 'short' });
                return (
                  <div key={event.id || i} className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex flex-col items-center justify-center border border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-red-primary">{month}</span>
                      <span className="text-lg font-mono font-bold">{day}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-tight">{event.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                        <span className="font-mono text-gray-400">{event.category}</span>
                        <span>•</span>
                        <span className="bg-red-50 text-red-primary px-1.5 rounded font-bold uppercase">{event.status || 'Upcoming'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, isUrgent }: any) {
  return (
    <div className={`card p-4 text-center ${isUrgent ? 'border-red-primary bg-red-50/30' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-3 ${isUrgent ? 'bg-red-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
        {icon}
      </div>
      <div className="text-2xl font-mono font-bold">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">{label}</div>
    </div>
  );
}

// --- MY EVENTS TAB ---
function MyEventsTab({ events, setNotification, assignments = [], users = [] }: { 
  events: any[], 
  setNotification: (n: any) => void,
  assignments?: any[],
  users?: any[]
}) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'registrations' | 'staff'>('overview');

  return (
    <div className="flex gap-6 relative">
      <div className={`flex-1 space-y-6 transition-all ${selectedEvent ? 'mr-96' : ''}`}>
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-display font-bold">Managed Events</h3>
          <div className="flex gap-2">
            <button onClick={() => {
              const rows = events.map((e) => `${e.name},${e.category},${e.date},${e.slots?.filled ?? 0},${e.status || 'Upcoming'}`).join('\n');
              const csv = `data:text/csv;charset=utf-8,Event,Category,Date,Participants,Status\n${rows}`;
              const link = document.createElement('a');
              link.setAttribute('href', encodeURI(csv));
              link.setAttribute('download', 'managed-events.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"><Download size={16} /> Export All</button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Event Name</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Participants</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map(event => (
                <tr key={event.id} onClick={() => setSelectedEvent(event)} className="hover:bg-gray-50 cursor-pointer transition-all">
                  <td className="px-6 py-4 font-bold text-sm">{event.name}</td>
                  <td className="px-6 py-4 text-xs font-medium">{event.category}</td>
                  <td className="px-6 py-4 text-xs">{event.date}</td>
                  <td className="px-6 py-4 font-mono text-sm">{event.slots?.filled ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedEvent(event)} className="p-2 text-gray-400 hover:text-red-primary"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedEvent && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-16 right-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-[85] overflow-y-auto p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-display font-bold text-red-primary truncate pr-4">{selectedEvent.name}</h2>
              <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"><XCircle size={20} /></button>
            </div>

            <div className="flex gap-4 border-b border-gray-100 mb-6">
              {['overview', 'registrations', 'staff'].map((t) => (
                <button 
                  key={t}
                  onClick={() => setActiveSubTab(t as any)}
                  className={`pb-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeSubTab === t ? 'text-red-primary border-b-2 border-red-primary' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {activeSubTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Registrations</p>
                    <p className="text-xl font-mono font-bold text-red-primary">
                      {selectedEvent.slots?.filled || 0} / {selectedEvent.slots?.total || 100}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                    <p className="text-sm font-bold text-gray-600">{selectedEvent.status || 'Upcoming'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Description</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{selectedEvent.description}</p>
                </div>
              </div>
            )}

            {activeSubTab === 'staff' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Assigned Members</h4>
                <div className="space-y-2">
                  {assignments.filter(a => a.event_id === selectedEvent.id).map(a => {
                    const user = users.find(u => u.uid === a.user_id);
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-primary font-bold text-[10px]">
                          {user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">{user?.name || 'Unknown User'}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">{a.role}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${a.status === 'assigned' ? 'bg-blue-400' : 'bg-green-400'}`} title={a.status} />
                      </div>
                    );
                  })}
                  {assignments.filter(a => a.event_id === selectedEvent.id).length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-xs text-gray-400 italic">No staff assigned yet.</p>
                      <button className="text-red-primary text-[10px] font-bold mt-2 hover:underline">Assign Team</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
              <button 
                onClick={() => {
                  const staff = assignments.filter(a => a.event_id === selectedEvent.id).map(a => {
                    const u = users.find(usr => usr.uid === a.user_id);
                    return `${u?.name},${u?.email},${a.role}`;
                  }).join('\n');
                  const csv = `data:text/csv;charset=utf-8,Name,Email,Role\n${staff}`;
                  const link = document.createElement('a');
                  link.setAttribute('href', encodeURI(csv));
                  link.setAttribute('download', `${selectedEvent.name}-staff.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="w-full btn-secondary py-2 text-xs flex items-center justify-center gap-2"
              >
                <Download size={14} /> Export Staff List
              </button>
              
              {selectedEvent.status !== 'Completed' && (
                <button 
                  onClick={async () => {
                    const { error } = await supabase.from('events').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', selectedEvent.id);
                    if (error) {
                      setNotification({ message: `Error: ${error.message}`, type: 'error' });
                      return;
                    }
                    setNotification({ message: `${selectedEvent.name} marked as completed.`, type: 'success' });
                    setSelectedEvent(null);
                  }}
                  className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-green-700 transition-all"
                >
                  Mark Event Complete
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- CREATE EVENT TAB ---
function CreateEventTab({ onPost, isPublishing, setNotification, currentUser }: { 
  onPost: (data: any) => Promise<boolean>, 
  isPublishing?: boolean,
  setNotification: (n: any) => void,
  currentUser: any
}) {
  const [step, setStep] = useState(1);
  const [newEvent, setNewEvent] = useState({
    name: '',
    category: 'Hackathon',
    tags: '',
    description: '',
    bannerUrl: '',
    startDate: '',
    endDate: '',
    venueType: 'Offline',
    capacity: '100',
    website: '',
    location: '',
    coordinatorEmail: '',
    registrationType: 'single',
    maxTeamSize: 1
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleBannerUpload = async (file: File) => {
    try {
      if (currentUser?.isDemo) {
        // For demo users, use a local data URL as they don't have a real Supabase session for storage
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewEvent({ ...newEvent, bannerUrl: reader.result as string });
          setNotification({ message: 'Banner uploaded (Demo Mode)!', type: 'success' });
        };
        reader.readAsDataURL(file);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `event-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      setNewEvent({ ...newEvent, bannerUrl: publicUrl });
      setNotification({ message: 'Banner uploaded successfully!', type: 'success' });
    } catch (error: any) {
      setNotification({ message: `Upload failed: ${error.message}`, type: 'error' });
    }
  };


  const handlePublish = async () => {
    if (!newEvent.name || !newEvent.startDate) {
      setNotification({ message: "Please fill in event name and start date.", type: 'error' });
      return;
    }
    await onPost(newEvent);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stepper */}
      <div className="flex justify-between mb-10 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="relative z-10 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center font-bold transition-all ${
              step >= i ? 'bg-red-primary text-white shadow-lg shadow-red-primary/30' : 'bg-gray-100 text-gray-400'
            }`}>
              {i}
            </div>
            <span className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${step >= i ? 'text-red-primary' : 'text-gray-400'}`}>
              {['Basic', 'Schedule', 'Stages', 'Judging', 'Team'][i-1]}
            </span>
          </div>
        ))}
      </div>

      <div className="card p-8">
        {step === 1 && (
          <div className="space-y-6 animate-in">
            <h3 className="text-2xl font-display font-bold text-red-primary">Step 1: Basic Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Event Name</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                  placeholder="e.g. Code Rush Hackathon 2025"
                  value={newEvent.name}
                  onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Category</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary"
                  value={newEvent.category}
                  onChange={e => setNewEvent({...newEvent, category: e.target.value})}
                >
                  <option>Hackathon</option>
                  <option>Webinar</option>
                  <option>Workshop</option>
                  <option>Competition</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Tags</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                  placeholder="Coding, Innovation, AI..."
                  value={newEvent.tags}
                  onChange={e => setNewEvent({...newEvent, tags: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Assign Coordinator Email</label>
                <input 
                  type="email" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary mb-4" 
                  placeholder="coordinator@uniguild.com"
                  value={newEvent.coordinatorEmail}
                  onChange={e => setNewEvent({...newEvent, coordinatorEmail: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Registration Type</label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input 
                      type="radio" 
                      name="regType" 
                      value="single" 
                      checked={newEvent.registrationType === 'single'}
                      onChange={() => setNewEvent({...newEvent, registrationType: 'single', maxTeamSize: 1})}
                    />
                    Single Registration
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input 
                      type="radio" 
                      name="regType" 
                      value="team" 
                      checked={newEvent.registrationType === 'team'}
                      onChange={() => setNewEvent({...newEvent, registrationType: 'team', maxTeamSize: 4})}
                    />
                    Team Registration
                  </label>
                </div>
                {newEvent.registrationType === 'team' && (
                  <div className="mb-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Max Team Size</label>
                    <input 
                      type="number" 
                      min="2" max="10"
                      className="w-1/2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                      value={newEvent.maxTeamSize}
                      onChange={e => setNewEvent({...newEvent, maxTeamSize: parseInt(e.target.value) || 2})}
                    />
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Short Description (150 chars)</label>
                <textarea 
                  maxLength={150} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary h-20 resize-none"
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Event Banner</label>
                <div className="flex flex-col gap-4">
                  {newEvent.bannerUrl && (
                    <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-100 relative group">
                      <img src={newEvent.bannerUrl} className="w-full h-full object-cover" alt="Banner Preview" />
                      <button 
                        onClick={() => setNewEvent({...newEvent, bannerUrl: ''})}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                      placeholder="Paste URL or upload image"
                      value={newEvent.bannerUrl}
                      onChange={e => setNewEvent({...newEvent, bannerUrl: e.target.value})}
                    />
                    <input 
                      type="file" 
                      hidden 
                      ref={bannerInputRef} 
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleBannerUpload(file);
                      }}
                    />
                    <button 
                      onClick={() => bannerInputRef.current?.click()}
                      className="btn-secondary p-3 flex items-center gap-2 text-xs"
                    >
                      <Plus size={16} /> Upload
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in">
            <h3 className="text-2xl font-display font-bold text-red-primary">Step 2: Schedule & Venue</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Start Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                  value={newEvent.startDate}
                  onChange={e => setNewEvent({...newEvent, startDate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">End Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                  value={newEvent.endDate}
                  onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Venue Type</label>
                <div className="flex gap-2">
                  {['Online', 'Offline', 'Hybrid'].map(type => (
                    <button 
                      key={type} 
                      onClick={() => setNewEvent({...newEvent, venueType: type})}
                      className={`flex-1 py-2 border rounded-lg text-xs font-bold transition-all ${
                        newEvent.venueType === type ? 'border-red-primary bg-red-50 text-red-primary' : 'border-gray-200 hover:border-red-primary hover:text-red-primary'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Max Participants</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                  value={newEvent.capacity}
                  onChange={e => setNewEvent({...newEvent, capacity: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Location / Venue Details</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                  placeholder="e.g. Main Auditorium, Block A"
                  value={newEvent.location}
                  onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Website (Optional)</label>
                <input 
                  type="url" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" 
                  placeholder="https://event-website.com"
                  value={newEvent.website}
                  onChange={e => setNewEvent({...newEvent, website: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in">
            <h3 className="text-2xl font-display font-bold text-red-primary">Step 3: Event Stages</h3>
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="p-4 border border-gray-100 rounded-xl flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-primary flex items-center justify-center font-bold text-xs">{i}</div>
                  <div className="flex-1 grid md:grid-cols-2 gap-4">
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-red-primary" placeholder="Stage Name" defaultValue={i === 1 ? 'Idea Submission' : 'Final Presentation'} />
                    <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-red-primary" />
                  </div>
                  <button className="text-gray-300 hover:text-red-primary"><Trash2 size={16} /></button>
                </div>
              ))}
              <button onClick={() => setNotification({ message: 'Additional stages can be managed after event creation.', type: 'success' })} className="text-red-primary text-xs font-bold flex items-center gap-2 hover:underline">+ Add Another Stage</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in">
            <h3 className="text-2xl font-display font-bold text-red-primary">Step 4: Judging Criteria</h3>
            <div className="space-y-4">
              {['Innovation', 'Technical Complexity', 'Presentation'].map((c, i) => (
                <div key={c} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-bold">{c}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Weightage: {i === 0 ? '40%' : '30%'}</p>
                  </div>
                  <input type="range" className="w-32 accent-red-primary" />
                  <button className="text-gray-300 hover:text-red-primary"><Trash2 size={16} /></button>
                </div>
              ))}
              <button onClick={() => setNotification({ message: 'Additional criteria can be configured in evaluator settings.', type: 'success' })} className="text-red-primary text-xs font-bold flex items-center gap-2 hover:underline">+ Add Criterion</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in">
            <h3 className="text-2xl font-display font-bold text-red-primary">Step 5: Team Configuration</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Team Size (Min)</label>
                <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" defaultValue={1} min={1} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Team Size (Max)</label>
                <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary" defaultValue={4} min={1} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Team Formation Rule</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="formation" className="accent-red-primary" defaultChecked />
                    <span className="text-sm font-medium">Self-Formed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="formation" className="accent-red-primary" />
                    <span className="text-sm font-medium">Random Assignment</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="formation" className="accent-red-primary" />
                    <span className="text-sm font-medium">Individual Only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
          <button 
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="btn-secondary py-2 px-8 disabled:opacity-30"
          >
            Back
          </button>
          <button 
            onClick={() => {
              if (step < 5) setStep(step + 1);
              else handlePublish();
            }}
            disabled={isPublishing}
            className="btn-primary py-2 px-10 flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              step === 5 ? 'Publish Event' : 'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MY TEAM TAB ---
function MyTeamTab({ initialSection = 'overview', events = [], users = [], assignments = [], setNotification, setConfirmModal }: { 
  initialSection?: string,
  events?: any[],
  users?: any[],
  assignments?: any[],
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void
}) {
  const [section, setSection] = useState(initialSection);
  const [selectedEventId, setSelectedEventId] = useState('');

  const handleAssign = async (userId: string, role: string) => {
    if (!selectedEventId) {
      setNotification({ message: 'Please select an event first.', type: 'error' });
      return;
    }

    try {
      const { error } = await supabase.from('assignments').insert({
        user_id: userId,
        event_id: selectedEventId,
        role: role
      });

      if (error) throw error;
      setNotification({ message: 'Assignment successful!', type: 'success' });
    } catch (error: any) {
      setNotification({ message: `Assignment failed: ${error.message}`, type: 'error' });
    }
  };


  const renderSection = () => {
    switch (section) {
      case 'evaluator':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-bold text-red-primary">Assign Evaluator</h4>
              <div className="flex gap-4">
                <select 
                  className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:border-red-primary"
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                >
                  <option value="">Select Target Event</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {users.filter(u => u.role === 'evaluator').map(user => {
                const isAssigned = assignments.some(a => a.user_id === user.uid && a.event_id === selectedEventId);
                return (
                  <div key={user.uid} className="card p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => !isAssigned && handleAssign(user.uid, 'evaluator')}
                      disabled={isAssigned}
                      className={`text-xs font-bold hover:underline ${isAssigned ? 'text-gray-300' : 'text-red-primary'}`}
                    >
                      {isAssigned ? 'Assigned' : 'Assign'}
                    </button>
                  </div>
                );
              })}
              {users.filter(u => u.role === 'evaluator').length === 0 && (
                <p className="text-xs text-gray-400 italic">No evaluators found.</p>
              )}
            </div>
          </div>
        );
      case 'coordinator':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-bold text-red-primary">Assign Event Coordinator</h4>
              <select 
                className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:border-red-primary"
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
              >
                <option value="">Select Target Event</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {users.filter(u => u.role === 'coordinator').map(user => {
                const isAssigned = assignments.some(a => a.user_id === user.uid && a.event_id === selectedEventId);
                return (
                  <div key={user.uid} className="card p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => !isAssigned && handleAssign(user.uid, 'coordinator')}
                      disabled={isAssigned}
                      className={`text-xs font-bold hover:underline ${isAssigned ? 'text-gray-300' : 'text-red-primary'}`}
                    >
                      {isAssigned ? 'Assigned' : 'Assign'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'volunteer':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-bold text-red-primary">Assign Volunteers</h4>
              <select 
                className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:border-red-primary"
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
              >
                <option value="">Select Target Event</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {users.filter(u => u.role === 'volunteer').map(user => {
                const isAssigned = assignments.some(a => a.user_id === user.uid && a.event_id === selectedEventId);
                return (
                  <div key={user.uid} className="card p-4 flex justify-between items-center">
                    <p className="font-bold text-sm">{user.name}</p>
                    <input 
                      type="checkbox" 
                      className="accent-red-primary" 
                      checked={isAssigned}
                      onChange={() => !isAssigned && handleAssign(user.uid, 'volunteer')}
                      disabled={isAssigned}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      default:
        const evalCount = assignments.filter(a => a.role === 'evaluator').length;
        const coordCount = assignments.filter(a => a.role === 'coordinator').length;
        const volCount = assignments.filter(a => a.role === 'volunteer').length;
        
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card p-6 text-center">
                <p className="text-3xl font-mono font-bold text-red-primary">{coordCount.toString().padStart(2, '0')}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400">Event Coordinators</p>
              </div>
              <div className="card p-6 text-center">
                <p className="text-3xl font-mono font-bold text-red-primary">{evalCount.toString().padStart(2, '0')}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400">Evaluators</p>
              </div>
              <div className="card p-6 text-center">
                <p className="text-3xl font-mono font-bold text-red-primary">{volCount.toString().padStart(2, '0')}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400">Volunteers</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-display font-bold">Team Directory</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSection('coordinator')}
                  className="btn-secondary py-2 px-4 text-[10px] font-bold uppercase tracking-wider"
                >
                  Manage Team
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Member</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Assigned Event</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignments.map(a => {
                    const user = users.find(u => u.uid === a.user_id);
                    const event = events.find(e => e.id === a.event_id);
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition-all text-sm">
                        <td className="px-6 py-4 font-bold">{user?.name}</td>
                        <td className="px-6 py-4 uppercase font-bold text-[10px]">{a.role}</td>
                        <td className="px-6 py-4">{event?.name || '---'}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={async () => {
                              const { error } = await supabase.from('assignments').delete().eq('id', a.id);
                              if (error) setNotification({ message: `Failed to remove: ${error.message}`, type: 'error' });
                              else setNotification({ message: 'Member removed from assignment.', type: 'success' });
                            }} 
                            className="p-2 text-gray-400 hover:text-red-primary"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">No team assignments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {section !== 'overview' && (
        <button 
          onClick={() => setSection('overview')}
          className="text-xs font-bold text-gray-400 hover:text-red-primary flex items-center gap-1 mb-4"
        >
          ← Back to Overview
        </button>
      )}
      {renderSection()}
    </div>
  );
}

// --- ATTENDANCE TAB ---
function AttendanceTab({ events = [], registrations = [], setNotification }: { 
  events?: any[], 
  registrations?: any[],
  setNotification: (n: any) => void 
}) {
  const [selectedEventId, setSelectedEventId] = useState('');

  const filteredRegistrations = registrations.filter(r => r.event_id === selectedEventId);

  const handleToggleAttendance = async (regId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    try {
      const { error } = await supabase.from('registrations').update({ attendance_status: newStatus }).eq('id', regId);
      if (error) throw error;
      setNotification({ message: `Attendance marked as ${newStatus}`, type: 'success' });
    } catch (error: any) {
      setNotification({ message: `Failed: ${error.message}`, type: 'error' });
    }
  };

  const attendanceData = {
    present: filteredRegistrations.filter(r => r.attendance_status === 'Present').length,
    absent: filteredRegistrations.filter(r => r.attendance_status === 'Absent').length,
    late: filteredRegistrations.filter(r => r.attendance_status === 'Late').length,
  };
  const totalRegistered = filteredRegistrations.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-display font-bold">Attendance Tracking</h3>
        <div className="flex gap-3">
          <select 
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:border-red-primary"
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
          >
            <option value="">Select Event</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button 
            onClick={() => {
              const rows = filteredRegistrations.map(r => `${r.student_name},${r.student_id},${r.check_in_time || 'N/A'},${r.attendance_status || 'N/A'}`).join('\n');
              const csv = `data:text/csv;charset=utf-8,Student,Roll No,Check-in,Status\n${rows}`;
              const link = document.createElement('a');
              link.setAttribute('href', encodeURI(csv));
              link.setAttribute('download', 'attendance.csv');
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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Student</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Roll No</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Check-in</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                    {selectedEventId ? 'No registrations for this event.' : 'Please select an event to view attendance.'}
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map(reg => (
                  <tr key={reg.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={`https://i.pravatar.cc/300?u=${reg.student_id}`} className="w-8 h-8 rounded-full" alt="" />
                        <p className="text-sm font-bold">{reg.student_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{reg.student_id}</td>
                    <td className="px-6 py-4 text-xs">{reg.check_in_time ? new Date(reg.check_in_time).toLocaleTimeString() : 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        reg.attendance_status === 'Present' ? 'bg-green-50 text-green-600' :
                        reg.attendance_status === 'Absent' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {reg.attendance_status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleToggleAttendance(reg.id, reg.attendance_status)}
                        className="p-2 text-gray-400 hover:text-red-primary"
                      >
                        <Check size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card p-6">
          <h4 className="text-sm font-bold uppercase text-gray-400 mb-6 tracking-widest">Attendance Breakdown</h4>
          <div className="h-64 flex justify-center">
            <Pie 
              data={{
                labels: ['Present', 'Absent', 'Late'],
                datasets: [{
                  data: [attendanceData.present, attendanceData.absent, attendanceData.late],
                  backgroundColor: ['#16a34a', '#f40000', '#d97706'],
                  borderWidth: 0
                }]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total Registered</span>
              <span className="font-bold">{totalRegistered}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg Duration</span>
              <span className="font-bold">6h 12m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ANNOUNCEMENTS TAB ---
function AnnouncementsTab({ onSend, setNotification, notifications }: { 
  onSend: (data: any) => void, 
  setNotification: (n: any) => void,
  notifications: any[]
}) {
  const [audience, setAudience] = useState('All');
  const [targetEvent, setTargetEvent] = useState('All My Events');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleBroadcast = async () => {
    if (!subject || !message) {
      // Use parent notification if possible or just return
      return;
    }
    onSend({
      subject,
      message,
      audience,
      targetEvent,
    });
    setSubject('');
    setMessage('');
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-8">
          <h3 className="text-2xl font-display font-bold mb-6">Send Announcement</h3>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Target Event</label>
              <select 
                value={targetEvent}
                onChange={(e) => setTargetEvent(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary"
              >
                <option>All My Events</option>
                <option>Code Rush Hackathon</option>
                <option>AI Summit</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Target Audience</label>
              <div className="flex gap-3">
                {['All', 'Coordinators', 'Participants', 'Volunteers'].map(t => (
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
                placeholder="Enter announcement subject..."
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
            <div className="flex justify-end">
              <button onClick={handleBroadcast} className="btn-primary px-10">Broadcast Message</button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-display font-bold">Recent Broadcasts</h3>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No recent broadcasts.</div>
          ) : (
            notifications.map(ann => (
              <div key={ann.id} className="card p-4 border-l-4 border-red-primary">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold">{ann.subject}</p>
                  <span className="text-[8px] text-gray-400">
                    {ann.createdAt instanceof Date ? ann.createdAt.toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-2">{ann.message}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                  <span className="text-[8px] font-bold text-red-primary uppercase">Sent to: {ann.audience}</span>
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
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Event Registrations',
        data: [450, 590, 800, 810, 950, 1200],
        borderColor: '#f40000',
        backgroundColor: 'rgba(244, 0, 0, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Attendance',
        data: [380, 480, 650, 700, 820, 1050],
        borderColor: '#444444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
      }
    ]
  };

  const doughnutData = {
    labels: ['Completed', 'Ongoing', 'Upcoming'],
    datasets: [{
      data: [45, 12, 8],
      backgroundColor: ['#f40000', '#333333', '#999999'],
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  const barData = {
    labels: ['CSE', 'ECE', 'ME', 'CE', 'EE'],
    datasets: [{
      label: 'Participation by Branch',
      data: [450, 320, 210, 150, 180],
      backgroundColor: 'rgba(244, 0, 0, 0.8)',
      borderRadius: 8,
      hoverBackgroundColor: '#f40000',
    }]
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 border-l-4 border-red-primary relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Users size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Participants</p>
            <h3 className="text-3xl font-display font-bold">12,458</h3>
            <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold">
              <TrendingUp size={14} /> +12.5% <span className="text-gray-400 font-normal ml-1">vs last month</span>
            </div>
          </div>
        </div>
        <div className="card p-6 border-l-4 border-gray-800 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Calendar size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Events Managed</p>
            <h3 className="text-3xl font-display font-bold">65</h3>
            <div className="flex items-center gap-1 mt-2 text-red-primary text-xs font-bold">
              <ArrowUpRight size={14} /> 8 Active <span className="text-gray-400 font-normal ml-1">currently</span>
            </div>
          </div>
        </div>
        <div className="card p-6 border-l-4 border-red-primary relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <ScrollText size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Certificates Issued</p>
            <h3 className="text-3xl font-display font-bold">8,920</h3>
            <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold">
              <CheckSquare size={14} /> 98% <span className="text-gray-400 font-normal ml-1">accuracy rate</span>
            </div>
          </div>
        </div>
        <div className="card p-6 border-l-4 border-gray-800 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Briefcase size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Job Placements</p>
            <h3 className="text-3xl font-display font-bold">342</h3>
            <div className="flex items-center gap-1 mt-2 text-red-primary text-xs font-bold">
              <TrendingUp size={14} /> +5.2% <span className="text-gray-400 font-normal ml-1">conversion</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-display font-bold">Registration Growth</h3>
              <p className="text-xs text-gray-500">Monthly trend of event sign-ups and actual attendance</p>
            </div>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-red-primary">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[350px]">
            <Line 
              data={lineData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: { size: 11, weight: 'bold' }
                    }
                  },
                  tooltip: {
                    backgroundColor: '#1a1a1a',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    cornerRadius: 8,
                    displayColors: false
                  }
                },
                scales: {
                  y: {
                    grid: { color: '#f3f4f6' },
                    ticks: { font: { size: 10, weight: 'bold' }, color: '#9ca3af' }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 10, weight: 'bold' }, color: '#9ca3af' }
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="card p-8">
          <h3 className="text-xl font-display font-bold mb-2">Event Status</h3>
          <p className="text-xs text-gray-500 mb-8">Distribution of events by their current lifecycle stage</p>
          <div className="h-[250px] relative">
            <Doughnut 
              data={doughnutData} 
              options={{ 
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: { size: 11, weight: 'bold' }
                    }
                  }
                }
              }} 
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-display font-bold">65</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Events</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-primary" />
                <span className="text-xs font-bold">Completed</span>
              </div>
              <span className="text-xs font-mono font-bold">45</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-800" />
                <span className="text-xs font-bold">Ongoing</span>
              </div>
              <span className="text-xs font-mono font-bold">12</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="card p-8">
          <h3 className="text-xl font-display font-bold mb-6">Branch Participation</h3>
          <div className="h-[300px]">
            <Bar 
              data={barData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    grid: { color: '#f3f4f6' },
                    ticks: { font: { size: 10, weight: 'bold' }, color: '#9ca3af' }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 10, weight: 'bold' }, color: '#9ca3af' }
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="lg:col-span-2 card p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-display font-bold">Top Performing Events</h3>
            <button className="text-xs font-bold text-red-primary hover:underline">View All Reports</button>
          </div>
          <div className="space-y-6">
            {[
              { name: 'Code Rush Hackathon', participants: 1240, rating: 4.8, status: 'Completed' },
              { name: 'Design Thinking Workshop', participants: 850, rating: 4.6, status: 'Completed' },
              { name: 'Future of AI Webinar', participants: 2100, rating: 4.9, status: 'Ongoing' },
            ].map((event, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-display font-bold text-3xl text-red-primary shadow-sm group-hover:bg-red-primary group-hover:text-white transition-all">
                    0{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{event.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{event.participants} Participants • {event.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500">
                      <span className="text-sm font-bold">{event.rating}</span>
                      <TrendingUp size={14} />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Rating</p>
                  </div>
                  <ArrowUpRight className="text-gray-300 group-hover:text-red-primary transition-colors" size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- JOBS TAB ---
function JobsTab({ jobs, onPost, isPosting, setNotification }: { 
  jobs: any[],
  onPost: (data: any) => Promise<boolean>, 
  isPosting?: boolean,
  setNotification: (n: any) => void 
}) {
  const [showPostModal, setShowPostModal] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    type: 'Full-time',
    location: '',
    stipend: '',
    description: '',
    requirements: '',
    appLink: '',
    tags: '',
    deadline: '',
    isPaid: false,
    skills: '',
    website: '',
    targetSection: '',
    targetBranch: '',
    targetYear: '',
    targetPersona: ''
  });

  const handlePost = async () => {
    if (!newJob.title || !newJob.company) {
      setNotification({ message: "Please fill in title and company.", type: 'error' });
      return;
    }
    const ok = await onPost(newJob);
    if (ok) {
      setShowPostModal(false);
    }
  };

  const jobStats = [
    { label: 'Active Posts', value: '24', icon: <Briefcase size={18} />, color: 'bg-red-50 text-red-primary' },
    { label: 'Total Applications', value: '1,458', icon: <Users size={18} />, color: 'bg-gray-100 text-gray-800' },
    { label: 'Hired Students', value: '156', icon: <CheckSquare size={18} />, color: 'bg-green-50 text-green-600' },
    { label: 'Avg. Stipend', value: '₹15k', icon: <TrendingUp size={18} />, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="card p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-red-primary">Job Board Management</h2>
          <p className="text-sm text-gray-500 font-medium">Post and manage career opportunities for your students.</p>
        </div>
        <button 
          onClick={() => setShowPostModal(true)}
          className="btn-primary flex items-center gap-2 px-8 py-3 shadow-lg shadow-red-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Post New Opportunity
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {jobStats.map((stat, idx) => (
          <div key={idx} className="card p-6 flex items-center gap-4 hover:translate-y-[-4px] transition-all duration-300">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-mono font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {jobs.map(job => (
          <div key={job.id} className="card group overflow-hidden border-transparent hover:border-red-primary/20 transition-all duration-300">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-display font-bold text-3xl text-red-primary shadow-sm group-hover:scale-110 transition-transform duration-500">
                    {job.company.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold group-hover:text-red-primary transition-colors">{job.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-gray-800">{job.company}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs text-gray-500">{job.domain}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Clock size={12} /> 2 Days Left
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applications</p>
                  <p className="text-2xl font-mono font-bold">42</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <Briefcase size={14} className="text-red-primary" /> {job.type}
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <TrendingUp size={14} className="text-red-primary" /> {job.stipend}
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <Users size={14} className="text-red-primary" /> {job.targetBranch}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="btn-primary flex-1 py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all">
                  View Applications
                </button>
                <button className="btn-secondary px-6 py-3 text-sm font-bold flex items-center gap-2">
                  <Edit size={16} /> Edit
                </button>
                <button className="p-3 bg-gray-50 text-gray-400 hover:text-red-primary hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="h-1 w-full bg-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-red-primary w-2/3 group-hover:w-full transition-all duration-1000" />
            </div>
          </div>
        ))}
      </div>

      {/* Post Job Modal */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPostModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-red-primary text-white">
                <div>
                  <h3 className="text-2xl font-display font-bold">Post New Opportunity</h3>
                  <p className="text-xs text-red-100 mt-1">Fill in the details to broadcast this job to students.</p>
                </div>
                <button onClick={() => setShowPostModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Job Title</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:ring-4 focus:ring-red-primary/5 transition-all" 
                      placeholder="e.g. Software Engineer Intern"
                      value={newJob.title}
                      onChange={e => setNewJob({...newJob, title: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Application Deadline</label>
                    <input 
                      type="date" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:ring-4 focus:ring-red-primary/5 transition-all" 
                      value={newJob.deadline}
                      onChange={e => setNewJob({...newJob, deadline: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Company Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:ring-4 focus:ring-red-primary/5 transition-all" 
                      placeholder="e.g. Google"
                      value={newJob.company}
                      onChange={e => setNewJob({...newJob, company: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Job Type</label>
                    <div className="flex items-center gap-6 h-[52px]">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={newJob.isPaid} 
                          onChange={e => setNewJob({...newJob, isPaid: e.target.checked})}
                          className="w-5 h-5 accent-red-primary rounded-lg"
                        />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-red-primary transition-colors">Paid Position</span>
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Required Skills (Comma separated)</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:ring-4 focus:ring-red-primary/5 transition-all" 
                      placeholder="React, TypeScript, Node.js..."
                      value={newJob.skills}
                      onChange={e => setNewJob({...newJob, skills: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Company Website (Optional)</label>
                    <input 
                      type="url" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary focus:ring-4 focus:ring-red-primary/5 transition-all" 
                      placeholder="https://company.com"
                      value={newJob.website}
                      onChange={e => setNewJob({...newJob, website: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Official Application Link</label>
                    <div className="relative">
                      <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="url" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm outline-none focus:border-red-primary focus:ring-4 focus:ring-red-primary/5 transition-all" 
                        placeholder="https://company.com/careers/job-123"
                        value={newJob.appLink}
                        onChange={e => setNewJob({...newJob, appLink: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-bold uppercase text-red-primary tracking-[0.2em]">Targeting Filters</h4>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                    <FilterSelect label="Section" value={newJob.targetSection} onChange={(v: string) => setNewJob({...newJob, targetSection: v})} options={['All', 'A', 'B', 'C']} />
                    <FilterSelect label="Branch" value={newJob.targetBranch} onChange={(v: string) => setNewJob({...newJob, targetBranch: v})} options={['All', 'CSE', 'ECE', 'ME', 'CE']} />
                    <FilterSelect label="Year" value={newJob.targetYear} onChange={(v: string) => setNewJob({...newJob, targetYear: v})} options={['All', '1st', '2nd', '3rd', '4th']} />
                    <FilterSelect label="Persona" value={newJob.targetPersona} onChange={(v: string) => setNewJob({...newJob, targetPersona: v})} options={['All', 'Student', 'Volunteer']} />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                <button onClick={() => setShowPostModal(false)} className="btn-secondary px-8 py-3 font-bold">Cancel</button>
                <button onClick={handlePost} className="btn-primary px-12 py-3 font-bold shadow-lg shadow-red-primary/20">Post Job Opportunity</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
function ProfileTab({ coordinator, setCoordinator, onSave, setNotification }: { 
  coordinator: any, 
  setCoordinator: (c: any) => void, 
  onSave: () => void,
  setNotification: (n: any) => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...coordinator });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditData({ ...coordinator });
  }, [coordinator]);

  if (!coordinator) return null;

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setCoordinator(editData);
    setIsEditing(false);
    onSave();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center mb-10">
          <div className="relative w-32 h-32 group">
            <img 
              src={isEditing ? editData.avatar : coordinator.avatar} 
              className="w-full h-full rounded-full border-4 border-red-primary p-1 object-cover" 
              alt="" 
            />
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus size={24} />
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="text-center md:text-left flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <input 
                  type="text" 
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-2xl font-display font-bold outline-none focus:border-red-primary"
                  placeholder="Full Name"
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={editData.designation}
                    onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                    className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-red-primary"
                    placeholder="Designation"
                  />
                  <input 
                    type="text" 
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                    className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-red-primary"
                    placeholder="Department"
                  />
                </div>
                <div className="flex gap-2 justify-center md:justify-start mt-4">
                  <button onClick={handleSave} className="btn-primary py-1.5 px-6 text-xs">Save Changes</button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary py-1.5 px-6 text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-3xl font-display font-bold">{coordinator.name}</h3>
                <p className="text-gray-500 font-medium">{coordinator.role} • {coordinator.organization}</p>
                <div className="flex gap-2 mt-4 justify-center md:justify-start">
                  <span className="bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase">{coordinator.department}</span>
                  <span className="bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase">{coordinator.experience}</span>
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="mt-4 text-red-primary text-xs font-bold hover:underline flex items-center gap-1"
                >
                  Edit Profile
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h4 className="text-xl font-display font-bold border-b border-gray-100 pb-2">Personal Info</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Designation</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.designation}
                    onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-red-primary"
                  />
                ) : (
                  <p className="text-sm font-bold">{coordinator.designation}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Staff ID</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.staffId}
                    onChange={(e) => setEditData({ ...editData, staffId: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-red-primary"
                  />
                ) : (
                  <p className="text-sm font-bold">{coordinator.staffId}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Work Email</label>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-red-primary"
                  />
                ) : (
                  <p className="text-sm font-bold">{coordinator.email}</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-xl font-display font-bold border-b border-gray-100 pb-2">Security</h4>
            <button className="btn-secondary w-full py-2 text-sm">Change Password</button>
            <button className="w-full bg-gray-100 text-gray-600 font-bold py-2 rounded-lg text-sm hover:bg-gray-200">Enable 2FA</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- CERTIFICATES TAB ---
function CertificatesTab({ events = [], registrations = [], setNotification, setConfirmModal }: { 
  events?: any[],
  registrations?: any[],
  setNotification: (n: any) => void,
  setConfirmModal: (m: any) => void 
}) {
  const [template, setTemplate] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [namePosition, setNamePosition] = useState({ x: 50, y: 50 }); // Percentage
  const [isIssuing, setIsIssuing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handlePreviewClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNamePosition({ x, y });
  };

  const eligibleRegistrations = registrations.filter(r => 
    (r.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     r.student_id?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    r.attendance_status === 'Present'
  );

  const handleIssueCertificate = async (participantId: string) => {
    if (!template) {
      setNotification({ message: "Please upload a certificate template first.", type: 'error' });
      return;
    }

    setIsIssuing(true);
    try {
      const { error } = await supabase.from('registrations').update({
        certificate_issued: true,
      }).eq('id', participantId);
      if (error) throw error;
      setNotification({ message: 'Certificate issued successfully!', type: 'success' });
    } catch (error: any) {
      setNotification({ message: `Certificate issue failed: ${error.message}`, type: 'error' });
    } finally {
      setIsIssuing(false);
    }
  };

  const handleIssueAll = async () => {
    if (!template) {
      setNotification({ message: "Please upload a certificate template first.", type: 'error' });
      return;
    }

    const pending = eligibleRegistrations.filter(r => !r.certificate_issued);
    if (pending.length === 0) {
      setNotification({ message: "No pending certificates to issue for present students.", type: 'error' });
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
            }).eq('id', p.id);
            if (error) throw error;
          }
          setNotification({ message: `Successfully issued ${pending.length} certificates!`, type: 'success' });
        } catch (error: any) {
          setNotification({ message: `Failed to issue certificates: ${error.message}`, type: 'error' });
        } finally {
          setIsIssuing(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-red-primary">Issue Certificates</h2>
          <p className="text-sm text-gray-500 font-medium">Generate and send certificates to verified participants.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleIssueAll}
            disabled={isIssuing || !template}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Award size={16} /> Issue All
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FileText size={18} className="text-red-primary" /> Certificate Template
            </h3>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".png,.jpg,.jpeg"
              onChange={handleFileChange}
            />
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative overflow-hidden ${
                template ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-red-primary hover:bg-red-50'
              }`}
              onClick={() => !templatePreview && fileInputRef.current?.click()}
            >
              {templatePreview ? (
                <div className="space-y-4">
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
                    <p className="text-[10px] text-green-600 uppercase font-bold">{template}</p>
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
                  <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                    <Plus size={24} />
                  </div>
                  <p className="text-sm font-bold text-gray-600">Upload Template</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Image only (PNG/JPG)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
              <h3 className="font-bold">Eligible Participants ({eligibleRegistrations.length})</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by name or ID..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="pb-4">Student</th>
                    <th className="pb-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {eligibleRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-10 text-center text-gray-400 italic">No eligible participants found.</td>
                    </tr>
                  ) : (
                    eligibleRegistrations.map(reg => (
                      <tr key={reg.id} className="hover:bg-gray-50 transition-all text-sm">
                        <td className="px-6 py-4">
                          <p className="font-bold">{reg.student_name}</p>
                          <p className="text-[10px] text-gray-500">{reg.student_id}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {reg.certificate_issued ? (
                            <span className="text-green-600 text-[10px] font-bold uppercase bg-green-50 px-2 py-1 rounded">Issued</span>
                          ) : (
                            <button 
                              onClick={() => handleIssueCertificate(reg.id)}
                              disabled={isIssuing || !template}
                              className="btn-primary py-1.5 px-3 text-[10px] disabled:opacity-50"
                            >
                              Issue
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
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
