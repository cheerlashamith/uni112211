import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Mail, School, Phone, FileText, 
  Github, Linkedin, Globe, Upload, XCircle, Plus,
  CheckCircle2, AlertCircle, ArrowRight, BookOpen, Briefcase, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

export default function ProfileCompletionPage() {
  const { currentUser, supabaseUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    college: currentUser?.college || 'Sasi Institute of Technology',
    department: currentUser?.department || '',
    year: currentUser?.year || '1st Year',
    phone: '',
    bio: '',
    skills: [] as string[],
    github: '',
    linkedin: '',
    website: '',
    resumeUrl: '',
    projects: [] as any[],
    workExperience: [] as any[],
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    if (currentUser.role !== 'student') {
      navigate('/dashboard');
      return;
    }
    
    if (currentUser.profileCompleted) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    });
  };
  
  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { name: '', description: '', link: '' }]
    });
  };
  
  const removeProject = (index: number) => {
    const newProjects = [...formData.projects];
    newProjects.splice(index, 1);
    setFormData({ ...formData, projects: newProjects });
  };
  
  const addExperience = () => {
    setFormData({
      ...formData,
      workExperience: [...formData.workExperience, { company: '', role: '', duration: '', description: '' }]
    });
  };
  
  const removeExperience = (index: number) => {
    const newExp = [...formData.workExperience];
    newExp.splice(index, 1);
    setFormData({ ...formData, workExperience: newExp });
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabaseUser) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${supabaseUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      setFormData({ ...formData, resumeUrl: urlData.publicUrl });
    } catch (err: any) {
      console.error('Resume upload error:', err);
      setError('Failed to upload resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser || !supabaseUser) return;
    
    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: any = {
        name: formData.name.trim(),
        college: formData.college,
        department: formData.department,
        year: formData.year,
        phone: formData.phone,
        bio: formData.bio,
        skills: formData.skills,
        github: formData.github,
        linkedin: formData.linkedin,
        website: formData.website,
        resume_url: formData.resumeUrl,
        projects: formData.projects,
        work_experience: formData.workExperience,
        profile_completed: true,
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('uid', supabaseUser.id);

      if (updateError) throw updateError;

      // Refresh user context to update profileCompleted status
      await refreshUser();

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Profile completion error:', err);
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !supabaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-8 bg-gradient-to-r from-red-primary to-red-dark text-white">
            <h1 className="text-3xl font-display font-bold mb-2">Complete Your Profile</h1>
            <p className="opacity-90">Almost there! Fill in the details below to unlock all features.</p>
            <div className="flex gap-2 mt-6">
              <div className="h-2 flex-1 rounded-full bg-white/30" />
              <div className="h-2 flex-1 rounded-full bg-white/30" />
            </div>
          </div>

          <div className="p-8 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-primary text-sm font-medium">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-600 text-sm font-medium">
                <CheckCircle2 size={18} />
                Profile completed! Redirecting to dashboard...
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all" 
                    placeholder="John Doe" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    value={currentUser.email || ''}
                    disabled
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 border border-gray-200 rounded-xl outline-none cursor-not-allowed text-gray-500" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">College</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select 
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all appearance-none"
                  >
                    <option>Sasi Institute of Technology</option>
                    <option>BITS Pilani</option>
                    <option>IIT Madras</option>
                    <option>SRM University</option>
                    <option>VIT University</option>
                    <option>Anna University</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Department</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all" 
                    placeholder="CSE, ECE, etc." 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Year of Study</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select 
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all appearance-none"
                  >
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all" 
                    placeholder="+91 98765 43210" 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Bio (150 chars)</label>
              <textarea 
                maxLength={150}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all resize-none h-24" 
                placeholder="Tell us about yourself..." 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest">Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.skills.map((skill) => (
                  <span key={skill} className="bg-red-50 text-red-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-red-100">
                    {skill}
                    <button onClick={() => handleRemoveSkill(skill)} className="hover:text-red-dark">
                      <XCircle size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="Add a skill..."
                  className="flex-1 border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-red-primary bg-gray-50"
                />
                <button onClick={handleAddSkill} className="btn-primary px-6 flex items-center gap-2">
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-4 tracking-widest">Resume</label>
              {formData.resumeUrl ? (
                <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="w-12 h-12 bg-red-primary text-white rounded-xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Resume uploaded successfully</p>
                    <p className="text-[10px] text-gray-500">Ready for download</p>
                  </div>
                  <button 
                    onClick={() => document.getElementById('resume-upload')?.click()}
                    className="text-xs font-bold text-gray-500 hover:text-red-primary"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-red-primary transition-all cursor-pointer relative group">
                  <input 
                    type="file" 
                    id="resume-upload"
                    onChange={handleResumeUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-red-primary/10 flex items-center justify-center text-red-primary group-hover:scale-110 transition-transform">
                      <Upload size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Upload Resume (Optional)</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX (Max 5MB)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-4 tracking-widest text-center">Projects</label>
              <div className="space-y-4">
                {formData.projects.map((proj, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                    <button onClick={() => removeProject(idx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-primary">
                      <Trash2 size={16} />
                    </button>
                    <div className="grid gap-4">
                      <input 
                        className="bg-transparent border-b border-gray-200 py-2 focus:border-red-primary outline-none font-bold" 
                        placeholder="Project Name"
                        value={proj.name}
                        onChange={e => {
                          const p = [...formData.projects];
                          p[idx].name = e.target.value;
                          setFormData({...formData, projects: p});
                        }}
                      />
                      <textarea 
                        className="bg-transparent border-b border-gray-200 py-2 focus:border-red-primary outline-none text-sm resize-none h-20" 
                        placeholder="Description"
                        value={proj.description}
                        onChange={e => {
                          const p = [...formData.projects];
                          p[idx].description = e.target.value;
                          setFormData({...formData, projects: p});
                        }}
                      />
                      <input 
                        className="bg-transparent border-b border-gray-200 py-2 focus:border-red-primary outline-none text-xs text-blue-500" 
                        placeholder="Link (Github/Demo)"
                        value={proj.link}
                        onChange={e => {
                          const p = [...formData.projects];
                          p[idx].link = e.target.value;
                          setFormData({...formData, projects: p});
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button onClick={addProject} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-red-primary transition-all flex items-center justify-center gap-2">
                  <Plus size={20} /> Add Project
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-4 tracking-widest text-center">Work Experience</label>
              <div className="space-y-4">
                {formData.workExperience.map((exp, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                    <button onClick={() => removeExperience(idx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-primary">
                      <Trash2 size={16} />
                    </button>
                    <div className="grid gap-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <input 
                          className="bg-transparent border-b border-gray-200 py-2 focus:border-red-primary outline-none font-bold" 
                          placeholder="Company"
                          value={exp.company}
                          onChange={e => {
                            const ex = [...formData.workExperience];
                            ex[idx].company = e.target.value;
                            setFormData({...formData, workExperience: ex});
                          }}
                        />
                        <input 
                          className="bg-transparent border-b border-gray-200 py-2 focus:border-red-primary outline-none font-bold text-red-primary text-right" 
                          placeholder="Duration (e.g. 3 Months)"
                          value={exp.duration}
                          onChange={e => {
                            const ex = [...formData.workExperience];
                            ex[idx].duration = e.target.value;
                            setFormData({...formData, workExperience: ex});
                          }}
                        />
                      </div>
                      <input 
                        className="bg-transparent border-b border-gray-200 py-2 focus:border-red-primary outline-none text-sm font-bold text-gray-700" 
                        placeholder="Role"
                        value={exp.role}
                        onChange={e => {
                          const ex = [...formData.workExperience];
                          ex[idx].role = e.target.value;
                          setFormData({...formData, workExperience: ex});
                        }}
                      />
                      <textarea 
                        className="bg-transparent border-b border-gray-200 py-2 focus:border-red-primary outline-none text-xs resize-none h-20" 
                        placeholder="Key Responsibilities"
                        value={exp.description}
                        onChange={e => {
                          const ex = [...formData.workExperience];
                          ex[idx].description = e.target.value;
                          setFormData({...formData, workExperience: ex});
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button onClick={addExperience} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-red-primary transition-all flex items-center justify-center gap-2">
                  <Plus size={20} /> Add Experience
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-4 tracking-widest">Social Links</label>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="relative">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="url" 
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all text-sm" 
                    placeholder="github.com/username" 
                  />
                </div>
                <div className="relative">
                  <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="url" 
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all text-sm" 
                    placeholder="linkedin.com/in/username" 
                  />
                </div>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="url" 
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-primary focus:bg-white transition-all text-sm" 
                    placeholder="yourwebsite.com" 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleSubmit}
                disabled={loading || success}
                className="flex-1 btn-primary py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Profile'} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
