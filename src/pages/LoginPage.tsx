import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, Lock, ArrowRight, 
  Zap, AlertCircle, Eye, EyeOff 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Invalid email or password. If you don\'t have an account, please Sign Up first.',
  'Email not confirmed': 'Please confirm your email address before logging in.',
  'User not found': 'No account found with this email address. Please Sign Up first.',
  'Network request failed': 'Network error. Please check your internet connection.',
};

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle, loginAsDemo } = useAuth();
  const DEMO_PASSWORD = 'Demo@12345';

  const getErrorMessage = (code: string): string => {
    return AUTH_ERROR_MESSAGES[code] || 'Login failed. Please check your credentials.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
      // AuthContext will update currentUser, but we can't check it immediately here 
      // due to state update cycle. The useEffect in ProtectedRoute or a small delay 
      // in AuthContext navigation would handle this. 
      // For now, let's just go to dashboard, and ProtectedRoute will catch it.
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError('Invalid email or password. If you do not have an account, please sign up first.');
      } else {
        setError(msg || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      const errorCode = err.code || '';
      setError(getErrorMessage(errorCode) || 'Login with Google failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    { role: 'student' as UserRole, label: 'Student', email: 'student@uniguild.edu', icon: '🎓', path: 'student' },
    { role: 'volunteer' as UserRole, label: 'Volunteer', email: 'volunteer@uniguild.edu', icon: '🤝', path: 'volunteer' },
    { role: 'coordinator' as UserRole, label: 'Event Coord', email: 'coordinator@uniguild.edu', icon: '📅', path: 'eventcoordinator' },
    { role: 'head_coordinator' as UserRole, label: 'Head Coord', email: 'head@uniguild.edu', icon: '👑', path: 'headcoordinator' },
    { role: 'evaluator' as UserRole, label: 'Evaluator', email: 'evaluator@uniguild.edu', icon: '⚖️', path: 'evaluator' },
    { role: 'super_admin' as UserRole, label: 'Super Admin', email: 'admin@uniguild.edu', icon: '🛡️', path: 'superadmin' },
  ];

  const handleDemoLogin = (cred: typeof demoCredentials[0]) => {
    try {
      loginAsDemo(cred.role, cred.email);
      navigate(`/dashboard/${cred.path}`);
    } catch (err: any) {
      setError(`Demo login failed. Please try again.`);
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
      <div className="hidden lg:flex bg-gray-50 relative overflow-hidden flex-col justify-between p-12 text-gray-900 border-r border-gray-100">
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 mb-20">
            <div className="w-10 h-10 bg-red-primary rounded-xl flex items-center justify-center text-white font-display font-bold text-2xl">U</div>
            <span className="font-display font-bold text-2xl tracking-tight">UniGuild</span>
          </Link>
          <h1 className="text-8xl font-display font-bold leading-[0.85] mb-8">
            Welcome <br />
            <span className="text-red-primary">Back.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-md">
            Your gateway to university events, professional growth, and campus collaboration.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-primary flex items-center justify-center text-white">
              <Zap size={24} />
            </div>
            <div>
              <p className="font-bold">50,000+ Students</p>
              <p className="text-xs text-gray-500">Already joined the ecosystem</p>
            </div>
          </div>
        </div>

        {/* Decorative Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-red-primary/10 rounded-full blur-[80px]" />
      </div>

      {/* Right: Login Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-4xl font-display font-bold mb-2">Login to Account</h2>
            <p className="text-gray-500">Enter your credentials to access your dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-primary text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                {error}
                {(error.includes("don't have an account") || error.includes('No account found')) && (
                  <span> <Link to="/register" className="font-bold hover:underline">Sign Up</Link> now!</span>
                )}
              </div>
            </div>
          )}

          <div className="mb-8">
            <button 
              onClick={() => handleDemoLogin(demoCredentials[0])}
              disabled={loading}
              className="w-full py-4 bg-red-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-red-primary/20 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap size={20} fill="currentColor" />
              Quick Demo Access (Student)
            </button>
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 text-center">Other Roles</p>
              <p className="text-[10px] text-center text-gray-500 mb-3">Common demo password: <span className="font-bold text-red-primary">{DEMO_PASSWORD}</span></p>
              <div className="grid grid-cols-3 gap-2">
                {demoCredentials.slice(1).map(cred => (
                  <button
                    key={cred.role}
                    onClick={() => handleDemoLogin(cred)}
                    disabled={loading}
                    className="flex flex-col items-center gap-1 p-2 bg-white border border-gray-100 rounded-xl hover:border-red-primary transition-all disabled:opacity-50"
                  >
                    <span className="text-lg">{cred.icon}</span>
                    <span className="text-[8px] font-bold uppercase truncate w-full text-center">{cred.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all" 
                    placeholder="name@university.edu" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block tracking-widest">Password</label>
                  <a href="mailto:support@uniguild.com?subject=Password%20Reset%20Request" className="text-[10px] font-bold text-red-primary uppercase hover:underline">Forgot?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all" 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-primary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 accent-red-primary rounded" id="remember" />
              <label htmlFor="remember" className="text-sm text-gray-600 font-medium">Remember me for 30 days</label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400"><span className="bg-white px-4">Or continue with</span></div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm disabled:opacity-50"
              >
                <GoogleIcon /> Continue with Google
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            Don't have an account? <Link to="/register" className="text-red-primary font-bold hover:underline">Create Account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
