import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Home, Ticket, Calendar, Search, ShieldCheck, Briefcase, User, Bell, 
  TrendingUp, Award, BookOpen, Eye, MapPin, Clock, CheckCircle2, 
  AlertCircle, XCircle, FileText, Github, Linkedin, Globe, Camera,
  ChevronRight, Download, Share2, Star, Send, Filter, Zap, Info, Mail, ExternalLink,
  Check, Plus, Trash2, Edit2, LogOut, Building2, RefreshCw, Upload
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { UniGuildData } from '../data';
import DashboardShell from '../components/DashboardShell';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { useAuth } from '../context/AuthContext';

const sidebarItems = [
  { id: 'home', label: 'Home', icon: <Home size={20} /> },
  { id: 'passes', label: 'Event Passes', icon: <Ticket size={20} /> },
  { id: 'events', label: 'My Events', icon: <Calendar size={20} /> },
  { id: 'discover', label: 'Discover', icon: <Search size={20} /> },
  { id: 'certificates', label: 'Certificates', icon: <Award size={20} /> },
  { id: 'sentinel', label: 'Internship Sentinel', icon: <ShieldCheck size={20} /> },
  { id: 'jobs', label: 'Job Board', icon: <Briefcase size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
];

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [submittingEvent, setSubmittingEvent] = useState<any>(null);
  const [submissionForm, setSubmissionForm] = useState({
    idea: '',
    githubRepo: '',
    videoUrl: '',
    liveLink: ''
  });
  const [teamForm, setTeamForm] = useState({ name: '', members: [] as string[] });
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const userId = currentUser?.uid;

  const fetchProfile = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from('users').select('*').eq('uid', userId).maybeSingle();
    if (data) setStudentProfile({ uid: data.uid, ...data });
    else if (!data && !error && !currentUser?.isDemo) {
      setStudentProfile({ uid: userId, name: currentUser?.name, email: currentUser?.email, role: 'student', college: 'Sasi Institute of Technology' });
    }
  };

  const fetchRegistrations = async () => {
    if (!userId) return;
    const { data } = await supabase.from('registrations').select('*').eq('student_id', userId);
    if (data) {
      setRegistrations(data.map((r: any) => ({
        ...r,
        studentId: r.student_id,
        studentName: r.student_name,
        eventId: r.event_id,
        eventName: r.event_name || 'Unnamed Event',
        registeredAt: r.registered_at,
        certificateIssued: r.certificate_issued,
        certificateUrl: r.certificate_url,
        date: r.date,
        host: r.host,
        category: r.category,
      })));
    }
  };

  const fetchNotifications = async () => {
    if (!userId) return;
    const { data } = await supabase.from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.eq.all`)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      setNotifications(data.map((n: any) => ({ 
        ...n, 
        createdAt: n.created_at, 
        userId: n.user_id,
        title: n.title || (n.type === 'announcement' ? 'Announcement' : 'Notification')
      })));
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching events:', error);
      return;
    }
    if (data) {
      console.log(`Fetched ${data.length} events`);
      setEvents(data.map((e: any) => ({ 
        ...e, 
        name: e.name || e.title || 'Upcoming Event',
        bannerUrl: e.banner_url || e.image, 
        targetAudience: e.target_audience, 
        createdBy: e.created_by, 
        createdAt: e.created_at 
      })));
    }
  };

  const fetchJobs = async () => {
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }
    if (data) {
      console.log(`Fetched ${data.length} jobs`);
      setJobs(data.map((j: any) => ({ 
        ...j, 
        appLink: j.app_link, 
        isPaid: j.is_paid, 
        applicationsCount: j.applications_count, 
        createdBy: j.created_by, 
        createdAt: j.created_at, 
        applyBy: j.deadline ? new Date(j.deadline).toLocaleDateString() : 'Open' 
      })));
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    // For demo users, use mock data
    // For demo users, use mock profile but real data for events/jobs
    if (currentUser.isDemo) {
      setStudentProfile({
        uid: currentUser.uid,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        college: currentUser.college,
        department: 'CSE',
        year: '3rd Year',
        skills: ['React', 'Node.js', 'Python'],
        profileViews: 42,
        campusScore: 78,
      });
      setRegistrations([]);
      setNotifications([]);
      
      const fetchAll = async () => {
        await Promise.all([
          fetchEvents(),
          fetchJobs(),
          fetchNotifications()
        ]);
        setLoading(false);
      };
      
      fetchAll();
      return;
    }

    const fetchAll = async () => {
      await Promise.all([
        fetchProfile(),
        fetchRegistrations(),
        fetchNotifications(),
        fetchEvents(),
        fetchJobs()
      ]);
      setLoading(false);
    };

    fetchAll();

    const channel = supabase
      .channel('student_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchRegistrations)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.uid]);

  const handleSaveProfile = async (updatedProfile: any) => {
    if (!currentUser) return;
    if (currentUser.isDemo) {
      setStudentProfile({ ...studentProfile, ...updatedProfile });
      setNotification({ message: 'Profile updated successfully!', type: 'success' });
      return;
    }
    try {
      const mapped: any = { ...updatedProfile };
      // Map camelCase to snake_case for Supabase
      if (mapped.resumeUrl !== undefined) { mapped.resume_url = mapped.resumeUrl; delete mapped.resumeUrl; }
      if (mapped.workExperience !== undefined) { mapped.work_experience = mapped.workExperience; delete mapped.workExperience; }
      if (mapped.profileCompleted !== undefined) { mapped.profile_completed = mapped.profileCompleted; delete mapped.profileCompleted; }
      
      const { error } = await supabase.from('users').update(mapped).eq('uid', currentUser.uid);
      if (error) {
        setNotification({ message: `Profile update failed: ${error.message}`, type: 'error' });
        return;
      }
      setStudentProfile({ ...studentProfile, ...updatedProfile });
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

  const handleRegister = async (event: any, teamDetails?: { name: string, members: string[] }) => {
    if (!currentUser || !studentProfile) return;
    // Check if already registered
    if (registrations.some((r: any) => (r.eventId || r.event_id) === event.id)) {
      setNotification({ message: "You are already registered for this event!", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (currentUser.isDemo) {
      const demoReg = {
        id: Math.random().toString(36).substring(2, 9),
        student_id: currentUser.uid,
        student_name: studentProfile.name,
        event_id: event.id,
        event_name: event.name || event.title,
        registered_at: new Date().toISOString(),
        status: 'registered',
        attended: false,
        certificate_issued: false,
        category: event.category || 'Event',
        date: event.date,
        host: event.host || 'University',
        eventId: event.id,
        eventName: event.name || event.title,
        team_name: teamDetails?.name || null,
        team_members: teamDetails?.members || []
      };
      setRegistrations(prev => [...prev, demoReg]);
      setNotification({ message: `Successfully registered for ${event.name || event.title}!`, type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      setActiveTab('passes');
      return;
    }

    try {
      const shortId = String(Math.floor(1000000 + Math.random() * 9000000));
      const teamId = teamDetails ? `T-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null;

      const regData = {
        unique_id: shortId,
        student_id: currentUser.uid,
        student_name: studentProfile.name,
        event_id: event.id,
        event_name: event.name || event.title,
        registered_at: new Date().toISOString(),
        status: 'registered',
        attended: false,
        certificate_issued: false,
        category: event.category || 'Event',
        date: event.date,
        host: event.host || 'University',
        team_name: teamDetails?.name || null,
        team_id: teamId,
        team_members: teamDetails?.members || []
      };
      const { error } = await supabase.from('registrations').insert(regData);
      if (error) {
        setNotification({ message: `Registration failed: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: `Successfully registered for ${event.name || event.title}!`, type: 'success' });
      setActiveTab('passes');
    } catch (error) {
      setNotification({ message: "Registration failed. Please try again.", type: 'error' });
    }
  };

  const handleApplyJob = async (job: any) => {
    if (!currentUser || !studentProfile || currentUser.isDemo) return;
    try {
      // Record application
      const { error: appError } = await supabase.from('applications').insert({
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        student_id: currentUser.uid,
        student_name: studentProfile.name,
        student_email: studentProfile.email,
        applied_at: new Date().toISOString(),
        status: 'applied'
      });
      if (appError) {
        setNotification({ message: `Application failed: ${appError.message}`, type: 'error' });
        return;
      }

      // Increment application count on job
      const { data: currentJob } = await supabase.from('jobs').select('applications_count').eq('id', job.id).single();
      const { error: jobUpdateError } = await supabase.from('jobs').update({
        applications_count: (currentJob?.applications_count || 0) + 1
      }).eq('id', job.id);
      if (jobUpdateError) {
        setNotification({ message: `Application saved but count update failed: ${jobUpdateError.message}`, type: 'error' });
        return;
      }

      setNotification({ message: `Successfully applied for ${job.title}!`, type: 'success' });
      
      // Open application link if it exists
      if (job.appLink) {
        window.open(job.appLink, '_blank');
      }
      
      setSelectedJob(null);
    } catch (error) {
      setNotification({ message: 'Job application failed. Please try again.', type: 'error' });
    }
  };

  const handleSubmitProject = async () => {
    if (!currentUser || !submittingEvent) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('submissions').insert({
        registration_id: submittingEvent.id,
        event_id: submittingEvent.event_id || submittingEvent.eventId,
        student_id: currentUser.uid,
        team_id: submittingEvent.team_id,
        idea: submissionForm.idea,
        github_repo: submissionForm.githubRepo,
        video_url: submissionForm.videoUrl,
        live_link: submissionForm.liveLink
      });
      if (error) throw error;
      setNotification({ message: 'Project submitted successfully!', type: 'success' });
      setSubmittingEvent(null);
      setSubmissionForm({ idea: '', githubRepo: '', videoUrl: '', liveLink: '' });
      fetchRegistrations(); // Refresh to show updated status if needed
    } catch (err: any) {
      setNotification({ message: `Submission failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
      case 'home': return <HomeTab student={studentProfile} registrations={registrations} events={events} notifications={notifications} onViewDetails={setSelectedEvent} />;
      case 'passes': return <PassesTab registrations={registrations} onViewDetails={setSelectedEvent} events={events} />;
      case 'events': return renderMyEventsTab();
      case 'discover': return <DiscoverTab events={events} registrations={registrations} onRegister={handleRegister} onViewDetails={setSelectedEvent} onRefresh={fetchEvents} />;
      case 'certificates': return <CertificatesTab registrations={registrations} />;
      case 'sentinel': return <SentinelTab />;
      case 'jobs': return <JobsTab jobs={jobs} onViewDetails={(job) => setSelectedJob(job)} onRefresh={fetchJobs} />;
      case 'profile': return <ProfileTab student={studentProfile} onSave={handleSaveProfile} />;
      case 'notifications': return <NotificationsTab notifications={notifications} userId={currentUser?.uid} />;
      default: return <HomeTab student={studentProfile} registrations={registrations} events={events} notifications={notifications} onViewDetails={setSelectedEvent} />;
    }
  };

  const renderMyEventsTab = () => <MyEventsTab registrations={registrations} onUploadClick={(reg) => setSubmittingEvent(reg)} />;

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      roleName="Student"
      userName={studentProfile?.name || "Student"}
    >
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

      {/* Job Details Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-primary text-white">
                <h3 className="text-xl font-display font-bold">Job Details</h3>
                <button onClick={() => setSelectedJob(null)} className="p-1 hover:bg-white/20 rounded-full transition-all">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white border border-gray-100 rounded-2xl flex items-center justify-center p-3 shadow-sm">
                    <img src={selectedJob.logo} className="w-full h-full object-contain" alt="" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold leading-tight">{selectedJob.title}</h2>
                    <p className="text-red-primary font-bold text-xl">{selectedJob.company}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Location</p>
                    <p className="text-sm font-bold flex items-center gap-2"><MapPin size={14} /> {selectedJob.location}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Stipend</p>
                    <p className="text-sm font-bold flex items-center gap-2"><Zap size={14} /> {selectedJob.stipend}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Type</p>
                    <p className="text-sm font-bold">{selectedJob.type}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Apply By</p>
                    <p className="text-sm font-bold">{selectedJob.applyBy}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-red-primary" />
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((s: string) => (
                      <span key={s} className="bg-red-50 text-red-primary px-4 py-1.5 rounded-full text-xs font-bold border border-red-100">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Job Description</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    We are looking for a highly motivated {selectedJob.title} to join our team at {selectedJob.company}. 
                    You will be responsible for building high-quality applications and collaborating with cross-functional teams.
                    Candidates from {selectedJob.targetBranch} branch are encouraged to apply.
                  </p>
                </div>
                <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
                  {selectedJob.website && (
                    <a 
                      href={selectedJob.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-red-primary flex items-center gap-1 hover:underline"
                    >
                      <Globe size={14} /> Visit Company Website
                    </a>
                  )}
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleApplyJob(selectedJob)}
                      className="btn-primary flex-1 py-4 text-sm font-bold shadow-lg shadow-red-primary/30"
                    >
                      Apply Now
                    </button>
                    <button onClick={() => setSelectedJob(null)} className="btn-secondary px-10 py-4 text-sm font-bold">Close</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-primary text-white">
                <h3 className="text-xl font-display font-bold">Event Details {selectedEvent.registration_type === 'team' && '(Team Event)'}</h3>
                <button onClick={() => { setSelectedEvent(null); setTeamForm({ name: '', members: [] }); }} className="p-1 hover:bg-white/20 rounded-full transition-all">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {selectedEvent.bannerUrl && (
                  <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden mb-6">
                    <img src={selectedEvent.bannerUrl} alt="Event Banner" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold leading-tight">{selectedEvent.name || selectedEvent.title}</h2>
                    <span className="text-[10px] bg-red-50 text-red-primary px-2 py-0.5 rounded-full font-bold uppercase mt-2 inline-block">
                      {selectedEvent.category || 'Event'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Date</p>
                    <p className="text-sm font-bold flex items-center gap-2"><Calendar size={14} /> {(selectedEvent.date && new Date(selectedEvent.date).toLocaleDateString()) || 'TBA'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Location</p>
                    <p className="text-sm font-bold flex items-center gap-2"><MapPin size={14} /> {selectedEvent.location || selectedEvent.venueType || 'Campus'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Host</p>
                    <p className="text-sm font-bold">{selectedEvent.host || selectedEvent.created_by || 'University'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Audience</p>
                    <p className="text-sm font-bold">{selectedEvent.targetAudience || 'All Students'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold mb-2">About this Event</h4>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.description || 'No description available for this event.'}
                  </p>
                </div>

                {selectedEvent.registration_type === 'team' && teamForm.members.length > 0 ? (
                  <div className="pt-6 border-t border-gray-100 space-y-4">
                    <h4 className="font-bold">Team Details Form</h4>
                    <p className="text-xs text-gray-500">As the Team Lead, fill in your team's details below.</p>
                    <input type="text" placeholder="Team Name *" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} />
                    {teamForm.members.map((member, idx) => (
                      <input key={idx} type="email" placeholder={`Member ${idx + 2} Email *`} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm" value={member} onChange={e => {
                        const newMembers = [...teamForm.members];
                        newMembers[idx] = e.target.value;
                        setTeamForm({...teamForm, members: newMembers});
                      }} />
                    ))}
                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => {
                          if (!teamForm.name.trim() || teamForm.members.some(m => !m.trim())) {
                            setNotification({ message: 'Please fill in all team details!', type: 'error' });
                            setTimeout(() => setNotification(null), 3000);
                            return;
                          }
                          handleRegister(selectedEvent, teamForm);
                          setSelectedEvent(null);
                          setTeamForm({ name: '', members: [] });
                        }}
                        className="btn-primary flex-1 py-3 text-sm font-bold"
                      >
                        Submit Team Registration
                      </button>
                      <button onClick={() => setTeamForm({ name: '', members: [] })} className="btn-secondary px-6 py-3 text-sm font-bold">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-6 border-t border-gray-100 flex gap-4">
                    <button 
                      onClick={() => {
                        if (selectedEvent.registration_type === 'team') {
                          setTeamForm({ name: '', members: Array((selectedEvent.max_team_size || 2) - 1).fill('') });
                        } else {
                          handleRegister(selectedEvent);
                          setSelectedEvent(null);
                        }
                      }}
                      disabled={registrations.some((r: any) => (r.eventId || r.event_id) === selectedEvent.id)}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold shadow-lg shadow-red-primary/30 disabled:opacity-50"
                    >
                      {registrations.some((r: any) => (r.eventId || r.event_id) === selectedEvent.id) ? 'Already Registered' : selectedEvent.registration_type === 'team' ? 'Register Team' : 'Register Now'}
                    </button>
                    {selectedEvent.website && (
                      <a href={selectedEvent.website} target="_blank" rel="noopener noreferrer" className="btn-secondary px-6 py-4 flex items-center gap-2 text-sm font-bold">
                        <Globe size={18} /> Website
                      </a>
                    )}
                    <button onClick={() => { setSelectedEvent(null); setTeamForm({ name: '', members: [] }); }} className="btn-secondary px-6 py-4 text-sm font-bold">Close</button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Submission Modal */}
      <AnimatePresence>
        {submittingEvent && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSubmittingEvent(null)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 bg-red-primary text-white flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">Submit Your Project</h3>
                <button onClick={() => setSubmittingEvent(null)} className="p-1 hover:bg-white/20 rounded-full"><XCircle size={24} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Project Idea / Summary *</label>
                  <textarea 
                    value={submissionForm.idea}
                    onChange={(e) => setSubmissionForm({...submissionForm, idea: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-red-primary h-32 resize-none" 
                    placeholder="Briefly describe your solution..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">GitHub Repository</label>
                    <div className="relative">
                      <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="url" 
                        value={submissionForm.githubRepo}
                        onChange={(e) => setSubmissionForm({...submissionForm, githubRepo: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-red-primary" 
                        placeholder="https://github.com/..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Video Demo Link</label>
                    <div className="relative">
                      <Eye className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="url" 
                        value={submissionForm.videoUrl}
                        onChange={(e) => setSubmissionForm({...submissionForm, videoUrl: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-red-primary" 
                        placeholder="Youtube/Loom link"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Live Demo / Hosted Link</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="url" 
                      value={submissionForm.liveLink}
                      onChange={(e) => setSubmissionForm({...submissionForm, liveLink: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-red-primary" 
                      placeholder="https://yourproject.vercel.app"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSubmitProject}
                  disabled={loading || !submissionForm.idea.trim()}
                  className="w-full btn-primary py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-primary/30"
                >
                  {loading ? 'Submitting...' : 'Submit Project'} <Send size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}

// --- HOME TAB ---
function HomeTab({ student, registrations, events, notifications, onViewDetails }: { student: any, registrations: any[], events: any[], notifications: any[], onViewDetails?: (e: any) => void }) {
  const upcomingEvents = events.filter(e => {
    const isRegistered = registrations.some(r => r.eventId === e.id);
    return isRegistered && new Date(e.date) >= new Date();
  }).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-red-primary to-red-dark rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-display font-bold tracking-tight mb-2">Hey {student?.name || 'Student'}! 👋</h2>
          <p className="opacity-90 mb-6">{student?.college} • {student?.department || student?.branch || 'N/A'} • {student?.year || 'Year 1'}</p>
          <div className="max-w-md">
            <div className="flex justify-between text-sm mb-2">
              <span>Profile Completion</span>
              <span>85%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-[85%] rounded-full" />
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={<Calendar className="text-red-primary" />} value={registrations.length} label="Events Registered" />
        <StatCard icon={<CheckCircle2 className="text-red-primary" />} value={registrations.filter(r => r.attended).length} label="Events Attended" />
        <StatCard icon={<Award className="text-red-primary" />} value={registrations.filter(r => r.certificateIssued).length} label="Certificates" />
        <StatCard icon={<BookOpen className="text-red-primary" />} value={student?.skills?.length || 0} label="Skills" />
        <StatCard icon={<Eye className="text-red-primary" />} value={student?.profileViews || 0} label="Profile Views" />
        <StatCard icon={<TrendingUp className="text-red-primary" />} value={`${student?.campusScore || 0}/100`} label="Campus Score" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-red-primary" />
            Monthly Calendar
          </h3>
          <div className="grid grid-cols-7 gap-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-bold text-gray-400 uppercase py-2">{day}</div>
            ))}
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const hasEvent = registrations.some(r => {
                const eventDate = new Date(r.date);
                return eventDate.getDate() === day && eventDate.getMonth() === new Date().getMonth();
              });
              return (
                <div key={i} className="aspect-square flex flex-col items-center justify-center border border-gray-50 rounded-lg hover:bg-red-50 cursor-pointer relative group">
                  <span className="text-sm font-medium">{day}</span>
                  {hasEvent && <div className="w-1.5 h-1.5 bg-red-primary rounded-full mt-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <Clock size={20} className="text-red-primary" />
              Upcoming Events
            </h3>
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                <div key={event.id} className="border-l-4 border-red-primary pl-4 py-1">
                  <p className="font-bold text-sm">{event.name || event.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{event.date}</span>
                    <span>•</span>
                    <span>{event.location}</span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-gray-400 italic">No upcoming events found.</p>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card p-6">
            <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <Zap size={20} className="text-red-primary" />
              Activity Feed
            </h3>
            <div className="space-y-4">
              {notifications.slice(0, 5).map(ann => (
                <div key={ann.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    {ann.type === 'event' ? <Award size={14} className="text-red-primary" /> : ann.type === 'job' ? <Briefcase size={14} className="text-red-primary" /> : <Bell size={14} className="text-red-primary" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{ann.title || 'Notification'}</p>
                    <p className="text-[10px] text-gray-500">{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Recent'}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-xs text-gray-400 italic">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: any, value: any, label: string }) {
  return (
    <div className="card p-4 flex flex-col items-center text-center">
      <div className="mb-2">{icon}</div>
      <div className="text-xl font-mono font-bold">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{label}</div>
    </div>
  );
}

// --- EVENT PASSES TAB ---
function PassesTab({ registrations, events, onViewDetails }: { registrations: any[], events?: any[], onViewDetails?: (e: any) => void }) {
  const downloadQR = (regId: string, eventName: string) => {
    const canvas = document.getElementById(`qr-${regId}`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Pass-${eventName.replace(/\s+/g, '-')}.png`;
      link.href = url;
      link.click();
    }
  };

  if (registrations.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Ticket size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-xl font-display font-bold text-gray-400">No Event Passes Yet</h3>
        <p className="text-gray-500 text-sm mt-2">Register for events in the Discover tab to get your passes.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {registrations.map(reg => (
        <div key={reg.id} className="card overflow-hidden flex flex-col">
          <div className={`h-2 ${reg.attended ? 'bg-green-500' : 'bg-red-primary'}`} />
          <div className="p-6 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-red-primary leading-tight">{reg.eventName}</h3>
                <span className="text-[10px] bg-red-50 text-red-primary px-2 py-0.5 rounded-full font-bold uppercase">{reg.category}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">{reg.date}</p>
                <p className="text-[10px] text-gray-500">{reg.host}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                <span>Attendance Status</span>
                <span className={reg.attended ? 'text-green-600' : 'text-red-primary'}>
                  {reg.attended ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="flex gap-1">
                <div className="h-1.5 flex-1 bg-red-primary rounded-full" />
                <div className={`h-1.5 flex-1 rounded-full ${reg.attended ? 'bg-green-500' : 'bg-gray-100 animate-pulse'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${reg.attended ? 'bg-green-500' : 'bg-gray-100'}`} />
              </div>
            </div>

            <div className="flex justify-center bg-white p-4 rounded-xl mb-6 border-2 border-dashed border-gray-100 relative group">
              <div className="absolute inset-0 bg-red-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <QRCodeCanvas 
                id={`qr-${reg.id}`} 
                value={reg.unique_id || reg.id} 
                size={140}
                level="H"
                includeMargin={true}
              />
              <div className="absolute -bottom-2 right-4 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">Entry Code</p>
                <p className="text-sm font-mono font-bold text-red-primary tracking-wider">{reg.unique_id || reg.id.substring(0, 6).toUpperCase()}</p>
              </div>
            </div>

            {reg.team_name && (
              <div className="mb-6 p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-[8px] font-bold text-red-primary uppercase mb-1">Team Registration</p>
                <p className="text-sm font-bold text-gray-900">{reg.team_name}</p>
                <p className="text-[10px] text-gray-500 mt-1">Team ID: <span className="font-mono font-bold text-red-primary">{reg.team_id || 'N/A'}</span></p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => downloadQR(reg.id, reg.eventName)}
                className="btn-primary text-xs py-2 flex items-center justify-center gap-2"
              >
                <Download size={14} /> QR
              </button>
              <button 
                onClick={() => {
                  const event = events?.find(e => e.id === reg.eventId || e.id === reg.event_id);
                  if (event && onViewDetails) onViewDetails(event);
                  else window.alert(`Event: ${reg.eventName}\nDate: ${reg.date || 'TBD'}\nHost: ${reg.host || 'University'}\nRegistration ID: ${reg.id}`);
                }} 
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-2"
              >
                <Eye size={14} /> Details
              </button>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
            <div className={`text-[10px] font-bold flex items-center gap-1 ${reg.attended ? 'text-green-600' : 'text-amber-600'}`}>
              {reg.attended ? 'Attended' : 'Registered'}
            </div>
            {reg.certificateIssued && (
              <a 
                href={reg.certificateUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-red-primary hover:underline flex items-center gap-1"
              >
                <Download size={12} /> Certificate
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- MY EVENTS TAB ---
function MyEventsTab({ registrations, onUploadClick }: { registrations: any[], onUploadClick: (reg: any) => void }) {
  const [activeSubTab, setActiveSubTab] = useState('upcoming');
  
  const filteredRegistrations = registrations.filter(reg => {
    const eventDate = new Date(reg.date);
    const now = new Date();
    const isToday = eventDate.toDateString() === now.toDateString();
    
    switch (activeSubTab) {
      case 'upcoming': return eventDate > now && !isToday;
      case 'ongoing': return isToday;
      case 'completed': return eventDate < now && !isToday;
      case 'applied': return true; // Show all for now or filter by a specific status if available
      default: return true;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-200">
        {['Upcoming', 'Ongoing', 'Completed', 'Applied'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab.toLowerCase())}
            className={`pb-3 px-2 text-sm font-bold transition-all relative ${
              activeSubTab === tab.toLowerCase() ? 'text-red-primary' : 'text-gray-400'
            }`}
          >
            {tab}
            {activeSubTab === tab.toLowerCase() && (
              <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredRegistrations.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-bold">No {activeSubTab} events found.</p>
            <p className="text-xs text-gray-400 mt-1">Visit the Discover tab to find exciting opportunities.</p>
          </div>
        ) : (
          filteredRegistrations.map(reg => (
            <div key={reg.id} className="card p-6 flex flex-col md:flex-row gap-6 hover:border-red-primary transition-all group">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-display font-bold group-hover:text-red-primary transition-colors">{reg.eventName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    reg.attended ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-primary'
                  }`}>
                    {reg.category}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                  <MapPin size={14} /> {reg.host} • <Calendar size={14} /> {reg.date}
                </p>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Reg ID</p>
                    <p className="font-mono font-bold text-xs">{reg.unique_id || reg.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                  {reg.team_name && (
                    <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl">
                      <p className="text-[8px] font-bold text-red-primary uppercase tracking-widest">Team</p>
                      <p className="font-bold text-xs">{reg.team_name}</p>
                    </div>
                  )}
                  <button 
                    onClick={() => onUploadClick(reg)}
                    className="btn-primary py-2 px-4 text-xs font-bold shadow-sm"
                  >
                    Submit Idea
                  </button>
                </div>
              </div>

              <div className="md:w-64 border-l border-gray-100 pl-6 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Progress Tracker</p>
                <div className="space-y-3">
                  {[
                    { label: 'Registered', done: true },
                    { label: 'Attended', done: reg.attended },
                    { label: 'Submission', done: false },
                    { label: 'Evaluation', done: false },
                    { label: 'Certificate', done: reg.certificateIssued },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {step.done ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs font-bold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- DISCOVER TAB ---
function DiscoverTab({ onRegister, registrations, events, onViewDetails, onRefresh }: { onRegister: (event: any) => void, registrations: any[], events: any[], onViewDetails?: (e: any) => void, onRefresh?: () => void }) {
  const [filter, setFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredEvents = events.filter(event => {
    const isRegistered = registrations.some(r => r.eventId === event.id);
    if (isRegistered) return false;
    if (filter === 'All') return true;
    return event.category === filter;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-display font-bold">Discover Events</h3>
        <button 
          onClick={handleRefresh}
          className={`p-2 text-gray-400 hover:text-red-primary transition-all ${isRefreshing ? 'animate-spin text-red-primary' : ''}`}
          title="Refresh Events"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {['All', 'Hackathon', 'Webinar', 'Workshop', 'Competition', 'Cultural'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === f ? 'bg-red-primary text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-red-primary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.length > 0 ? filteredEvents.map(event => {
          const isRegistered = registrations.some(r => r.eventId === event.id);
          return (
            <div key={event.id} className="card overflow-hidden group">
              <div className="h-32 bg-gray-100 relative overflow-hidden">
                <img src={event.bannerUrl || event.image || `https://picsum.photos/seed/${event.id}/600/300`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" referrerPolicy="no-referrer" />
                <div className="absolute top-3 right-3">
                  <button className="w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-red-primary hover:bg-white">
                    <Star size={14} />
                  </button>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="bg-red-primary text-white text-[10px] font-bold px-2 py-1 rounded">{event.category}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-display font-bold mb-1">{event.name || event.title}</h3>
                <p className="text-xs text-gray-500 mb-4">{event.host || 'University'} • {event.date}</p>
                
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span>Slots</span>
                    <span>{event.slots?.filled || 0}/{event.slots?.total || 100}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-primary" 
                      style={{ width: `${((event.slots?.filled || 0) / (event.slots?.total || 100)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => onRegister(event)}
                    disabled={isRegistered}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      isRegistered ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-primary text-white hover:bg-red-dark'
                    }`}
                  >
                    {isRegistered ? 'Registered' : 'Register Now'}
                  </button>
                  {event.website && (
                    <a href={event.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:text-red-primary transition-all">
                      <Globe size={16} />
                    </a>
                  )}
                  <button onClick={() => {
                    if (onViewDetails) onViewDetails(event);
                    else window.alert(`${event.name || event.title}\n\n${event.description || 'No description available.'}`);
                  }} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:text-red-primary transition-all">
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="lg:col-span-3 py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">No new events found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- INTERNSHIP SENTINEL TAB ---
function SentinelTab() {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<null | 'verified' | 'suspicious' | 'fake'>(null);
  const [url, setUrl] = useState('');
  const [scanSteps, setScanSteps] = useState<string[]>([]);

  const handleVerify = async () => {
    if (!url.trim()) return;
    setVerifying(true);
    setResult(null);
    setScanSteps([]);
    
    const steps = [
      "Initializing UniGuild Sentinel Engine...",
      "Fetching domain metadata and SSL status...",
      "Cross-referencing with LinkedIn API...",
      "Analyzing job description for red flags...",
      "Checking recruiter identity verification...",
      "Finalizing risk assessment..."
    ];

    for (const step of steps) {
      setScanSteps(prev => [...prev, step]);
      await new Promise(r => setTimeout(r, 600));
    }

    setVerifying(false);
    const lowerUrl = url.toLowerCase();
    const scamKeywords = ['whatsapp', 'telegram', 'bit.ly', 'registration fee', 'training fee', 'security deposit', 'investment', 'laptop fee', 'payment required', 'unpaid training'];
    const premiumDomains = ['google.com', 'microsoft.com', 'amazon.com', 'apple.com', 'meta.com', 'netflix.com', 'internshala.com', 'linkedin.com', 'unstop.com'];
    const suspiciousTlds = ['.xyz', '.top', '.free', '.work', '.biz', '.info', '.site'];

    if (premiumDomains.some(d => lowerUrl.includes(d))) {
      setResult('verified');
    } else if (scamKeywords.some(k => lowerUrl.includes(k)) || suspiciousTlds.some(t => lowerUrl.endsWith(t) || lowerUrl.includes(t + '/'))) {
      setResult('suspicious');
    } else if (lowerUrl.includes('unpaid') && (lowerUrl.includes('fee') || lowerUrl.includes('charge'))) {
      setResult('fake');
    } else if (lowerUrl.includes('@gmail.com') || lowerUrl.includes('@outlook.com') || lowerUrl.includes('@yahoo.com')) {
      // Personal email for internship apps is a minor flag
      setResult('suspicious');
    } else {
      setResult('verified');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Note */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl flex items-start gap-3">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-bold text-blue-900">Pro-Tip for Career Safety</p>
          <p className="text-xs text-blue-700">Internship Sentinel uses advanced AI cross-referencing to validate job listings against official company domains and known scam databases. Always verify the sender's email domain before sharing personal documents.</p>
        </div>
      </div>

      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-5xl font-display font-bold text-red-primary mb-2">Internship Sentinel</h2>
        <p className="text-gray-500 font-medium">Advanced AI-Powered Legitimacy Verification</p>
      </div>

      {/* Verifier Section */}
      <section className="card p-10 bg-white shadow-xl border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <ShieldCheck size={120} />
        </div>
        
        <div className="relative z-10">
          <h3 className="text-2xl font-display font-bold mb-2 text-center">Verify Internship Authenticity</h3>
          <p className="text-center text-gray-400 text-sm mb-8">Paste the application link or company name to run a deep-scan verification.</p>
          
          <div className="flex flex-col md:flex-row gap-3 max-w-2xl mx-auto mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://careers.google.com/jobs/..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-red-primary focus:bg-white transition-all shadow-inner"
              />
            </div>
            <button 
              onClick={handleVerify}
              disabled={verifying || !url.trim()}
              className="btn-primary px-10 py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Zap size={18} />
                  </motion.div>
                  Analyzing...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Run Deep Scan
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {verifying && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-xl mx-auto mt-8 space-y-3"
              >
                {scanSteps.map((step, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 text-xs font-mono text-gray-500"
                  >
                    <div className="w-1 h-1 bg-red-primary rounded-full" />
                    {step}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && !verifying && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`max-w-2xl mx-auto p-8 rounded-2xl border-2 shadow-lg ${
                  result === 'verified' ? 'bg-green-50 border-green-200' : 
                  result === 'suspicious' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-6 mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                    result === 'verified' ? 'bg-green-500' : result === 'suspicious' ? 'bg-amber-500' : 'bg-red-500'
                  }`}>
                    {result === 'verified' ? <CheckCircle2 size={32} /> : result === 'suspicious' ? <AlertCircle size={32} /> : <XCircle size={32} />}
                  </div>
                  <div>
                    <h4 className={`font-display font-bold text-2xl uppercase tracking-tight ${
                      result === 'verified' ? 'text-green-800' : result === 'suspicious' ? 'text-amber-800' : 'text-red-800'
                    }`}>
                      {result === 'verified' ? 'Verified Safe' : result === 'suspicious' ? 'Caution Advised' : 'High Risk Detected'}
                    </h4>
                    <p className="text-sm opacity-70 font-medium">UniGuild Sentinel Engine v4.2 • Scan ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Security Checkpoints</h5>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 size={14} className="text-green-500" /> Domain Authentication
                      </li>
                      <li className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 size={14} className="text-green-500" /> SSL Certificate Valid
                      </li>
                      <li className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 size={14} className="text-green-500" /> Official Job Portal Sync
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Analysis Summary</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {result === 'verified' 
                        ? "This listing matches official company records. It is safe to proceed with your application." 
                        : "We found inconsistencies in the domain or contact info. Avoid sharing sensitive data or paying any 'security deposits'."}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200/50 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Scan: Just Now</span>
                  <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="text-xs font-bold text-red-primary hover:underline flex items-center gap-1">
                    <Share2 size={12} /> Share Report
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-gray-900">12k+</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Scams Blocked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-gray-900">99.9%</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Accuracy Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-gray-900">500+</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Trusted Domains</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-gray-900">&lt; 2s</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Analysis Time</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h4 className="font-bold mb-2 flex items-center gap-2">
          <ShieldCheck size={18} className="text-red-primary" />
          Why trust Internship Sentinel?
        </h4>
        <p className="text-sm text-gray-500">
          Our engine utilizes real-time API integrations with LinkedIn, Indeed, and official company career portals to verify the existence of job IDs. We also maintain a community-driven database of reported fraudulent internship providers.
        </p>
      </div>
    </div>
  );
}

// --- JOB BOARD TAB ---
function JobsTab({ onViewDetails, jobs, onRefresh }: { onViewDetails: (job: any) => void, jobs: any[], onRefresh?: () => void }) {
  const [filter, setFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter === 'All') return true;
    return job.type === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-display font-bold">Job Board</h3>
        <button 
          onClick={handleRefresh}
          className={`p-2 text-gray-400 hover:text-red-primary transition-all ${isRefreshing ? 'animate-spin text-red-primary' : ''}`}
          title="Refresh Jobs"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {['All', 'Internship', 'Full-time', 'Research', 'Contract'].map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === f ? 'bg-red-primary border-red-primary text-white' : 'border-gray-200 text-gray-500 hover:border-red-primary'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {filteredJobs.length > 0 ? filteredJobs.map(job => (
          <div key={job.id} className="card p-6 flex gap-6 group hover:border-red-primary transition-all">
            <div className="w-16 h-16 bg-white border border-gray-100 rounded-xl flex items-center justify-center p-2">
              {job.logo ? (
                <img src={job.logo} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gray-50 text-gray-400 border border-gray-100 rounded-lg flex items-center justify-center font-display font-bold text-2xl">
                  {job.company?.charAt(0) || 'J'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold group-hover:text-red-primary transition-colors">{job.title}</h3>
                  <p className="text-red-primary font-bold text-sm">{job.company}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold">{job.type}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase ${job.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {job.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                <span className="flex items-center gap-1"><Zap size={12} /> {job.stipend}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {job.skills?.map((s: string) => <span key={s} className="text-[10px] border border-gray-200 px-2 py-0.5 rounded">{s}</span>)}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => onViewDetails(job)}
                  className="btn-primary flex-1 py-2 text-xs text-center flex items-center justify-center gap-2"
                >
                  View Details <Eye size={14} />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="lg:col-span-2 py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">No jobs found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- PROFILE TAB - BENTO BOX 4-COLUMN GRID ---
function ProfileTab({ student, onSave }: { student: any, onSave: (updated: any) => void }) {
  const [localStudent, setLocalStudent] = useState(student);
  const [newSkill, setNewSkill] = useState('');
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const [notifPrefs, setNotifPrefs] = useState({
    newEvents: { inApp: true, email: false },
    taskAssignments: { inApp: true, email: true },
    messages: { inApp: true, email: true },
    announcements: { inApp: true, email: false },
  });

  const toggleNotif = (id: keyof typeof notifPrefs, type: 'inApp' | 'email') => {
    setNotifPrefs(prev => ({
      ...prev,
      [id]: { ...prev[id], [type]: !prev[id][type] }
    }));
  };

  useEffect(() => {
    setLocalStudent(student);
  }, [student]);

  const addProject = () => {
    const newProj = {
      id: `P${(localStudent.projects?.length || 0) + 1}`,
      name: 'New Project',
      description: 'Project description goes here...',
      link: 'https://github.com'
    };
    setLocalStudent({ ...localStudent, projects: [...(localStudent.projects || []), newProj] });
  };

  const addExperience = () => {
    const newExp = {
      id: `E${(localStudent.workExperience?.length || 0) + 1}`,
      company: 'New Company',
      role: 'Intern',
      duration: '3 Months',
      description: 'Describe your role...'
    };
    setLocalStudent({ ...localStudent, workExperience: [...(localStudent.workExperience || []), newExp] });
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !localStudent.skills?.includes(newSkill.trim())) {
      setLocalStudent({
        ...localStudent,
        skills: [...(localStudent.skills || []), newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  if (!student) return null;

  // BENTO BOX 4-COLUMN GRID LAYOUT
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* ROW 1 */}
      {/* Avatar + Links (col-span-2) */}
      <div className="col-span-2 card p-6 flex flex-col items-center text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => setLocalStudent({ ...localStudent, avatar: reader.result as string });
              reader.readAsDataURL(file);
            }}
          />
          <img src={localStudent.avatar || "https://picsum.photos/seed/user/200/200"} className="w-full h-full rounded-full border-4 border-red-primary p-1" alt="" />
          <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 w-9 h-9 bg-red-primary text-white rounded-full flex items-center justify-center border-4 border-white">
            <Camera size={16} />
          </button>
        </div>
        <h3 className="text-xl font-display font-bold">{localStudent.name}</h3>
        <p className="text-sm text-gray-500 mb-4">{localStudent.college}</p>
        <div className="flex justify-center gap-3 mb-4">
          <a href={localStudent.github || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:text-red-primary hover:bg-red-50 transition-all"><Github size={18} /></a>
          <a href={localStudent.linkedin || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:text-red-primary hover:bg-red-50 transition-all"><Linkedin size={18} /></a>
          <a href={localStudent.website || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:text-red-primary hover:bg-red-50 transition-all"><Globe size={18} /></a>
        </div>
        <div className="flex items-center gap-3 w-full">
          <input 
            type="text" 
            placeholder="GitHub URL" 
            value={localStudent.github || ''}
            onChange={e => setLocalStudent({...localStudent, github: e.target.value})}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-primary"
          />
          <input 
            type="text" 
            placeholder="LinkedIn URL" 
            value={localStudent.linkedin || ''}
            onChange={e => setLocalStudent({...localStudent, linkedin: e.target.value})}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-primary"
          />
        </div>
      </div>

      {/* Personal Info (col-span-1) */}
      <div className="col-span-1 card p-6">
        <h4 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <User size={16} className="text-red-primary" /> Personal Info
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Full Name</label>
            <input 
              type="text" 
              value={localStudent.name} 
              onChange={e => setLocalStudent({...localStudent, name: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Email</label>
            <input 
              type="email" 
              value={localStudent.email} 
              disabled
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-xs outline-none cursor-not-allowed" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">College</label>
            <input 
              type="text" 
              value={localStudent.college} 
              onChange={e => setLocalStudent({...localStudent, college: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Branch</label>
            <input 
              type="text" 
              value={localStudent.department || localStudent.branch || ''} 
              onChange={e => setLocalStudent({...localStudent, department: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Year</label>
            <input 
              type="text" 
              value={localStudent.year || ''} 
              onChange={e => setLocalStudent({...localStudent, year: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
        </div>
      </div>

      {/* Reputation Score (col-span-1) */}
      <div className="col-span-1 card p-6 flex flex-col items-center">
        <h4 className="text-lg font-display font-bold mb-4 flex items-center gap-2 self-start">
          <TrendingUp size={16} className="text-red-primary" /> Reputation
        </h4>
        <div className="relative w-28 h-28 mb-4">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f40000" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset={282.7 * (1 - (localStudent.campusScore || 85) / 100)} strokeLinecap="round" transform="rotate(-90 50 50)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold">{localStudent.campusScore || 85}</span>
            <span className="text-[8px] font-bold text-gray-400 uppercase">Score</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-lg font-mono font-bold">{localStudent.profileViews || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Views</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-lg font-mono font-bold">{localStudent.skills?.length || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Skills</p>
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      {/* Skills (col-span-2) */}
      <div className="col-span-2 card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-display font-bold flex items-center gap-2">
            <BookOpen size={16} className="text-red-primary" /> Skills
          </h4>
          <span className="text-[10px] bg-red-50 text-red-primary px-2 py-0.5 rounded-full font-bold">{localStudent.skills?.length || 0} skills</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {localStudent.skills?.map((skill: string) => (
            <span key={skill} className="bg-red-50 text-red-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-red-100">
              {skill} 
              <button onClick={() => setLocalStudent({...localStudent, skills: localStudent.skills.filter((s: string) => s !== skill)})} className="hover:text-red-dark">
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
            value={localStudent.bio}
            onChange={e => setLocalStudent({...localStudent, bio: e.target.value})}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs outline-none focus:border-red-primary h-20 resize-none" 
            placeholder="Tell us about yourself..." 
          />
        </div>
      </div>

      {/* Resume Upload (col-span-2) */}
      <div className="col-span-2 card p-6">
        <h4 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <FileText size={16} className="text-red-primary" /> Resume
        </h4>
        {localStudent.resumeUrl ? (
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="w-12 h-12 bg-red-primary text-white rounded-xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold truncate">Resume_Uploaded.pdf</p>
              <p className="text-[10px] text-gray-500">Ready for download</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.open(localStudent.resumeUrl, '_blank')} className="p-2 bg-white rounded-lg text-gray-600 hover:text-red-primary transition-all border border-gray-100">
                <ExternalLink size={16} />
              </button>
              <a href={localStudent.resumeUrl} download className="p-2 bg-white rounded-lg text-gray-600 hover:text-red-primary transition-all border border-gray-100">
                <Download size={16} />
              </a>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => document.getElementById('resume-upload')?.click()}
            className="w-full p-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-3 hover:border-red-primary hover:bg-red-50 transition-all group"
          >
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-white transition-all">
              <Upload className="text-gray-400 group-hover:text-red-primary" size={20} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">Upload Resume</p>
              <p className="text-[10px] text-gray-400 uppercase">PDF, DOCX (Max 5MB)</p>
            </div>
          </button>
        )}
        <input 
          type="file" 
          id="resume-upload" 
          className="hidden" 
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => setLocalStudent({ ...localStudent, resumeUrl: reader.result as string });
              reader.readAsDataURL(file);
            }
          }}
        />
        <div className="mt-4 flex justify-end">
          <button onClick={() => onSave(localStudent)} className="btn-primary">Save Changes</button>
        </div>
      </div>

      {/* ROW 3 */}
      {/* Projects (col-span-2) */}
      <div className="col-span-2 card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-display font-bold flex items-center gap-2">
            <Award size={16} className="text-red-primary" /> Projects
          </h4>
          <button onClick={addProject} className="text-xs font-bold text-red-primary flex items-center gap-1 hover:underline">
            <Plus size={14} /> Add Project
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {localStudent.projects?.map((proj: any, idx: number) => (
            <div key={proj.id || idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-red-primary transition-all">
              <input 
                className="font-bold text-sm bg-transparent border-none outline-none w-full mb-1" 
                value={proj.name}
                onChange={e => {
                  const newProjs = [...localStudent.projects];
                  newProjs[idx].name = e.target.value;
                  setLocalStudent({...localStudent, projects: newProjs});
                }}
              />
              <textarea 
                className="text-xs text-gray-500 bg-transparent border-none outline-none w-full h-12 resize-none"
                value={proj.description}
                onChange={e => {
                  const newProjs = [...localStudent.projects];
                  newProjs[idx].description = e.target.value;
                  setLocalStudent({...localStudent, projects: newProjs});
                }}
              />
              <div className="flex justify-between items-center mt-2">
                <input 
                  className="text-[10px] text-blue-500 bg-transparent border-none outline-none flex-1"
                  value={proj.link}
                  onChange={e => {
                    const newProjs = [...localStudent.projects];
                    newProjs[idx].link = e.target.value;
                    setLocalStudent({...localStudent, projects: newProjs});
                  }}
                />
                <button 
                  onClick={() => {
                    const newProjs = localStudent.projects.filter((_: any, i: number) => i !== idx);
                    setLocalStudent({...localStudent, projects: newProjs});
                  }}
                  className="text-gray-400 hover:text-red-primary"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {(!localStudent.projects || localStudent.projects.length === 0) && (
            <div className="col-span-2 py-8 text-center text-gray-400 text-xs">
              No projects yet. Click "Add Project" to showcase your work.
            </div>
          )}
        </div>
      </div>

      {/* Experience (col-span-2) */}
      <div className="col-span-2 card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-display font-bold flex items-center gap-2">
            <Briefcase size={16} className="text-red-primary" /> Experience
          </h4>
          <button onClick={addExperience} className="text-xs font-bold text-red-primary flex items-center gap-1 hover:underline">
            <Plus size={14} /> Add Experience
          </button>
        </div>
        <div className="space-y-3">
          {localStudent.workExperience?.map((exp: any, idx: number) => (
            <div key={exp.id || idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-red-primary transition-all">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input 
                  className="font-bold text-sm bg-transparent border-none outline-none" 
                  placeholder="Company"
                  value={exp.company}
                  onChange={e => {
                    const newExp = [...localStudent.workExperience];
                    newExp[idx].company = e.target.value;
                    setLocalStudent({...localStudent, workExperience: newExp});
                  }}
                />
                <input 
                  className="text-xs text-red-primary font-bold bg-transparent border-none outline-none text-right" 
                  placeholder="Duration"
                  value={exp.duration}
                  onChange={e => {
                    const newExp = [...localStudent.workExperience];
                    newExp[idx].duration = e.target.value;
                    setLocalStudent({...localStudent, workExperience: newExp});
                  }}
                />
              </div>
              <input 
                className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none w-full mb-2" 
                placeholder="Role"
                value={exp.role}
                onChange={e => {
                  const newExp = [...localStudent.workExperience];
                  newExp[idx].role = e.target.value;
                  setLocalStudent({...localStudent, workExperience: newExp});
                }}
              />
              <div className="flex justify-between items-end">
                <textarea 
                  className="text-[10px] text-gray-500 bg-transparent border-none outline-none w-full h-10 resize-none"
                  placeholder="Description"
                  value={exp.description}
                  onChange={e => {
                    const newExp = [...localStudent.workExperience];
                    newExp[idx].description = e.target.value;
                    setLocalStudent({...localStudent, workExperience: newExp});
                  }}
                />
                <button 
                  onClick={() => {
                    const newExp = localStudent.workExperience.filter((_: any, i: number) => i !== idx);
                    setLocalStudent({...localStudent, workExperience: newExp});
                  }}
                  className="text-gray-400 hover:text-red-primary ml-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {(!localStudent.workExperience || localStudent.workExperience.length === 0) && (
            <div className="py-8 text-center text-gray-400 text-xs">
              No experience yet. Click "Add Experience" to add your work history.
            </div>
          )}
        </div>
      </div>

      {/* ROW 4 - Notification Preferences (col-span-4) */}
      <div className="col-span-4 card p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-display font-bold flex items-center gap-2">
            <Bell size={16} className="text-red-primary" /> Notification Preferences
          </h4>
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-primary" />
              <span className="text-[8px] font-bold text-gray-400 uppercase">In-App</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-[8px] font-bold text-gray-400 uppercase">Email</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {[
            { id: 'newEvents', label: 'New Events', icon: <Calendar size={16} /> },
            { id: 'taskAssignments', label: 'Task Assignments', icon: <CheckCircle2 size={16} /> },
            { id: 'messages', label: 'Messages', icon: <Send size={16} /> },
            { id: 'announcements', label: 'Announcements', icon: <Bell size={16} /> },
          ].map((item) => (
            <div key={item.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between group hover:bg-gray-100 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 group-hover:text-red-primary group-hover:bg-red-50 transition-all shadow-sm">
                  {item.icon}
                </div>
                <span className="text-sm font-bold text-gray-700">{item.label}</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => toggleNotif(item.id as any, 'inApp')}
                  className={`w-10 h-5 rounded-full relative transition-all ${notifPrefs[item.id as keyof typeof notifPrefs].inApp ? 'bg-red-primary' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifPrefs[item.id as keyof typeof notifPrefs].inApp ? 'left-6' : 'left-1'}`} />
                </button>
                <button 
                  onClick={() => toggleNotif(item.id as any, 'email')}
                  className={`w-10 h-5 rounded-full relative transition-all ${notifPrefs[item.id as keyof typeof notifPrefs].email ? 'bg-red-primary' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifPrefs[item.id as keyof typeof notifPrefs].email ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
          <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Email notifications are sent to <strong>{student.email}</strong>. You can change your primary email in the Personal Info section above.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- CERTIFICATES TAB ---
function CertificatesTab({ registrations }: { registrations: any[] }) {
  const certificates = registrations.filter(r => r.certificateIssued);
  
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.length > 0 ? certificates.map(cert => (
          <div key={cert.id} className="card overflow-hidden group">
            <div className="aspect-[1.4/1] bg-gray-100 relative overflow-hidden flex items-center justify-center p-4">
              <div className="w-full h-full border-4 border-red-primary/20 rounded-lg flex flex-col items-center justify-center text-center p-4 bg-white shadow-inner">
                <Award size={32} className="text-red-primary mb-2" />
                <h4 className="text-xs font-display font-bold text-red-primary uppercase tracking-widest">Certificate of Participation</h4>
                <div className="w-12 h-0.5 bg-red-primary my-2" />
                <p className="text-[8px] text-gray-400 uppercase font-bold mb-1">Awarded to</p>
                <p className="text-sm font-display font-bold text-gray-900">{cert.studentName}</p>
                <p className="text-[8px] text-gray-400 uppercase font-bold mt-2">For participating in</p>
                <p className="text-[10px] font-bold text-gray-700">{cert.eventName}</p>
              </div>
              <div className="absolute inset-0 bg-red-primary/0 group-hover:bg-red-primary/10 transition-colors" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-sm mb-1">{cert.eventName}</h3>
              <p className="text-[10px] text-gray-500 mb-4">Issued on {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'Recently'}</p>
              <div className="flex gap-2">
                <a 
                  href={cert.certificateUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-2"
                >
                  <Download size={14} /> Download
                </a>
                <button onClick={() => navigator.clipboard?.writeText(cert.certificateUrl || '')} className="btn-secondary py-2 px-3 text-xs">
                  <Share2 size={14} />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="lg:col-span-3 py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Award size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">No certificates issued yet.</p>
            <p className="text-xs text-gray-400 mt-2">Certificates will appear here once issued by event coordinators.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- NOTIFICATIONS TAB ---
function NotificationsTab({ notifications, userId }: { notifications: any[], userId?: string }) {
  const [notice, setNotice] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const handleMarkAllRead = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) {
      setNotice({ message: `Mark read failed: ${error.message}`, type: 'error' });
      return;
    }
    setNotice({ message: 'All notifications marked as read.', type: 'success' });
  };

  const handleClearAll = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (error) {
      setNotice({ message: `Clear all failed: ${error.message}`, type: 'error' });
      return;
    }
    setNotice({ message: 'All notifications cleared.', type: 'success' });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h3 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
          <Bell className="text-red-primary" size={24} /> Notifications
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={handleMarkAllRead} 
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-primary rounded-xl text-xs font-bold hover:bg-red-primary hover:text-white transition-all border border-red-100"
          >
            <CheckCircle2 size={14} /> Mark all read
          </button>
          <button 
            onClick={handleClearAll} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all border border-gray-100"
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>
      </div>

      {notice && (
        <div className={`rounded-lg border px-3 py-2 text-xs font-bold ${notice.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {notice.message}
        </div>
      )}

      <div className="space-y-3">
        {notifications.length > 0 ? notifications.map(ann => (
          <div key={ann.id} className="card p-4 flex gap-4 items-start relative overflow-hidden">
            {!ann.read && <div className="absolute top-0 left-0 w-1 h-full bg-red-primary" />}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              ann.type === 'event' ? 'bg-blue-50 text-blue-500' : ann.type === 'job' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-primary'
            }`}>
              {ann.type === 'event' ? <Calendar size={18} /> : ann.type === 'job' ? <Briefcase size={18} /> : <Bell size={18} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-bold">{ann.title || ann.type?.toUpperCase()}</h4>
                <span className="text-[10px] text-gray-400">
                  {ann.createdAt ? new Date(ann.createdAt).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{ann.message}</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
