import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Edit3, MapPin, Shield, CheckCircle2, Loader2, Save } from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserDetailsModal({ user, onClose, onUpdate }: UserDetailsModalProps) {
  const [identity, setIdentity] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable state
  const [editData, setEditData] = useState<any>({});
  const [isVerified, setIsVerified] = useState(!!user.verified);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const idDoc = await getDoc(doc(db, 'users', user.uid, 'private', 'identity'));
        if (idDoc.exists()) {
          setIdentity(idDoc.data());
          setEditData(idDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user identity:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [user.uid]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update private identity
      await setDoc(doc(db, 'users', user.uid, 'private', 'identity'), editData, { merge: true });
      
      // Update public user doc
      await updateDoc(doc(db, 'users', user.uid), {
        verified: isVerified,
        sex: editData.sex || user.sex || null,
        birthYear: editData.birthYear || user.birthYear || null
      });
      
      setIdentity(editData);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error saving user details:", error);
      alert("Failed to save user details");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVerify = async () => {
    const newStatus = !isVerified;
    setIsVerified(newStatus);
    try {
      await updateDoc(doc(db, 'users', user.uid), { verified: newStatus });
      onUpdate();
    } catch (error) {
      console.error("Error updating verification:", error);
      setIsVerified(!newStatus); // revert
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <h2 className="text-xl font-bold flex items-center gap-2">
              User Details
              {isVerified && <CheckCircle2 className="text-blue-500 fill-blue-500" size={20} />}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleVerify}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors ${isVerified ? 'bg-blue-500/10 text-blue-500' : 'bg-surface border border-border text-muted-foreground hover:bg-muted/10'}`}
              >
                <Shield size={16} />
                {isVerified ? 'Verified' : 'Verify User'}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-muted/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="flex items-center gap-4">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="" className="w-16 h-16 rounded-full object-cover border border-border" />
              <div>
                <h3 className="text-lg font-bold">{user.displayName}</h3>
                <p className="text-sm text-muted-foreground">{user.email || 'No email'}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">UID: {user.uid}</p>
              </div>
            </div>

            {/* Location Tracking */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <MapPin size={18} className="text-primary" />
                Live Location Tracking
              </h4>
              <div className="bg-background rounded-lg p-3 border border-border">
                {user.location ? (
                  <p className="text-sm font-medium">{user.location}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Location not available. User has not granted location permission or has not been active recently.</p>
                )}
              </div>
            </div>

            {/* Identity Data */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold flex items-center gap-2">
                  <Shield size={18} className="text-primary" />
                  Identity Data
                </h4>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
                    <Edit3 size={16} /> Edit
                  </button>
                ) : (
                  <button onClick={handleSave} disabled={isSaving} className="text-green-500 hover:text-green-600 flex items-center gap-1 text-sm font-medium">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Name (Bangla)" name="nameBangla" value={editData.nameBangla} isEditing={isEditing} onChange={(v) => setEditData({...editData, nameBangla: v})} />
                  <Field label="Name (English)" name="nameEnglish" value={editData.nameEnglish} isEditing={isEditing} onChange={(v) => setEditData({...editData, nameEnglish: v})} />
                  <Field label="Father's Name" name="fatherName" value={editData.fatherName} isEditing={isEditing} onChange={(v) => setEditData({...editData, fatherName: v})} />
                  <Field label="Mother's Name" name="motherName" value={editData.motherName} isEditing={isEditing} onChange={(v) => setEditData({...editData, motherName: v})} />
                  <Field label="Address" name="address" value={editData.address} isEditing={isEditing} onChange={(v) => setEditData({...editData, address: v})} />
                  <Field label="OC ID" name="ocId" value={editData.ocId} isEditing={isEditing} onChange={(v) => setEditData({...editData, ocId: v})} />
                  <Field label="NID No" name="nidNo" value={editData.nidNo} isEditing={isEditing} onChange={(v) => setEditData({...editData, nidNo: v})} />
                  <Field label="Blood Group" name="bloodGroup" value={editData.bloodGroup} isEditing={isEditing} onChange={(v) => setEditData({...editData, bloodGroup: v})} />
                  <Field label="Sex" name="sex" value={editData.sex} isEditing={isEditing} onChange={(v) => setEditData({...editData, sex: v})} />
                  <Field label="Birth Year" name="birthYear" value={editData.birthYear} isEditing={isEditing} onChange={(v) => setEditData({...editData, birthYear: v})} type="number" />
                  
                  <div className="col-span-1 sm:col-span-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Signature URL</p>
                    {isEditing ? (
                      <input type="text" value={editData.signatureURL || ''} onChange={(e) => setEditData({...editData, signatureURL: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                    ) : (
                      <div className="h-16 bg-background rounded-lg border border-border flex items-center justify-center overflow-hidden">
                        {editData.signatureURL ? <img src={editData.signatureURL} className="h-full object-contain" alt="Signature" /> : <span className="text-xs text-muted-foreground">No Signature</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function Field({ label, name, value, isEditing, onChange, type = "text" }: any) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">{label}</p>
      {isEditing ? (
        <input 
          type={type} 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
        />
      ) : (
        <p className="text-sm font-medium">{value || '-'}</p>
      )}
    </div>
  );
}
