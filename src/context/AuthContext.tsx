import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type UserRole = 'student' | 'volunteer' | 'coordinator' | 'head_coordinator' | 'evaluator' | 'super_admin' | 'institution';

export interface User {
  uid: string;
  name: string;
  email: string | null;
  role: UserRole;
  college?: string;
  department?: string;
  year?: string;
  avatar?: string;
  isDemo?: boolean;
  profileCompleted?: boolean;
  projects?: any[];
  workExperience?: any[];
}

interface AuthContextType {
  currentUser: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: UserRole, email: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

const DEMO_USERS: Record<UserRole, { name: string; email: string; college: string; role: UserRole }> = {
  student: { name: 'Demo Student', email: 'student@uniguild.edu', college: 'Sasi Institute of Technology', role: 'student' },
  volunteer: { name: 'Demo Volunteer', email: 'vol@uniguild.edu', college: 'Sasi Institute of Technology', role: 'volunteer' },
  coordinator: { name: 'Demo Coordinator', email: 'event@uniguild.edu', college: 'Sasi Institute of Technology', role: 'coordinator' },
  head_coordinator: { name: 'Demo Head Coordinator', email: 'head@uniguild.edu', college: 'Sasi Institute of Technology', role: 'head_coordinator' },
  evaluator: { name: 'Demo Evaluator', email: 'eval@uniguild.edu', college: 'Sasi Institute of Technology', role: 'evaluator' },
  super_admin: { name: 'Demo Admin', email: 'admin@uniguild.edu', college: 'Sasi Institute of Technology', role: 'super_admin' },
  institution: { name: 'Demo Institution', email: 'inst@uniguild.edu', college: 'Demo University', role: 'institution' },
};

export { DEMO_USERS };

function isAuthLockError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  const message = (e.message || '').toLowerCase();
  return e.name === 'AbortError' || message.includes('lock broken') || message.includes('was not released');
}

function normalizeRole(value: unknown): UserRole {
  const role = String(value || '').toLowerCase();
  if (role === 'student') return 'student';
  if (role === 'volunteer') return 'volunteer';
  if (role === 'coordinator') return 'coordinator';
  if (role === 'head_coordinator') return 'head_coordinator';
  if (role === 'evaluator') return 'evaluator';
  if (role === 'super_admin') return 'super_admin';
  if (role === 'institution') return 'institution';
  return 'student';
}

async function fetchUserProfile(uid: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }
    
    if (!data) return null;
    
    return {
      uid: data.uid,
      name: data.name,
      email: data.email,
      role: normalizeRole(data.role),
      college: data.college,
      department: data.department,
      year: data.year,
      avatar: data.avatar,
      isDemo: false,
      profileCompleted: data.profile_completed ?? false,
      projects: data.projects || [],
      workExperience: data.work_experience || [],
    };
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

async function createUserProfile(user: SupabaseUser): Promise<User> {
  const userMetadata = user.user_metadata || {};
  const intendedRole = normalizeRole(userMetadata.role);
  
  const isStudent = intendedRole === 'student';
  
  const userData = {
    uid: user.id,
    name: userMetadata.full_name || userMetadata.name || user.email?.split('@')[0] || 'User',
    email: user.email,
    role: intendedRole,
    college: userMetadata.college || 'Sasi Institute of Technology',
    department: userMetadata.department || '',
    year: userMetadata.year || '1st Year',
    avatar: userMetadata.avatar_url || userMetadata.picture || null,
    skills: [],
    status: 'active',
    profile_completed: !isStudent,
  };

  try {
    const { error } = await supabase.from('users').upsert(userData, { onConflict: 'uid' });
    if (error) {
      console.error('Error creating profile:', error);
    }
  } catch (err) {
    console.error('Error inserting user profile:', err);
  }

  return {
    uid: user.id,
    name: userData.name,
    email: userData.email,
    role: intendedRole,
    college: userData.college,
    department: userData.department,
    year: userData.year,
    avatar: userData.avatar,
    isDemo: false,
    profileCompleted: !isStudent,
  };
}

async function syncRoleFromMetadata(user: SupabaseUser, profile: User): Promise<User> {
  const metadataRole = normalizeRole(user.user_metadata?.role);
  if (metadataRole === profile.role) return profile;

  try {
    const { error } = await supabase.from('users').update({ role: metadataRole }).eq('uid', user.id);
    if (!error) {
      return { ...profile, role: metadataRole };
    }
  } catch (err) {
    console.error('Role sync error:', err);
  }

  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitializingRef = useRef(false);
  const isAuthChecking = useRef(false);

  const handleSession = async (sessionUser: SupabaseUser | null) => {
    // Avoid double-checking if already in progress
    if (isAuthChecking.current) return;
    
    try {
      isAuthChecking.current = true;
      console.log('AuthContext: Handling session for user:', sessionUser?.email || 'null');
      
      if (sessionUser) {
        setSupabaseUser(sessionUser);

        let profile = await fetchUserProfile(sessionUser.id);
        if (!profile) {
          console.log('AuthContext: Profile not found, creating new profile...');
          profile = await createUserProfile(sessionUser);
        } else {
          console.log('AuthContext: Profile found, syncing role...');
          profile = await syncRoleFromMetadata(sessionUser, profile);
        }

        console.log('AuthContext: Setting current user:', profile);
        setCurrentUser(profile);
      } else {
        setSupabaseUser(null);
        setCurrentUser(null);
      }
    } catch (err) {
      if (!isAuthLockError(err)) {
        console.error('AuthContext: Session handling error:', err);
      }
    } finally {
      isAuthChecking.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    // Supabase Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthContext: Auth event changed:', event, session?.user?.email);
      void handleSession(session?.user || null);
    });

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('AuthContext: Initial session found:', session.user.email);
          await handleSession(session.user);
        } else {
          console.log('AuthContext: No initial session');
          setLoading(false);
        }
      } catch (err) {
        if (!isAuthLockError(err)) {
          console.error('AuthContext: Auth init error:', err);
        }
        setLoading(false);
      }
    };

    initAuth();

    return () => subscription.unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      // onAuthStateChange will set final loading state
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } finally {
      // onAuthStateChange will set final loading state after redirect
    }
  };

  const loginAsDemo = (role: UserRole, email: string) => {
    const demoUser = DEMO_USERS[role];
    if (!demoUser) throw new Error(`Invalid demo role: ${role}`);
    
    // Generate a valid UUID for demo users to avoid database type errors
    const demoUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    setCurrentUser({
      uid: demoUuid,
      name: demoUser.name,
      email,
      role,
      college: demoUser.college,
      isDemo: true,
      profileCompleted: true,
    });
    setSupabaseUser(null);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      if (!isAuthLockError(err)) {
        console.error('Logout error:', err);
      }
    } finally {
      setCurrentUser(null);
      setSupabaseUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, supabaseUser, loading, loginWithEmail, loginWithGoogle, loginAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
