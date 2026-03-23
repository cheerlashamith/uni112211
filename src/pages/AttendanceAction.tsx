
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AttendanceAction() {
  const [searchParams] = useSearchParams();
  const regId = searchParams.get('id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthorized'>('loading');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!regId) {
      setStatus('error');
      setMessage('Invalid Registration ID');
      return;
    }

    if (!currentUser) {
      setStatus('unauthorized');
      setMessage('You must be logged in as a Coordinator, Volunteer, or Admin to mark attendance.');
      return;
    }

    // Check if user has permission (optional client-side check, RPC will check too)
    const allowedRoles = ['coordinator', 'head_coordinator', 'volunteer', 'super_admin'];
    if (!allowedRoles.includes(currentUser.role)) {
      setStatus('unauthorized');
      setMessage('You do not have permission to mark attendance. Please use a Staff account.');
      return;
    }

    const markAttendance = async () => {
      try {
        const { data, error } = await supabase.rpc('mark_attendance', {
          p_registration_id: regId,
          p_scanner_id: currentUser.uid,
          p_scanner_name: currentUser.name
        });

        if (error) throw error;

        if (data.ok) {
          setStatus('success');
          setDetails(data);
        } else {
          setStatus('error');
          if (data.reason === 'already_marked') {
            setMessage(`${data.student_name} is already marked as Present.`);
            setDetails(data);
          } else if (data.reason === 'not_found') {
            setMessage('Registration not found. Please check the ID.');
          } else {
            setMessage(data.reason || 'Failed to mark attendance');
          }
        }
      } catch (err: any) {
        console.error('Error marking attendance:', err);
        setStatus('error');
        setMessage(err.message || 'An unexpected error occurred');
      }
    };

    markAttendance();
  }, [regId, currentUser, authLoading]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="p-8">
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center py-12"
              >
                <Loader2 className="w-16 h-16 text-red-primary animate-spin mb-4" />
                <h2 className="text-xl font-display font-bold text-gray-900">Processing Attendance...</h2>
                <p className="text-sm text-gray-500 mt-2">Connecting to UniGuild servers</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={48} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Attendance Marked!</h2>
                <div className="bg-green-50 rounded-2xl p-6 w-full space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-green-700 font-bold uppercase tracking-widest">Student</span>
                    <span className="font-bold text-gray-900">{details?.student_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-green-700 font-bold uppercase tracking-widest">Event</span>
                    <span className="font-bold text-gray-900">{details?.event_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-green-700 font-bold uppercase tracking-widest">Time</span>
                    <span className="font-bold text-gray-900">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary w-full py-4 mt-8 rounded-2xl shadow-xl shadow-red-primary/20"
                >
                  Return to Dashboard
                </button>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                  <XCircle size={48} className="text-red-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Verification Failed</h2>
                <p className="text-sm text-gray-500 mb-6 px-4">{message}</p>
                
                {details?.reason === 'already_marked' && (
                  <div className="bg-amber-50 rounded-2xl p-6 w-full text-left space-y-2 mb-6 border border-amber-100">
                    <p className="text-amber-800 text-xs font-bold uppercase">Self-Check</p>
                    <p className="text-sm text-gray-700"><strong>{details.student_name}</strong> participated in <strong>{details.event_name}</strong>.</p>
                    <p className="text-[10px] text-gray-500">Last scanned at: {new Date(details.attended_at).toLocaleString()}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn-primary w-full py-4 rounded-2xl"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="text-sm font-bold text-gray-400 hover:text-red-primary transition-colors"
                  >
                    Go to Home
                  </button>
                </div>
              </motion.div>
            )}

            {status === 'unauthorized' && (
              <motion.div 
                key="unauthorized"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                  <ShieldAlert size={48} className="text-amber-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Authentication Required</h2>
                <p className="text-sm text-gray-500 mb-8 px-4">{message}</p>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => navigate('/login', { state: { returnTo: window.location.pathname + window.location.search } })}
                    className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                  >
                    <LogIn size={20} /> Login as Staff
                  </button>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-4">
                    Students cannot mark their own attendance
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
