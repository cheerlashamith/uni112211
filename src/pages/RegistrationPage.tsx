import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, Lock, ArrowRight, CheckCircle2, 
  Shield, Zap, Globe, AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
};

export default function RegistrationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading, loginWithGoogle } = useAuth();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!authLoading && currentUser) {
      if (currentUser.role === 'student' && !currentUser.profileCompleted) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    }
  }, [currentUser, authLoading, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const getErrorMessage = (code: string): string => {
    return AUTH_ERROR_MESSAGES[code] || 'An error occurred. Please try again.';
  };

  const handleRegister = async () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      
      if (signUpError) throw signUpError;
      
      const user = data.user;
      if (!user) {
        throw new Error('Registration failed - no user returned');
      }

      const intendedRole = user.user_metadata?.role;
      if (intendedRole === 'student') {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      // Browser will redirect to Google then back to /dashboard
    } catch (err: any) {
      console.error(err);
      const errorCode = err.code || '';
      setError(getErrorMessage(errorCode) || err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Branding & Visual */}
      <div className="hidden lg:flex bg-black relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 mb-20">
            <div className="w-10 h-10 bg-red-primary rounded-xl flex items-center justify-center text-white font-display font-bold text-2xl">U</div>
            <span className="font-display font-bold text-2xl tracking-tight">UniGuild</span>
          </Link>
          <h1 className="text-8xl font-display font-bold leading-[0.85] mb-8">
            Start Your <br />
            <span className="text-red-primary italic">Journey.</span>
          </h1>
          <p className="text-xl opacity-60 max-w-md">
            Join the most powerful university ecosystem. Connect with peers, manage events, and grow your career.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          {[
            { icon: <Zap size={18} />, text: 'Access to 100+ Campus Events' },
            { icon: <Shield size={18} />, text: 'Verified Internship Sentinel' },
            { icon: <Globe size={18} />, text: 'Global Networking Opportunities' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-red-primary/20 flex items-center justify-center text-red-primary">
                {item.icon}
              </div>
              <span className="text-sm font-bold opacity-80">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Decorative Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Right: Registration Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="text-4xl font-display font-bold mb-2">Create Account</h2>
            <p className="text-gray-500">Join UniGuild to get started.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-primary text-sm font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all" 
                  placeholder="name@university.edu" 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              onClick={handleRegister}
              disabled={loading}
              className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={20} />
            </button>
          </div>

          <div className="mt-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400"><span className="bg-white px-4">Or continue with</span></div>
            </div>

            <button 
              onClick={handleSocialLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm disabled:opacity-50"
            >
              <GoogleIcon /> Continue with Google
            </button>
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-red-primary font-bold hover:underline">Sign In</Link>
          </p>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex gap-3">
              <CheckCircle2 size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                After creating your account, you'll be redirected to complete your profile with your college details and skills.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
