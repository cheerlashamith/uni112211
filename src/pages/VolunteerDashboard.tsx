import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, CheckSquare, QrCode, Award, 
  MessageSquare, User, Clock, MapPin, 
  CheckCircle2, AlertCircle, ChevronRight,
  Camera, History, Star, Bell, X, Check, Calendar, Send, Info, Mail,
  Users, Trash2, Plus
} from 'lucide-react';
import QRScanner from '../components/QRScanner';
import DashboardShell from '../components/DashboardShell';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'tasks', label: 'My Tasks', icon: <CheckSquare size={20} /> },
  { id: 'attendance', label: 'Attendance', icon: <QrCode size={20} /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare size={20} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
];

export default function VolunteerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [volunteerProfile, setVolunteerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchProfile = async () => {
      const { data: profile } = await supabase.from('users').select('*').eq('uid', currentUser.uid).single();
      if (profile) {
        setVolunteerProfile({ ...profile, uid: profile.uid || profile.id });
      }
      setLoading(false);
    };

    fetchProfile();

    const profileChannel = supabase.channel(`vol_profile_${currentUser.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `uid=eq.${currentUser.uid}` }, fetchProfile)
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [currentUser?.uid]);

  const handleSaveProfile = async (updatedProfile: any) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('users').update(updatedProfile).eq('uid', currentUser.uid);
      if (error) {
        setNotification({ message: `Profile update failed: ${error.message}`, type: 'error' });
        return;
      }
      setVolunteerProfile({ ...volunteerProfile, ...updatedProfile });
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
      case 'overview': return <OverviewTab volunteer={volunteerProfile} onScanClick={() => setActiveTab('attendance')} />;
      case 'tasks': return <TasksTab volunteerId={volunteerProfile?.uid} setNotification={setNotification} />;
      case 'attendance': return <AttendanceTab volunteerId={volunteerProfile?.uid} volunteerName={volunteerProfile?.name} setNotification={setNotification} />;
      case 'messages': return <MessagesTab volunteerId={volunteerProfile?.uid} setNotification={setNotification} />;
      case 'notifications': return <NotificationsTab userId={volunteerProfile?.uid} setNotification={setNotification} />;
      case 'profile': return <ProfileTab volunteer={volunteerProfile} onSave={handleSaveProfile} />;
      default: return <OverviewTab volunteer={volunteerProfile} onScanClick={() => setActiveTab('attendance')} />;
    }
  };

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      roleName="Volunteer"
      userName={volunteerProfile?.name || "Volunteer"}
      userAvatar={volunteerProfile?.avatar}
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
    </DashboardShell>
  );
}

// --- OVERVIEW TAB ---
function OverviewTab({ volunteer, onScanClick }: { volunteer: any, onScanClick: () => void }) {
  const [stats, setStats] = useState({
    assignedEvents: 0,
    tasksCompleted: 0,
    tasksPending: 0,
    scannedToday: 0
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  useEffect(() => {
    if (!volunteer?.uid) return;

    const fetchData = async () => {
      // Get assigned events
      const { data: assignments } = await supabase.from('assignments').select('event_id').contains('user_id', [volunteer.uid]);
      const eventIds = (assignments || []).map((a: any) => a.event_id);
      const assignedEvents = eventIds.length;

      // Get tasks for this volunteer
      const { data: tasksData } = await supabase.from('tasks').select('*').contains('assigned_to', [volunteer.uid]);
      const tasks = tasksData || [];
      const tasksCompleted = tasks.filter(t => ['done', 'completed'].includes((t.status || '').toLowerCase())).length;
      const tasksPending = tasks.filter(t => !['done', 'completed'].includes((t.status || '').toLowerCase())).length;

      // Get scanned today
      const today = new Date().toISOString().split('T')[0];
      const { data: scans } = await supabase.from('registrations').select('id').eq('scanned_by', volunteer.uid);
      const scannedToday = (scans || []).length;

      // Get broadcasts
      const { data: broadcastsData } = await supabase.from('broadcasts').select('*').in('audience', ['All', 'Volunteers']).order('created_at', { ascending: false }).limit(3);
      setBroadcasts(broadcastsData || []);

      setStats({ assignedEvents, tasksCompleted, tasksPending, scannedToday });
    };

    fetchData();
  }, [volunteer?.uid]);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Welcome Banner */}
      <div className="col-span-4 bg-gradient-to-r from-red-primary to-red-dark rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight mb-1">Welcome, {volunteer?.name?.split(' ')[0]}!</h2>
            <p className="opacity-90 text-sm">{stats.assignedEvents} events assigned to you</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onScanClick} className="bg-white/20 border border-white/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2">
              <QrCode size={14} /> Scan
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Stats Grid */}
      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-primary flex items-center justify-center">
          <Calendar size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{stats.assignedEvents}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Assigned Events</div>
        </div>
      </div>

      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{stats.tasksCompleted}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tasks Completed</div>
        </div>
      </div>

      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <CheckSquare size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{stats.tasksPending}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Pending Tasks</div>
        </div>
      </div>

      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Users size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{stats.scannedToday}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Scanned Today</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="col-span-4 card p-6">
        <h3 className="text-lg font-display font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          <button onClick={onScanClick} className="p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-all text-center">
            <QrCode size={24} className="mx-auto text-red-primary mb-2" />
            <p className="text-sm font-bold text-gray-700">Scan Attendance</p>
          </button>
          <button className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all text-center">
            <CheckSquare size={24} className="mx-auto text-green-600 mb-2" />
            <p className="text-sm font-bold text-gray-700">{stats.tasksPending} Tasks</p>
          </button>
          <button className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all text-center">
            <Bell size={24} className="mx-auto text-blue-600 mb-2" />
            <p className="text-sm font-bold text-gray-700">Notifications</p>
          </button>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="col-span-4 card p-6">
        <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <Bell size={18} className="text-red-primary" /> Recent Announcements
        </h3>
        {broadcasts.length === 0 ? (
          <p className="text-center py-6 text-gray-400 text-sm">No recent announcements.</p>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((ann: any) => (
              <div key={ann.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-primary flex-shrink-0">
                  <Bell size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold">{ann.subject}</p>
                  <p className="text-[10px] text-gray-500 line-clamp-2">{ann.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- TASKS TAB ---
function TasksTab({ volunteerId, setNotification }: { volunteerId: string, setNotification: (n: any) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!volunteerId) return;

    const fetchTasks = async () => {
      const { data: tasksData } = await supabase.from('tasks').select('*').contains('assigned_to', [volunteerId]);
      if (tasksData) {
        setTasks(tasksData.map((t: any) => ({
          ...t,
          eventId: t.event_id,
          deadline: t.deadline,
          priority: t.priority || 'Medium',
          status: t.status || 'todo'
        })));
      }
      setLoading(false);
    };

    fetchTasks();

    const channel = supabase.channel(`vol_tasks_${volunteerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [volunteerId]);

  const handleMarkComplete = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').update({
        status: 'done',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', taskId);

      if (error) throw error;

      setNotification({ message: 'Task marked as complete!', type: 'success' });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t));
    } catch (err: any) {
      setNotification({ message: `Failed to update task: ${err.message}`, type: 'error' });
    }
  };

  const filteredTasks = tasks.filter(t => {
    const status = (t.status || '').toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'pending') return status !== 'done' && status !== 'completed';
    if (filter === 'done') return status === 'done' || status === 'completed';
    return true;
  });

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {['All', 'Pending', 'Done'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f.toLowerCase())}
            className={`pb-3 px-2 text-sm font-bold transition-all relative ${
              filter === f.toLowerCase() ? 'text-red-primary' : 'text-gray-400'
            }`}
          >
            {f}
            {filter === f.toLowerCase() && <motion.div layoutId="tasks-filter" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-primary" />}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-green-300 mb-4" />
          <h3 className="text-xl font-display font-bold text-gray-400">All Tasks Completed!</h3>
          <p className="text-sm text-gray-500 mt-2">Great job, volunteer!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <div key={task.id} className="card p-5">
              <div className="flex items-start gap-4">
                <button 
                  onClick={() => handleMarkComplete(task.id)}
                  disabled={(task.status || '').toLowerCase() === 'done' || (task.status || '').toLowerCase() === 'completed'}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
                    (task.status || '').toLowerCase() === 'done' || (task.status || '').toLowerCase() === 'completed'
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-200 hover:border-red-primary cursor-pointer'
                  }`}
                >
                  {(task.status || '').toLowerCase() === 'done' || (task.status || '').toLowerCase() === 'completed' ? (
                    <Check size={14} />
                  ) : null}
                </button>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`text-sm font-bold ${(task.status || '').toLowerCase() === 'done' || (task.status || '').toLowerCase() === 'completed' ? 'line-through text-gray-400' : ''}`}>
                      {task.title}
                    </h4>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      task.priority === 'High' ? 'bg-red-50 text-red-600' :
                      task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{task.description}</p>
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <span>Task ID: {task.id.substring(0, 8).toUpperCase()}</span>
                    {task.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- ATTENDANCE TAB ---
function AttendanceTab({ volunteerId, volunteerName, setNotification }: { volunteerId: string, volunteerName: string, setNotification: (n: any) => void }) {
  const [mode, setMode] = useState<'scan' | 'history'>('scan');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Fetch history
  useEffect(() => {
    if (!volunteerId) return;

    const fetchHistory = async () => {
      const { data } = await supabase.from('registrations').select('*').eq('scanned_by', volunteerId).eq('attended', true).order('attended_at', { ascending: false }).limit(50);
      if (data) {
        setHistory(data.map(r => ({
          ...r,
          studentName: r.student_name,
          eventName: r.event_name,
          attendedAt: r.attended_at
        })));
      }
    };

    fetchHistory();

    const channel = supabase.channel(`vol_att_history_${volunteerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `scanned_by=eq.${volunteerId}` }, fetchHistory)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [volunteerId]);

  const markTeamAttendance = async (teamId: string, eventId: string) => {
    try {
      const { data: teamRegs } = await supabase.from('registrations').select('*').eq('team_id', teamId).eq('event_id', eventId);
      
      if (teamRegs && teamRegs.length > 0) {
        const memberNames = teamRegs.map(r => r.student_name).join(', ');
        
        for (const reg of teamRegs) {
          if (!reg.attended) {
            const { data, error } = await supabase.rpc('mark_attendance', {
              p_registration_id: reg.id,
              p_scanner_id: volunteerId,
              p_scanner_name: volunteerName,
            });
            if (error) {
              console.error('Error marking team member attendance:', error);
            }
          }
        }
        
        setTeamMembers(teamRegs);
        return memberNames;
      }
      return null;
    } catch (err) {
      console.error('Error marking team attendance:', err);
      return null;
    }
  };

  const handleMarkAttendance = async (registrationId: string) => {
    if (!registrationId) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setTeamMembers([]);

    try {
      // First, get the registration to check for team_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(registrationId);
      
      let query = supabase.from('registrations').select('*');
      if (isUUID) {
        query = query.or(`id.eq.${registrationId},unique_id.eq.${registrationId}`);
      } else {
        query = query.eq('unique_id', registrationId);
      }
      
      const { data: regData, error: fetchError } = await query.maybeSingle();
      
      if (fetchError || !regData) {
        setError('Invalid Pass: Registration not found.');
        setIsProcessing(false);
        return;
      }

      // If it's a team registration, mark all team members
      if (regData.team_id) {
        const memberNames = await markTeamAttendance(regData.team_id, regData.event_id);
        if (memberNames) {
          setSuccess(`Success! Team attendance marked for ${memberNames}`);
        } else {
          setSuccess(`Success! Attendance marked for ${regData.student_name || 'participant'}`);
        }
      } else {
        // Mark single attendance using RPC
        const { data, error: rpcError } = await supabase.rpc('mark_attendance', {
          p_registration_id: regData.id,
          p_scanner_id: volunteerId,
          p_scanner_name: volunteerName,
        });

        if (rpcError) {
          setError('Failed to verify pass. Please try again.');
          setIsProcessing(false);
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
            setIsProcessing(false);
            return;
          }

          if (result?.reason === 'not_found') {
            setError('Invalid Pass: Registration not found.');
            setIsProcessing(false);
            return;
          }

          if (result?.reason === 'unauthorized') {
            setError('You are not allowed to mark attendance.');
            setIsProcessing(false);
            return;
          }

          setError('Could not mark attendance. Please retry.');
          setIsProcessing(false);
          return;
        }

        setSuccess(`Success! Attendance marked for ${result.student_name || 'participant'} - ${result.event_name || 'event'}`);
      }
    } catch (err) {
      setError("Failed to mark attendance. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualId('');
    setError(null);
    setSuccess(null);
    setTeamMembers([]);
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-4 border-b border-gray-200 mb-8">
        <button 
          onClick={() => setMode('scan')}
          className={`pb-3 px-2 text-sm font-bold transition-all relative ${
            mode === 'scan' ? 'text-red-primary' : 'text-gray-400'
          }`}
        >
          Check-In Scanner
          {mode === 'scan' && <motion.div layoutId="vol-att" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-primary" />}
        </button>
        <button 
          onClick={() => setMode('history')}
          className={`pb-3 px-2 text-sm font-bold transition-all relative ${
            mode === 'history' ? 'text-red-primary' : 'text-gray-400'
          }`}
        >
          History ({history.length})
          {mode === 'history' && <motion.div layoutId="vol-att" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-primary" />}
        </button>
      </div>

      {mode === 'scan' ? (
        <div className="max-w-lg mx-auto space-y-6">
          {/* Camera Error Fallback */}
          {cameraError && (
            <div className="card p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Camera Unavailable</p>
                  <p className="text-xs text-amber-600">{cameraError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Scanner or Success/Error State */}
          {!scanResult && !success && !error ? (
            <div className="space-y-8">
              <div className="overflow-hidden rounded-3xl border-4 border-red-primary shadow-2xl bg-black min-h-[300px]">
                <QRScanner 
                  onScanSuccess={(id) => {
                    setScanResult(id);
                    handleMarkAttendance(id);
                  }}
                  onScanError={(err) => {
                    setCameraError(err);
                  }}
                />
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-display font-bold">Scan Participant Pass</h3>
                <p className="text-sm text-gray-500 mt-2">Point the camera at the student's event pass QR code.</p>
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
                      className="btn-primary w-full py-4 text-sm font-bold shadow-xl shadow-red-primary/20 disabled:opacity-50 disabled:grayscale transition-all"
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
                  <p className="text-lg font-bold text-gray-500 uppercase tracking-widest">Processing...</p>
                </div>
              ) : (
                <>
                  {success && (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        <Check size={48} />
                      </div>
                      <h3 className="text-2xl font-display font-bold text-green-600">Attendance Recorded</h3>
                      <p className="text-lg text-gray-600 font-bold">{success}</p>
                      
                      {teamMembers.length > 0 && (
                        <div className="w-full bg-green-50 rounded-xl p-4 mt-4 text-left">
                          <p className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wider">Team Members Marked:</p>
                          <div className="flex flex-wrap gap-2">
                            {teamMembers.map((m: any) => (
                              <span key={m.id} className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-green-700 border border-green-200 shadow-sm">
                                {m.student_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
                  <button onClick={resetScanner} className="btn-primary w-full py-4 text-lg mt-6 shadow-xl shadow-red-primary/10">
                    Scan Next Pass
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-lg mx-auto">
          {history.length === 0 ? (
            <div className="text-center py-24 text-gray-400 card border-dashed">
              <History size={64} className="mx-auto mb-4 opacity-10" />
              <p className="text-lg font-medium opacity-50 tracking-tight">No attendance records yet.</p>
            </div>
          ) : (
            history.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.studentName}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                      {item.eventName} • {item.attendedAt ? new Date(item.attendedAt).toLocaleTimeString() : ''}
                    </p>
                    {item.team_id && (
                      <span className="inline-block mt-1 text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Team</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-1 rounded-lg">Verified</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// --- MESSAGES TAB ---
function MessagesTab({ volunteerId, setNotification }: { volunteerId: string, setNotification: (n: any) => void }) {
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!volunteerId) return;

    const fetchCoordinators = async () => {
      // Get coordinators from events this volunteer is assigned to
      const { data: assignments } = await supabase.from('assignments').select('event_id').contains('user_id', [volunteerId]);
      const eventIds = (assignments || []).map((a: any) => a.event_id);

      if (eventIds.length > 0) {
        // Get coordinators from assignments
        const { data: coordAssignments } = await supabase.from('assignments').select('user_id, event_id').in('event_id', eventIds).eq('role', 'coordinator');
        
        if (coordAssignments && coordAssignments.length > 0) {
          const coordIds = [...new Set(coordAssignments.map((a: any) => a.user_id))];
          const { data: users } = await supabase.from('users').select('*').in('uid', coordIds);
          setCoordinators(users || []);
        }
      }
      setLoading(false);
    };

    fetchCoordinators();
  }, [volunteerId]);

  useEffect(() => {
    if (!selectedCoordinator || !volunteerId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${volunteerId},sender_id.eq.${selectedCoordinator.uid}`)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase.channel(`vol_messages_${selectedCoordinator.uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_id === volunteerId || payload.new.sender_id === selectedCoordinator.uid) {
          setMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedCoordinator, volunteerId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedCoordinator || !volunteerId) return;

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: volunteerId,
        receiver_id: selectedCoordinator.uid,
        event_id: selectedCoordinator.eventId || null,
        content: messageText.trim(),
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      setMessageText('');
      setNotification({ message: 'Message sent!', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Failed to send: ${err.message}`, type: 'error' });
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h3 className="text-2xl font-display font-bold">Message Coordinator</h3>

      {/* Coordinator Selection */}
      {coordinators.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500">No coordinators assigned to your events yet.</p>
        </div>
      ) : !selectedCoordinator ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">Select a coordinator to message:</p>
          {coordinators.map(coord => (
            <button
              key={coord.uid}
              onClick={() => setSelectedCoordinator(coord)}
              className="w-full card p-4 flex items-center gap-4 hover:border-red-primary transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-primary flex items-center justify-center font-bold">
                {coord.name?.charAt(0) || 'C'}
              </div>
              <div>
                <p className="font-bold">{coord.name}</p>
                <p className="text-xs text-gray-500">{coord.email}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Back Button */}
          <button 
            onClick={() => setSelectedCoordinator(null)}
            className="text-sm text-red-primary font-bold flex items-center gap-1 hover:underline"
          >
            <ChevronRight size={16} className="rotate-180" /> Back to Coordinators
          </button>

          {/* Chat Header */}
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-primary flex items-center justify-center font-bold">
              {selectedCoordinator.name?.charAt(0) || 'C'}
            </div>
            <div>
              <p className="font-bold">{selectedCoordinator.name}</p>
              <p className="text-xs text-gray-500">{selectedCoordinator.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="card p-4 space-y-3 max-h-80 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.sender_id === volunteerId ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-xl ${
                    msg.sender_id === volunteerId 
                      ? 'bg-red-primary text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.sender_id === volunteerId ? 'text-white/60' : 'text-gray-400'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <input 
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && messageText.trim()) {
                  handleSendMessage();
                }
              }}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="btn-primary px-4 py-3 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- NOTIFICATIONS TAB ---
function NotificationsTab({ userId, setNotification }: { userId: string, setNotification: (n: any) => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},user_id.eq.all`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) setNotifications(data);
      setLoading(false);
    };

    fetchNotifications();

    const channel = supabase.channel('vol_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleMarkRead = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err: any) {
      setNotification({ message: `Failed: ${err.message}`, type: 'error' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)
        .or(`user_id.eq.${userId},user_id.eq.all`);
      
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setNotification({ message: 'All notifications marked as read.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Failed: ${err.message}`, type: 'error' });
    }
  };

  const handleClearAll = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .or(`user_id.eq.${userId},user_id.eq.all`);
      
      if (error) throw error;
      setNotifications([]);
      setNotification({ message: 'All notifications cleared.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Failed: ${err.message}`, type: 'error' });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-display font-bold">Notifications</h3>
          <p className="text-sm text-gray-500">{unreadCount} unread</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-primary rounded-xl text-xs font-bold hover:bg-red-primary hover:text-white transition-all disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> Mark all read
          </button>
          <button 
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-display font-bold text-gray-400">No Notifications</h3>
          <p className="text-sm text-gray-500 mt-2">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif: any) => (
            <div 
              key={notif.id} 
              className={`card p-4 flex gap-4 items-start relative overflow-hidden transition-all ${
                !notif.read ? 'border-l-4 border-l-red-primary bg-red-50/30' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                notif.type === 'event' ? 'bg-blue-50 text-blue-500' :
                notif.type === 'job' ? 'bg-green-50 text-green-500' :
                'bg-red-50 text-red-primary'
              }`}>
                {notif.type === 'event' ? <Calendar size={18} /> :
                 notif.type === 'job' ? <Award size={18} /> :
                 <Bell size={18} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold">{notif.title || notif.subject || 'Notification'}</h4>
                  <span className="text-[10px] text-gray-400">{new Date(notif.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-600">{notif.message}</p>
                {!notif.read && (
                  <button 
                    onClick={() => handleMarkRead(notif.id)}
                    className="text-[10px] text-red-primary font-bold mt-2 hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- PROFILE TAB ---
function ProfileTab({ volunteer, onSave }: { volunteer: any, onSave: (data: any) => void }) {
  const [localProfile, setLocalProfile] = useState(volunteer);
  const [avatarPreview, setAvatarPreview] = useState(volunteer?.avatar);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalProfile(volunteer);
    setAvatarPreview(volunteer?.avatar);
  }, [volunteer]);

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

  if (!volunteer) return null;

  return (
    <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
      {/* Avatar + Info (col-span-2) */}
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
            src={avatarPreview || "https://picsum.photos/seed/volunteer/200/200"} 
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
        <span className="bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase mt-2">Volunteer</span>
        <p className="text-sm text-gray-500 mb-4 mt-2">{localProfile.college}</p>
        <div className="flex justify-center gap-2">
          <span className="bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold">4.8 ★</span>
          <span className="bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold">Top Volunteer</span>
        </div>
      </div>

      {/* Stats (col-span-2) */}
      <div className="col-span-2 card p-6">
        <h4 className="text-lg font-display font-bold mb-4">Stats</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-mono font-bold text-red-primary">{localProfile.eventsAttended || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Events</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-mono font-bold text-green-600">{localProfile.volunteerHours || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Hours</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-mono font-bold text-amber-500">{localProfile.tasksCompleted || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Tasks</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-mono font-bold text-blue-600">{localProfile.attendeesScanned || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Scanned</p>
          </div>
        </div>
      </div>

      {/* Personal Info (col-span-2) */}
      <div className="col-span-2 card p-6">
        <h4 className="text-lg font-display font-bold mb-4">Personal Info</h4>
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Full Name</label>
            <input 
              type="text" 
              value={localProfile.name || ''} 
              onChange={e => setLocalProfile({...localProfile, name: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Email</label>
            <input 
              type="email" 
              value={localProfile.email || ''} 
              disabled
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-xs outline-none cursor-not-allowed" 
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Phone</label>
            <input 
              type="text" 
              value={localProfile.phone || ''} 
              onChange={e => setLocalProfile({...localProfile, phone: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-red-primary" 
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="btn-primary px-6 py-2 flex items-center gap-2 shadow-lg shadow-red-primary/30">
            <CheckCircle2 size={16} /> Save Changes
          </button>
        </div>
      </div>

      {/* Skills (col-span-2) */}
      <div className="col-span-2 card p-6">
        <h4 className="text-lg font-display font-bold mb-4">Skills & Badges</h4>
        <div className="flex flex-wrap gap-2">
          {['Leadership', 'Communication', 'Technical Support', 'Event Management'].map(s => (
            <span key={s} className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
