import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import localforage from 'localforage';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { ArrowRight, ArrowLeft, Camera, Image as ImageIcon, Check, Palette } from 'lucide-react';
import { AvatarGallery } from '../components/common/AvatarGallery';

export default function Signup() {
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [tempProfilePic, setTempProfilePic] = useState('');
  const [tempBgPic, setTempBgPic] = useState('');

  // Form Data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    profilePic: '',
    bgPic: '',
    birthday: '',
    status: 'Single',
    gender: 'Other',
    bio: '',
    work: '',
    socialLinks: '',
    website: '',
    friends: [] as string[]
  });

  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    if (step === 3) {
      const fetchUsers = async () => {
        try {
          const snapshot = await getDocs(collection(db, 'users'));
          const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsersList(users);
        } catch (err) {
          console.error('Failed to fetch users', err);
        }
      };
      fetchUsers();
    }
  }, [step]);

  useEffect(() => {
    const loadDraft = async () => {
      const draft = await localforage.getItem<any>('signup_draft');
      if (draft) {
        setFormData(prev => ({ ...prev, ...draft }));
        if (draft.profilePic && !draft.profilePic.startsWith('http')) {
           // If it's a blob URL it won't work, so we expect profilePic to be Cloudinary URL
           // or we'd need to store the File too.
           // For simplicity, we just persist the form data here.
        }
      }
    };
    loadDraft();
  }, []);

  useEffect(() => {
    localforage.setItem('signup_draft', formData);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        setError('Please fill in all required fields.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleCloudinaryUpload = async (file: File, type: 'profile' | 'bg') => {
    try {
      setLoading(true);
      setError('');

      // Compress image for mobile APK compatibility and faster uploads
      const options = {
        maxSizeMB: 1, // Max 1MB
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        // Set temporary preview immediately
        const objectUrl = URL.createObjectURL(file);
        if (type === 'profile') setTempProfilePic(objectUrl);
        else setTempBgPic(objectUrl);

        fileToUpload = await imageCompression(file, options);
      }

      const data = new FormData();
      data.append('file', fileToUpload);
      data.append('upload_preset', 'ml_default');
      
      const res = await fetch('https://api.cloudinary.com/v1_1/dxiolmmdv/image/upload', {
        method: 'POST',
        body: data
      });
      const fileData = await res.json();
      if (type === 'profile') {
        setFormData({ ...formData, profilePic: fileData.secure_url });
      } else {
        setFormData({ ...formData, bgPic: fileData.secure_url });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Image upload failed. If you are using the app, please ensure storage permissions are granted.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = (userId: string) => {
    if (formData.friends.includes(userId)) {
      setFormData({ ...formData, friends: formData.friends.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, friends: [...formData.friends, userId] });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create user auth
      const userCredential = await signUpWithEmail(formData.email, formData.password, `${formData.firstName} ${formData.lastName}`);
      
      // 2. Save additional data to Firestore
      if (userCredential?.user) {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          profilePic: formData.profilePic,
          bgPic: formData.bgPic,
          birthday: formData.birthday,
          status: formData.status,
          gender: formData.gender,
          bio: formData.bio,
          work: formData.work,
          socialLinks: formData.socialLinks,
          website: formData.website,
          friends: formData.friends,
          createdAt: new Date().toISOString(),
          isOnline: true
        }, { merge: true });
      }
      
      await localforage.removeItem('signup_draft');
      // Navigate to home will happen automatically via App.tsx routing when user is authenticated
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen gradient-wave flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Top wave */}
      <div className="absolute top-0 w-full h-[120px] bg-[#5f2c82] rounded-b-[80px]" />
      
      {/* Bottom blob */}
      <div className="absolute -bottom-[60px] -right-[60px] w-[220px] h-[220px] bg-[#ff4b8b] rounded-full blur-[10px]" />

      <div className="backdrop-blur-[15px] bg-white/10 p-8 rounded-[20px] w-full max-w-[380px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] text-center z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex items-center justify-between mb-6">
          {step > 1 ? (
            <button onClick={handlePrev} className="text-white hover:text-gray-200">
              <ArrowLeft size={24} />
            </button>
          ) : (
            <div className="w-6" />
          )}
          <h2 className="text-white text-2xl font-bold">Step {step} of 4</h2>
          <div className="w-6" />
        </div>

        {error && <p className="text-xs text-red-200 mb-4">{error}</p>}

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4 text-left">
            <h3 className="text-white font-semibold mb-2">Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
                <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">First Name</label>
              </div>
              <div className="relative">
                <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
                <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Last Name</label>
              </div>
            </div>
            <div className="relative mt-4">
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
              <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Phone No</label>
            </div>
            <div className="relative mt-4">
              <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
              <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Email</label>
            </div>
            <div className="relative mt-4">
              <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
              <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Password</label>
            </div>
            <div className="relative mt-4">
              <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
              <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Confirm Password</label>
            </div>
            
            <div className="flex justify-end mt-6">
              <button onClick={handleNext} className="p-3 bg-gradient-to-r from-[#ff4b8b] to-[#ff7eb3] text-white rounded-full font-bold transition-transform active:scale-95">
                <ArrowRight size={20} />
              </button>
            </div>
            <div className="mt-4 text-center text-white text-sm cursor-pointer" onClick={() => navigate('/login')}>
              Already have an account? Login
            </div>
          </div>
        )}

        {/* STEP 2: Media & Identity */}
        {step === 2 && (
          <div className="space-y-4 text-left">
            <h3 className="text-white font-semibold mb-4">Media & Identity</h3>
            
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/50">
                  {tempProfilePic || formData.profilePic ? (
                    <img src={tempProfilePic || formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="text-white/70" size={32} />
                  )}
                </div>
                <div className="flex gap-2 mt-2 justify-center">
                  <label className="p-2 bg-white/20 rounded-full cursor-pointer">
                    <Camera size={16} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && handleCloudinaryUpload(e.target.files[0], 'profile')}
                      className="hidden"
                    />
                  </label>
                  <button onClick={() => setShowAvatarGallery(!showAvatarGallery)} className="p-2 bg-primary rounded-full"><Palette size={16} /></button>
                </div>
                <div className="text-center text-white text-xs mt-1">Profile Pic</div>
              </div>

              {showAvatarGallery && (
                <div className="absolute z-50 bg-background w-full max-w-sm rounded-2xl p-4">
                  <AvatarGallery 
                    onSelect={(url) => {
                      setFormData({ ...formData, profilePic: url });
                      setShowAvatarGallery(false);
                    }}
                    selectedUrl={formData.profilePic}
                  />
                  <button onClick={() => setShowAvatarGallery(false)} className="w-full mt-4 py-2 bg-surface rounded-xl font-bold">Close</button>
                </div>
              )}

              <div className="relative w-full h-24 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/50">
                {tempBgPic || formData.bgPic ? (
                  <img src={tempBgPic || formData.bgPic} alt="Background" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-white/70">
                    <ImageIcon size={24} />
                    <span className="text-xs mt-1">Background (Optional)</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => e.target.files?.[0] && handleCloudinaryUpload(e.target.files[0], 'bg')}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white text-xs mb-1 block">Birthday</label>
                <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none text-sm" />
              </div>
              
              <div>
                <label className="text-white text-xs mb-1 block">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none text-sm [&>option]:text-black">
                  <option value="Single">Single</option>
                  <option value="In a relationship">In a relationship</option>
                  <option value="Married">Married</option>
                  <option value="It's complicated">It's complicated</option>
                </select>
              </div>

              <div>
                <label className="text-white text-xs mb-1 block">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none text-sm [&>option]:text-black">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleNext} disabled={loading} className="p-3 bg-gradient-to-r from-[#ff4b8b] to-[#ff7eb3] text-white rounded-full font-bold transition-transform active:scale-95 disabled:opacity-50">
                {loading ? <span className="text-sm px-2">Uploading...</span> : <ArrowRight size={20} />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Social Discovery */}
        {step === 3 && (
          <div className="space-y-4 text-left">
            <h3 className="text-white font-semibold mb-2">Social Discovery</h3>
            <p className="text-white/70 text-xs mb-4">Select friends to add (Optional)</p>
            
            <div className="max-h-[250px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {usersList.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-4">No users found.</p>
              ) : (
                usersList.map((u) => (
                  <div key={u.id} className="flex items-center justify-between bg-white/10 p-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={u.profilePic || `https://ui-avatars.com/api/?name=${u.firstName}+${u.lastName}`} alt="User" className="w-10 h-10 rounded-full object-cover" />
                      <span className="text-white text-sm">{u.firstName} {u.lastName}</span>
                    </div>
                    <button 
                      onClick={() => handleAddFriend(u.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border ${formData.friends.includes(u.id) ? 'bg-pink-500 border-pink-500' : 'border-white/50'}`}
                    >
                      {formData.friends.includes(u.id) && <Check size={14} className="text-white" />}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleNext} className="p-3 bg-gradient-to-r from-[#ff4b8b] to-[#ff7eb3] text-white rounded-full font-bold transition-transform active:scale-95">
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Finalize Bio */}
        {step === 4 && (
          <div className="space-y-4 text-left">
            <h3 className="text-white font-semibold mb-4">Finalize Bio</h3>
            
            <div className="space-y-4">
              <div className="relative">
                <textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  rows={3}
                  className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm resize-none" 
                  placeholder=" "
                />
                <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#ddd] -top-3 text-xs text-white">Bio</label>
              </div>

              <div className="relative mt-4">
                <input type="text" name="work" value={formData.work} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
                <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Work/Job</label>
              </div>

              <div className="relative mt-4">
                <input type="text" name="socialLinks" value={formData.socialLinks} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
                <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Social Links (Optional)</label>
              </div>

              <div className="relative mt-4">
                <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer text-sm" />
                <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Website Link (Optional)</label>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#ff4b8b] to-[#ff7eb3] text-white rounded-[25px] font-bold transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Confirm & Finish'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
