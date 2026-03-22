import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, X, Check, Trash2, Clock, AlertCircle, LogOut } from 'lucide-react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
const appLogo = '/uniguild.png';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subItems?: { id: string; label: string }[];
}

interface DashboardShellProps {
  children: React.ReactNode;
  sidebarItems: SidebarItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  roleName: string;
  userName: string;
  userAvatar?: string;
}

interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: 'event' | 'job' | 'certificate' | 'task';
  read: boolean;
  created_at: string;
}

export default function DashboardShell({
  children,
  sidebarItems,
  activeTab,
  onTabChange,
  roleName,
  userName,
  userAvatar = "https://picsum.photos/seed/user/100/100"
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX;
      if (diff > 100 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSidebarOpen]);

  const fetchNotifications = async () => {
    if (!currentUser || currentUser.isDemo) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${currentUser.uid},user_id.eq.all`)
      .order('created_at', { ascending: false });
    if (!error && data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    if (!currentUser || currentUser.isDemo) return;

    fetchNotifications();

    const channel = supabase
      .channel('shell_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.uid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (!currentUser || currentUser.isDemo) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
    fetchNotifications();
  };

  const clearAll = async () => {
    if (!currentUser || currentUser.isDemo) return;
    const ids = notifications.map(n => n.id);
    if (ids.length === 0) return;
    await supabase
      .from('notifications')
      .delete()
      .in('id', ids);
    setNotifications([]);
  };

  const markAsRead = async (id: string) => {
    if (currentUser?.isDemo) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    fetchNotifications();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[199]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Notifications Overlay */}
      {isNotificationsOpen && (
        <div 
          className="fixed inset-0 z-[299]"
          onClick={() => setIsNotificationsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside ref={sidebarRef} className={`
        fixed inset-y-0 left-0 bg-white border-r border-gray-200 z-[200] transition-all duration-300 flex flex-col shadow-xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
      `}>
        
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        
        <div className="p-5 border-b border-red-100 flex items-center justify-between shrink-0 bg-white/90">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={appLogo} alt="UniGuild" className="w-9 h-9 rounded-xl object-cover shrink-0 border border-red-100 shadow-sm" />
            <h1 className={`text-[22px] font-display font-bold text-red-700 tracking-tight transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'lg:opacity-100 lg:w-auto'}`}>
              UniGuild
            </h1>
          </div>
          <button 
            onClick={() => isSidebarOpen ? setIsSidebarOpen(false) : setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-red-100 rounded-lg text-red-300 hover:text-red-primary transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {sidebarItems.map((item) => (
            <div key={item.id} className="space-y-1">
              <div
                onClick={() => {
                  onTabChange(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer transition-all group
                  ${activeTab === item.id || item.subItems?.some(s => s.id === activeTab)
                    ? 'bg-red-primary text-white shadow-lg shadow-red-primary/25' 
                    : 'text-gray-600 hover:bg-red-50 hover:text-red-primary'}
                  ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}
                `}
                title={isCollapsed ? item.label : ''}
              >
                <span className="w-5 flex justify-center shrink-0">{item.icon}</span>
                <span className={`font-bold text-sm transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'lg:opacity-100 lg:w-auto'}`}>
                  {item.label}
                </span>
              </div>
              
              {!isCollapsed && item.subItems && (activeTab === item.id || item.subItems.some(s => s.id === activeTab)) && (
                <div className="ml-9 space-y-1">
                  {item.subItems.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => {
                        onTabChange(sub.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`
                        py-2 px-4 rounded-lg cursor-pointer text-xs font-bold transition-all
                        ${activeTab === sub.id ? 'text-red-primary bg-red-100/70' : 'text-gray-500 hover:text-red-primary hover:bg-red-50'}
                      `}
                    >
                      {sub.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-red-100 bg-gradient-to-b from-white to-red-50 shrink-0">
          <button 
            onClick={handleLogout}
            className={`
              flex items-center gap-3 py-3 px-4 text-gray-600 font-bold rounded-xl hover:bg-red-100 hover:text-red-primary transition-all w-full
              ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}
            `}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={`font-bold text-sm transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'lg:opacity-100 lg:w-auto'}`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-[150] bg-white/95 backdrop-blur-md border-b border-gray-200 h-16 px-4 lg:px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-gray-900 p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center bg-gray-50 rounded-xl px-4 py-2 gap-2 border border-gray-100 focus-within:border-red-primary focus-within:bg-white transition-all">
              <Search size={18} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-transparent border-none outline-none text-sm w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative z-[110]">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Bell size={22} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-primary text-white text-[10px] flex items-center justify-center rounded-full font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[110]"
                  >
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-display font-bold text-gray-900">Notifications</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-red-primary uppercase hover:underline"
                        >
                          Mark all read
                        </button>
                        <button 
                          onClick={clearAll}
                          className="text-[10px] font-bold text-gray-400 uppercase hover:text-red-primary"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                          {notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => markAsRead(notif.id)}
                              className={`p-4 hover:bg-gray-50 transition-all cursor-pointer relative group ${!notif.read ? 'bg-red-50/30' : ''}`}
                            >
                              <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  notif.type === 'event' ? 'bg-blue-50 text-blue-600' :
                                  notif.type === 'job' ? 'bg-green-50 text-green-600' :
                                  notif.type === 'certificate' ? 'bg-purple-50 text-purple-600' :
                                  'bg-orange-50 text-orange-600'
                                }`}>
                                  {notif.type === 'event' ? <Clock size={14} /> :
                                   notif.type === 'job' ? <Search size={14} /> :
                                   notif.type === 'certificate' ? <Check size={14} /> :
                                   <AlertCircle size={14} />}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-xs leading-relaxed ${!notif.read ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                    {notif.message}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    {new Date(notif.created_at).toLocaleString()}
                                  </p>
                                </div>
                                {!notif.read && (
                                  <div className="w-2 h-2 bg-red-primary rounded-full mt-2 shrink-0" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-12 text-center">
                          <Bell size={40} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-sm text-gray-400 font-medium">No notifications yet</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div 
              className="flex items-center gap-3 pl-6 border-l border-gray-200 cursor-pointer group"
              onClick={() => onTabChange('profile')}
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-tight group-hover:text-gray-700 transition-colors">{userName}</p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{roleName}</p>
              </div>
              <img 
                src={userAvatar} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full border-2 border-gray-200 p-0.5 group-hover:scale-110 transition-transform"
              />
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
