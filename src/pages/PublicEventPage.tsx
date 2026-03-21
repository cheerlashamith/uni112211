
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, MapPin, Clock, Users, 
  Share2, Heart, ArrowRight, CheckCircle2,
  Zap, Award, Globe, Shield, Star,
  ChevronRight, Info, MessageSquare, Mail
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function PublicEventPage() {
  const { id } = useParams();
  const [isLiked, setIsLiked] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (data) setEvent(data);
      setLoading(false);
    };
    fetchEvent();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-red-primary animate-pulse tracking-widest uppercase">Loading Event...</div>;

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
          <Link to="/" className="text-red-primary font-bold">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-primary rounded-xl flex items-center justify-center text-white font-display font-bold text-2xl">U</div>
            <span className="font-display font-bold text-2xl tracking-tight">UniGuild</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-red-primary transition-all">Login</Link>
            <Link to="/register" className="btn-primary py-2 px-6 text-xs">Join UniGuild</Link>
          </div>
        </div>
      </nav>

      {/* Hero / Banner */}
      <header className="pt-20">
        <div className="relative h-[60vh] overflow-hidden">
          <img src="https://picsum.photos/seed/hackathon/1920/1080" className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-wrap gap-3 mb-6">
                <span className="bg-red-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{event.category}</span>
                <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Technical</span>
                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{(event.status || '').toLowerCase() === 'upcoming' ? 'Open for Registration' : event.status}</span>
              </div>
              <h1 className="text-5xl md:text-8xl font-display font-bold leading-none mb-6">{event.name}</h1>
              <div className="flex flex-wrap gap-8 text-sm md:text-lg font-medium opacity-90">
                <div className="flex items-center gap-2"><Calendar size={20} className="text-red-primary" /> {event.date}</div>
                <div className="flex items-center gap-2"><MapPin size={20} className="text-red-primary" /> {event.host || 'University'}, {event.location || 'Campus'}</div>
                <div className="flex items-center gap-2"><Users size={20} className="text-red-primary" /> {event?.slots?.total || event.capacity || 100}+ Participants</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-3 gap-12">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-3xl font-display font-bold mb-6 border-b-2 border-red-primary inline-block">About the Event</h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              {event.description}
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-10">
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <Zap className="text-red-primary mb-4" size={32} />
                <h4 className="font-bold mb-2">48 Hours of Coding</h4>
                <p className="text-sm text-gray-500">Non-stop innovation with mentorship from industry experts.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <Award className="text-red-primary mb-4" size={32} />
                <h4 className="font-bold mb-2">₹1,00,000 Prize Pool</h4>
                <p className="text-sm text-gray-500">Cash prizes, goodies, and internship opportunities for winners.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-display font-bold mb-6 border-b-2 border-red-primary inline-block">Event Timeline</h2>
            <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              {[
                { time: '09:00 AM', day: 'Day 1', title: 'Opening Ceremony', desc: 'Inauguration and problem statement release.' },
                { time: '12:00 PM', day: 'Day 1', title: 'Hacking Begins', desc: 'Teams start building their solutions.' },
                { time: '10:00 AM', day: 'Day 2', title: 'Mentorship Round 1', desc: 'Experts review progress and provide feedback.' },
                { time: '02:00 PM', day: 'Day 3', title: 'Final Pitching', desc: 'Top 10 teams present to the jury.' }
              ].map((item, i) => (
                <div key={i} className="relative pl-12">
                  <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-white border-4 border-red-primary flex items-center justify-center z-10" />
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-1">
                    <span className="text-red-primary font-bold text-sm">{item.time}</span>
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold uppercase text-gray-400">{item.day}</span>
                  </div>
                  <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-display font-bold mb-6 border-b-2 border-red-primary inline-block">Our Sponsors</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-video bg-gray-50 rounded-xl flex items-center justify-center p-6 border border-gray-100 grayscale hover:grayscale-0 transition-all cursor-pointer">
                  <img src={`https://picsum.photos/seed/logo${i}/200/100`} className="max-w-full h-auto opacity-50 hover:opacity-100" alt="" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Sidebar / Registration */}
        <div className="space-y-8">
          <div className="card p-8 sticky top-24 shadow-2xl border-t-4 border-red-primary">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registration Fee</p>
                <p className="text-4xl font-mono font-bold text-red-primary">₹499 <span className="text-sm text-gray-300">/ Team</span></p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={`p-3 rounded-xl border transition-all ${isLiked ? 'bg-red-50 border-red-primary text-red-primary' : 'border-gray-200 text-gray-400 hover:border-red-primary hover:text-red-primary'}`}
                >
                  <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:border-red-primary hover:text-red-primary transition-all">
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Team Size</span>
                <span className="font-bold">2 - 4 Members</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Eligibility</span>
                <span className="font-bold">All College Students</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Deadline</span>
                <span className="font-bold text-red-primary">18-03-2026</span>
              </div>
            </div>

            <Link to="/register" className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 mb-4">
              Register Now <ArrowRight size={20} />
            </Link>
            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">Secure Payment via Razorpay</p>

            <div className="mt-8 pt-8 border-t border-gray-100">
              <h4 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-widest">Organizer</h4>
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-primary font-bold">
                    {(event.coordinator || event.host || 'U').charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{event.coordinator || event.host || 'Event Team'}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Event Coordinator</p>
                  </div>
                  <a href={`mailto:${event.coordinatorEmail || 'support@uniguild.com'}`} className="ml-auto p-2 text-red-primary hover:bg-red-50 rounded-lg transition-all">
                    <Mail size={20} />
                  </a>
                </div>
            </div>
          </div>

          <div className="card p-6 bg-red-50 border-red-100">
            <h4 className="font-bold mb-4 flex items-center gap-2 text-red-primary"><Info size={18} /> Important Notes</h4>
            <ul className="space-y-3">
              {[
                'Bring your own laptops and chargers.',
                'Valid college ID is mandatory for entry.',
                'Accommodation provided for outstation teams.',
                'Food and snacks included in registration.'
              ].map((note, i) => (
                <li key={i} className="flex gap-3 text-xs text-gray-600">
                  <CheckCircle2 size={14} className="text-red-primary flex-shrink-0 mt-0.5" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-red-primary rounded-xl flex items-center justify-center text-white font-display font-bold text-2xl">U</div>
            <span className="font-display font-bold text-2xl tracking-tight">UniGuild</span>
          </div>
          <p className="text-gray-500 max-w-sm mx-auto mb-8">Empowering students through collaboration and innovation. Join the guild today.</p>
          <div className="flex justify-center gap-8 text-sm font-bold text-gray-400 uppercase tracking-widest">
            <Link to="/" className="hover:text-red-primary transition-all">Privacy</Link>
            <Link to="/" className="hover:text-red-primary transition-all">Terms</Link>
            <a href="mailto:support@uniguild.com" className="hover:text-red-primary transition-all">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
