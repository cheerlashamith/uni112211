
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, Award, Bell, User, 
  Search, Filter, Eye, ExternalLink, Github, Globe, 
  CheckCircle2, AlertCircle, Clock, Calendar, Users,
  Edit, Trash2, Download, Plus, X, Camera, BookOpen,
  TrendingUp, Mail, XCircle, Send, Star, Linkedin
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'queue', label: 'Judging Queue', icon: <ClipboardList size={20} /> },
  { id: 'scores', label: 'My Scores', icon: <Award size={20} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
];

export default function EvaluatorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [evaluatorProfile, setEvaluatorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      if (!loading) navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      const { data: profile } = await supabase.from('users').select('*').eq('uid', currentUser.uid).single();
      if (profile) {
        setEvaluatorProfile({ ...profile, uid: profile.uid || profile.id });
      }
      setLoading(false);
    };

    fetchProfile();

    const channel = supabase.channel(`evaluator_profile_${currentUser.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `uid=eq.${currentUser.uid}` }, fetchProfile)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
        skills: updatedProfile.skills,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('users').update(supabaseData).eq('uid', currentUser.uid);
      if (error) {
        setNotification({ message: `Profile update failed: ${error.message}`, type: 'error' });
        return;
      }
      setEvaluatorProfile({ ...evaluatorProfile, ...updatedProfile });
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
      case 'overview': return <OverviewTab evaluatorId={evaluatorProfile?.id || evaluatorProfile?.uid} />;
      case 'queue': return <JudgingQueueTab evaluatorId={evaluatorProfile?.id || evaluatorProfile?.uid} setNotification={setNotification} />;
      case 'scores': return <MyScoresTab evaluatorId={evaluatorProfile?.id || evaluatorProfile?.uid} setNotification={setNotification} />;
      case 'notifications': return <NotificationsTab userId={evaluatorProfile?.id || evaluatorProfile?.uid} setNotification={setNotification} />;
      case 'profile': return <ProfileTab evaluator={evaluatorProfile} onSave={handleSaveProfile} />;
      default: return <OverviewTab evaluatorId={evaluatorProfile?.id || evaluatorProfile?.uid} />;
    }
  };

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      roleName="Evaluator"
      userName={evaluatorProfile?.name || "Evaluator"}
      userAvatar={evaluatorProfile?.avatar}
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
function OverviewTab({ evaluatorId }: { evaluatorId: string }) {
  const [stats, setStats] = useState({
    assignedEvents: 0,
    pendingSubmissions: 0,
    scoredSubmissions: 0,
    avgScore: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!evaluatorId) return;

    const fetchStats = async () => {
      // Get assigned events
      const { data: assignments } = await supabase.from('assignments').select('*').eq('user_id', evaluatorId).eq('role', 'evaluator');
      const eventIds = (assignments || []).map((a: any) => a.event_id);
      const assignedEvents = eventIds.length;

      // Get submissions for these events
      let pendingSubmissions = 0;
      let scoredSubmissions = 0;

      if (eventIds.length > 0) {
        const { data: submissions } = await supabase.from('submissions').select('*').in('event_id', eventIds);
        const { data: scores } = await supabase.from('scores').select('*').eq('evaluator_id', evaluatorId);

        const scoredSubmissionIds = new Set((scores || []).map((s: any) => s.submission_id));
        pendingSubmissions = (submissions || []).filter((s: any) => !scoredSubmissionIds.has(s.id)).length;
        scoredSubmissions = scores?.length || 0;
      }

      // Calculate average score
      let avgScore = 0;
      const { data: allScores } = await supabase.from('scores').select('score').eq('evaluator_id', evaluatorId);
      if (allScores && allScores.length > 0) {
        avgScore = Math.round(allScores.reduce((acc: number, s: any) => acc + s.score, 0) / allScores.length);
      }

      setStats({ assignedEvents, pendingSubmissions, scoredSubmissions, avgScore });
    };

    fetchStats();

    const channel = supabase.channel('evaluator_overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `evaluator_id=eq.${evaluatorId}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `user_id=eq.${evaluatorId}` }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [evaluatorId]);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Welcome Banner */}
      <div className="col-span-4 bg-gradient-to-r from-red-primary to-red-dark rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight mb-1">Evaluator Dashboard</h2>
            <p className="opacity-90 text-sm">Review and score hackathon submissions</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/20 border border-white/30 px-4 py-2 rounded-lg text-xs font-bold">
              <Star size={14} className="inline mr-1" /> {stats.avgScore > 0 ? `${stats.avgScore}% Avg Score` : 'No scores yet'}
            </div>
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
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <ClipboardList size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{stats.pendingSubmissions}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Pending Submissions</div>
        </div>
      </div>

      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{stats.scoredSubmissions}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Scored Submissions</div>
        </div>
      </div>

      <div className="col-span-2 card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Award size={24} />
        </div>
        <div>
          <div className="text-2xl font-mono font-bold">{stats.avgScore > 0 ? `${stats.avgScore}%` : '-'}</div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Average Score Given</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="col-span-4 card p-6">
        <h3 className="text-lg font-display font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4">
          <a href="#queue" className="p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-all text-center">
            <ClipboardList size={24} className="mx-auto text-red-primary mb-2" />
            <p className="text-sm font-bold text-gray-700">Review Queue</p>
            <p className="text-[10px] text-gray-500">{stats.pendingSubmissions} pending</p>
          </a>
          <a href="#scores" className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all text-center">
            <Award size={24} className="mx-auto text-green-600 mb-2" />
            <p className="text-sm font-bold text-gray-700">My Scores</p>
            <p className="text-[10px] text-gray-500">{stats.scoredSubmissions} submitted</p>
          </a>
          <a href="#notifications" className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all text-center">
            <Bell size={24} className="mx-auto text-blue-600 mb-2" />
            <p className="text-sm font-bold text-gray-700">Notifications</p>
            <p className="text-[10px] text-gray-500">Stay updated</p>
          </a>
          <a href="#profile" className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all text-center">
            <User size={24} className="mx-auto text-purple-600 mb-2" />
            <p className="text-sm font-bold text-gray-700">Profile</p>
            <p className="text-[10px] text-gray-500">Manage settings</p>
          </a>
        </div>
      </div>

      {/* Scoring Guidelines */}
      <div className="col-span-4 card p-6">
        <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <Star size={18} className="text-red-primary" /> Scoring Guidelines
        </h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-mono font-bold text-red-primary">90-100</p>
            <p className="text-xs font-bold text-gray-600 mt-1">Exceptional</p>
            <p className="text-[10px] text-gray-400">Outstanding submission</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-mono font-bold text-green-600">70-89</p>
            <p className="text-xs font-bold text-gray-600 mt-1">Excellent</p>
            <p className="text-[10px] text-gray-400">Above expectations</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-mono font-bold text-amber-500">50-69</p>
            <p className="text-xs font-bold text-gray-600 mt-1">Good</p>
            <p className="text-[10px] text-gray-400">Meets requirements</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-mono font-bold text-gray-500">0-49</p>
            <p className="text-xs font-bold text-gray-600 mt-1">Needs Work</p>
            <p className="text-[10px] text-gray-400">Below expectations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- JUDGING QUEUE TAB ---
function JudgingQueueTab({ evaluatorId, setNotification }: { evaluatorId: string, setNotification: (n: any) => void }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [scoring, setScoring] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!evaluatorId) return;

    const fetchData = async () => {
      // Get assigned events
      const { data: assignments } = await supabase.from('assignments').select('event_id').eq('user_id', evaluatorId).eq('role', 'evaluator');
      const eventIds = (assignments || []).map((a: any) => a.event_id);

      if (eventIds.length > 0) {
        // Get events
        const { data: eventsData } = await supabase.from('events').select('*').in('id', eventIds);
        if (eventsData) setEvents(eventsData);

        // Get submissions with student info
        const { data: submissionsData } = await supabase.from('submissions').select('*').in('event_id', eventIds).order('submitted_at', { ascending: false });
        
        // Get scores for these submissions
        const { data: scoresData } = await supabase.from('scores').select('*').eq('evaluator_id', evaluatorId);
        const scoredMap = new Map((scoresData || []).map((s: any) => [s.submission_id, s]));

        // Get student names
        const studentIds = [...new Set((submissionsData || []).map((s: any) => s.student_id).filter(Boolean))];
        let studentNames: Record<string, string> = {};
        if (studentIds.length > 0) {
          const { data: students } = await supabase.from('users').select('uid, name, email').in('uid', studentIds);
          studentNames = Object.fromEntries((students || []).map((s: any) => [s.uid, s.name || s.email?.split('@')[0] || 'Unknown']));
        }

        const enriched = (submissionsData || []).map((s: any) => ({
          ...s,
          studentName: studentNames[s.student_id] || 'Unknown',
          event: eventsData?.find((e: any) => e.id === s.event_id),
          existingScore: scoredMap.get(s.id)
        }));

        setSubmissions(enriched);
      }
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel('judging_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `evaluator_id=eq.${evaluatorId}` }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [evaluatorId]);

  const handleScore = async () => {
    if (!selectedSubmission || score < 0 || score > 100) return;

    setScoring(true);
    try {
      const existingScore = selectedSubmission.existingScore;
      
      if (existingScore) {
        // Update existing score
        const { error } = await supabase.from('scores').update({
          score,
          feedback,
          scored_at: new Date().toISOString()
        }).eq('id', existingScore.id);

        if (error) throw error;
      } else {
        // Insert new score
        const { error } = await supabase.from('scores').insert({
          submission_id: selectedSubmission.id,
          evaluator_id: evaluatorId,
          event_id: selectedSubmission.event_id,
          score,
          feedback,
          scored_at: new Date().toISOString()
        });

        if (error) throw error;
      }

      setNotification({ message: 'Score submitted successfully!', type: 'success' });
      setSelectedSubmission(null);
      setScore(0);
      setFeedback('');
      
      // Refresh submissions
      const { data: scoresData } = await supabase.from('scores').select('*').eq('evaluator_id', evaluatorId);
      const scoredMap = new Map((scoresData || []).map((s: any) => [s.submission_id, s]));
      setSubmissions((prev: any[]) => prev.map((s: any) => ({ ...s, existingScore: scoredMap.get(s.id) })));
    } catch (err: any) {
      setNotification({ message: `Failed to submit score: ${err.message}`, type: 'error' });
    } finally {
      setScoring(false);
    }
  };

  const filteredSubmissions = selectedEvent === 'all' 
    ? submissions.filter((s: any) => !s.existingScore)
    : submissions.filter((s: any) => s.event_id === selectedEvent && !s.existingScore);

  const pendingCount = submissions.filter((s: any) => !s.existingScore).length;

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading submissions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold">Judging Queue</h3>
          <p className="text-sm text-gray-500">{pendingCount} submissions pending review</p>
        </div>
        <select 
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:border-red-primary"
        >
          <option value="all">All Events</option>
          {events.map((e: any) => (
            <option key={e.id} value={e.id}>{e.title || e.name}</option>
          ))}
        </select>
      </div>

      {/* Submissions Grid */}
      {filteredSubmissions.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-green-300 mb-4" />
          <h3 className="text-xl font-display font-bold text-gray-400">All Caught Up!</h3>
          <p className="text-sm text-gray-500 mt-2">No pending submissions to review.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubmissions.map((sub: any) => (
            <div key={sub.id} className="card p-6 hover:border-red-primary transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-red-50 text-red-primary rounded-xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold uppercase">Pending</span>
              </div>
              
              <h4 className="text-lg font-bold mb-1">{sub.team_id ? `Team: ${sub.team_id}` : sub.studentName}</h4>
              <p className="text-xs text-gray-500 mb-3">{sub.event?.title || sub.event?.name || 'Unknown Event'} • lead by {sub.studentName}</p>
              
              <div className="space-y-2 mb-4">
                {sub.idea && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    <span className="font-bold">Idea:</span> {sub.idea}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {sub.github_repo && (
                    <a href={sub.github_repo} target="_blank" rel="noopener noreferrer" 
                       className="text-[10px] bg-gray-100 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-200">
                      <Github size={10} /> GitHub
                    </a>
                  )}
                  {sub.live_link && (
                    <a href={sub.live_link} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] bg-gray-100 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-200">
                      <Globe size={10} /> Live Demo
                    </a>
                  )}
                  {sub.video_url && (
                    <a href={sub.video_url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] bg-gray-100 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-200">
                      <ExternalLink size={10} /> Video
                    </a>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-4">
                <Clock size={10} /> {new Date(sub.submitted_at).toLocaleDateString()}
              </p>

              <button 
                onClick={() => {
                  setSelectedSubmission(sub);
                  setScore(sub.existingScore?.score || 0);
                  setFeedback(sub.existingScore?.feedback || '');
                }}
                className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-2"
              >
                <Edit size={14} /> {sub.existingScore ? 'Edit Score' : 'Score Now'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scoring Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedSubmission(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">Score Submission</h3>
                <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-red-primary">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-red-50 text-red-primary rounded-lg flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="font-bold">{selectedSubmission.team_id ? `Team: ${selectedSubmission.team_id}` : selectedSubmission.studentName}</p>
                    <p className="text-xs text-gray-500">{selectedSubmission.event?.title || selectedSubmission.event?.name} • Lead: {selectedSubmission.studentName}</p>
                  </div>
                </div>
                {selectedSubmission.idea && (
                  <p className="text-sm text-gray-600 mt-2 p-2 bg-white rounded border border-gray-100">
                    <span className="font-bold text-gray-900">Project:</span> {selectedSubmission.idea}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Score (0-100)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      className="flex-1 accent-red-primary"
                    />
                    <div className="w-16 h-12 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xl font-mono font-bold text-red-primary">{score}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px] text-gray-400 mt-1">
                    <span>Poor</span>
                    <span>Average</span>
                    <span>Excellent</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Feedback</label>
                  <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide constructive feedback for the team..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary h-32 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedSubmission(null)} className="btn-secondary flex-1 py-3">Cancel</button>
                <button 
                  onClick={handleScore}
                  disabled={scoring}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {scoring ? 'Submitting...' : <><CheckCircle2 size={16} /> Submit Score</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- MY SCORES TAB ---
function MyScoresTab({ evaluatorId, setNotification }: { evaluatorId: string, setNotification: (n: any) => void }) {
  const [scores, setScores] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [editingScore, setEditingScore] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!evaluatorId) return;

    const fetchData = async () => {
      const { data: scoresData } = await supabase
        .from('scores')
        .select('*')
        .eq('evaluator_id', evaluatorId)
        .neq('status', 'archived')
        .order('scored_at', { ascending: false });
      
      // Get submission and student info
      const submissionIds = (scoresData || []).map((s: any) => s.submission_id);
      const eventIds = [...new Set((scoresData || []).map((s: any) => s.event_id).filter(Boolean))];

      let submissions: Record<string, any> = {};
      let students: Record<string, string> = {};

      if (submissionIds.length > 0) {
        const { data: subsData } = await supabase.from('submissions').select('*').in('id', submissionIds);
        submissions = Object.fromEntries((subsData || []).map((s: any) => [s.id, s]));

        const studentIds = [...new Set((subsData || []).map((s: any) => s.student_id).filter(Boolean))];
        if (studentIds.length > 0) {
          const { data: studentsData } = await supabase.from('users').select('uid, name, email').in('uid', studentIds);
          students = Object.fromEntries((studentsData || []).map((s: any) => [s.uid, s.name || s.email?.split('@')[0] || 'Unknown']));
        }
      }

      if (eventIds.length > 0) {
        const { data: eventsData } = await supabase.from('events').select('*').in('id', eventIds);
        setEvents(eventsData || []);
      }

      const enriched = (scoresData || []).map((s: any) => ({
        ...s,
        studentName: students[submissions[s.submission_id]?.student_id] || 'Unknown',
        idea: submissions[s.submission_id]?.idea || '',
        github_repo: submissions[s.submission_id]?.github_repo || '',
        event: events.find((e: any) => e.id === s.event_id) || { title: 'Unknown Event' }
      }));

      setScores(enriched);
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel('my_scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `evaluator_id=eq.${evaluatorId}` }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [evaluatorId]);

  const handleUpdateScore = async () => {
    if (!editingScore || score < 0 || score > 100) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('scores').update({
        score,
        feedback,
        scored_at: new Date().toISOString()
      }).eq('id', editingScore.id);

      if (error) throw error;

      setNotification({ message: 'Score updated successfully!', type: 'success' });
      setEditingScore(null);
      setScores((prev: any[]) => prev.map((s: any) => s.id === editingScore.id ? { ...s, score, feedback } : s));
    } catch (err: any) {
      setNotification({ message: `Failed to update score: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    try {
      const { error } = await supabase.from('scores').delete().eq('id', scoreId);
      if (error) throw error;
      setScores((prev: any[]) => prev.filter((s: any) => s.id !== scoreId));
      setNotification({ message: 'Score deleted successfully!', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Failed to delete score: ${err.message}`, type: 'error' });
    }
  };

  const handleClearAllScores = async () => {
    if (scores.length === 0) return;
    try {
      const { error } = await supabase
        .from('scores')
        .update({ status: 'archived' })
        .in('id', scores.map(s => s.id));
      
      if (error) {
        setNotification({ message: `Failed to clear scores: ${error.message}`, type: 'error' });
        return;
      }
      setScores([]);
      setNotification({ message: 'All scores cleared from your view', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Failed to clear scores', type: 'error' });
    }
  };

  const filteredScores = selectedEvent === 'all' 
    ? scores 
    : scores.filter((s: any) => s.event_id === selectedEvent);

  const avgScore = filteredScores.length > 0 
    ? Math.round(filteredScores.reduce((acc: number, s: any) => acc + s.score, 0) / filteredScores.length) 
    : 0;

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading scores...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold">My Scores</h3>
          <p className="text-sm text-gray-500">{filteredScores.length} submissions scored</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleClearAllScores}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-400 hover:text-red-primary flex items-center gap-1 transition-colors"
          >
            <Trash2 size={14} /> Clear All
          </button>
          <div className="bg-red-50 px-4 py-2 rounded-xl text-center">
            <p className="text-lg font-mono font-bold text-red-primary">{avgScore}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold">Avg Score</p>
          </div>
          <select 
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:border-red-primary"
          >
            <option value="all">All Events</option>
            {events.map((e: any) => (
              <option key={e.id} value={e.id}>{e.title || e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scores Table */}
      {filteredScores.length === 0 ? (
        <div className="card p-12 text-center">
          <Award size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-display font-bold text-gray-400">No Scores Yet</h3>
          <p className="text-sm text-gray-500 mt-2">Start scoring submissions in the Judging Queue.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Student</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Event</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Score</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredScores.map((score: any) => (
                  <tr key={score.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-50 text-red-primary rounded-full flex items-center justify-center font-bold text-xs">
                          {score.studentName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{score.studentName}</p>
                          {score.idea && (
                            <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{score.idea}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">{score.event?.title || score.event?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${
                        score.score >= 90 ? 'bg-green-50 text-green-600' :
                        score.score >= 70 ? 'bg-blue-50 text-blue-600' :
                        score.score >= 50 ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-primary'
                      }`}>
                        {score.score}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{new Date(score.scored_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingScore(score);
                            setScore(score.score);
                            setFeedback(score.feedback || '');
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteScore(score.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Score Modal */}
      <AnimatePresence>
        {editingScore && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditingScore(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">Edit Score</h3>
                <button onClick={() => setEditingScore(null)} className="text-gray-400 hover:text-red-primary">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Score (0-100)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      className="flex-1 accent-red-primary"
                    />
                    <div className="w-16 h-12 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xl font-mono font-bold text-red-primary">{score}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Feedback</label>
                  <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-red-primary h-32 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditingScore(null)} className="btn-secondary flex-1 py-3">Cancel</button>
                <button 
                  onClick={handleUpdateScore}
                  disabled={saving}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : <><CheckCircle2 size={16} /> Save Changes</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

    const channel = supabase.channel('evaluator_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleMarkRead = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
      setNotifications((prev: any[]) => prev.map((n: any) => n.id === id ? { ...n, read: true } : n));
    } catch (err: any) {
      setNotification({ message: `Failed to mark as read: ${err.message}`, type: 'error' });
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
      setNotifications((prev: any[]) => prev.map((n: any) => ({ ...n, read: true })));
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

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading notifications...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

// --- PROFILE TAB - BENTO STYLE ---
function ProfileTab({ evaluator, onSave }: { evaluator: any, onSave: (data: any) => void }) {
  const [localProfile, setLocalProfile] = useState(evaluator);
  const [newSkill, setNewSkill] = useState('');
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState(evaluator?.avatar);

  useEffect(() => {
    setLocalProfile(evaluator);
    setAvatarPreview(evaluator?.avatar);
  }, [evaluator]);

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

  if (!evaluator) return null;

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
            src={avatarPreview || "https://picsum.photos/seed/evaluator/200/200"} 
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
        <span className="bg-red-50 text-red-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase mt-2">Evaluator</span>
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
        </div>
      </div>

      {/* ROW 1: Evaluator Stats (col-span-1) */}
      <div className="col-span-1 card p-6 flex flex-col items-center">
        <h4 className="text-lg font-display font-bold mb-4 flex items-center gap-2 self-start">
          <TrendingUp size={16} className="text-red-primary" /> Stats
        </h4>
        <div className="grid grid-cols-2 gap-3 w-full text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-red-primary">{localProfile.eventsJudged || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Events Judged</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-green-600">{localProfile.submissionsScored || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Scored</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-amber-500">{localProfile.avgScore || 0}</p>
            <p className="text-[8px] text-gray-400 uppercase">Avg Score</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-blue-600">{localProfile.rating || 4.8}</p>
            <p className="text-[8px] text-gray-400 uppercase">Rating</p>
          </div>
        </div>
      </div>

      {/* ROW 2: Skills (col-span-2) */}
      <div className="col-span-2 card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-display font-bold flex items-center gap-2">
            <Award size={16} className="text-red-primary" /> Expertise
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
            placeholder="Add expertise..."
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
            placeholder="Tell us about your judging expertise..." 
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
