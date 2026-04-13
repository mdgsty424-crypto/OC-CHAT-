import React, { useState, useRef } from 'react';
import { ArrowLeft, Megaphone, CreditCard, Play, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function Ads() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(location.state?.openUpload || false);
  const [uploadForm, setUploadForm] = useState({ description: '', ctaText: 'Learn More', file: null as File | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plans = [
    { id: 'daily', title: '1 Day Boost', price: '1,000 BDT', duration: '24 Hours', features: ['Show in Books Feed', 'Show in Stories', '3s Skip Option'] },
    { id: 'weekly', title: '5 Days Mega Boost', price: '5,000 BDT', duration: '5 Days', features: ['Show in Books Feed', 'Show in Stories', 'Show after Calls', '3s Skip Option', 'Priority Placement'] },
  ];

  const handleUpload = async () => {
    if (!user || !uploadForm.file || !selectedPlan) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        await addDoc(collection(db, 'ads'), {
          authorId: user.uid,
          authorName: user.displayName,
          authorPhoto: user.photoURL,
          description: uploadForm.description,
          ctaText: uploadForm.ctaText,
          mediaUrl: data.url,
          mediaType: uploadForm.file.type.startsWith('video/') ? 'video' : 'image',
          plan: selectedPlan,
          createdAt: serverTimestamp()
        });
        setIsUploading(false);
        setUploadForm({ description: '', ctaText: 'Learn More', file: null });
        alert('Ad campaign launched successfully!');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to launch ad campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white p-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Ads & Promote</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
          <Megaphone size={120} className="absolute -right-10 -bottom-10 opacity-20" />
          <h2 className="text-3xl font-black mb-2 relative z-10">Boost Your Reach</h2>
          <p className="font-medium opacity-90 relative z-10 max-w-[80%]">Get your content seen by thousands of users across the OC-CHAT network.</p>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">Select a Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div 
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`bg-white p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === plan.id ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-lg">{plan.title}</h4>
                    <p className="text-gray-500 text-sm font-medium">{plan.duration}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {selectedPlan === plan.id && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600 mb-4">{plan.price}</div>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                      <CheckCircle2 size={16} className="text-green-500" /> {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4">Upload Ad Creative</h3>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {uploadForm.file ? (
              <div className="font-medium text-blue-600">{uploadForm.file.name}</div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  <Play size={32} className="ml-1" />
                </div>
                <h4 className="font-bold mb-1">Upload 1-min Video or Image</h4>
                <p className="text-sm text-gray-500 font-medium">MP4, WebM, JPG, PNG up to 50MB</p>
              </>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={e => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})} 
            className="hidden" 
            accept="video/*,image/*"
          />
          
          <div className="mt-4 space-y-4">
            <input 
              type="text" 
              placeholder="Ad Description" 
              value={uploadForm.description} 
              onChange={e => setUploadForm({...uploadForm, description: e.target.value})} 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none" 
            />
            <input 
              type="text" 
              placeholder="Call to Action (e.g., Learn More, Shop Now)" 
              value={uploadForm.ctaText} 
              onChange={e => setUploadForm({...uploadForm, ctaText: e.target.value})} 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none" 
            />
          </div>
        </div>

        <button 
          onClick={handleUpload}
          disabled={!selectedPlan || !uploadForm.file || isSubmitting}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : (
            <>
              <CreditCard size={24} />
              Pay & Launch Campaign
            </>
          )}
        </button>
      </div>
    </div>
  );
}
