import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, X } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen gradient-wave flex flex-col items-center justify-center p-8 overflow-hidden">
      <div className="backdrop-blur-[15px] bg-white/10 p-8 rounded-[20px] w-full max-w-[320px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] text-center">
        <h2 className="text-white text-2xl font-bold mb-6">{isSignUp ? 'Sign Up' : 'Login'}</h2>

        {!showEmailForm ? (
          <div className="space-y-4">
            <button 
              onClick={() => setShowEmailForm(true)}
              className="w-full py-3 bg-gradient-to-r from-[#ff4b8b] to-[#ff7eb3] text-white rounded-[25px] font-bold transition-transform active:scale-95"
            >
              LOGIN
            </button>
            <div className="mt-5 space-y-2">
              <button className="w-full py-2.5 rounded-[20px] bg-white text-black font-semibold" onClick={signInWithGoogle}>Google</button>
              <button className="w-full py-2.5 rounded-[20px] bg-[#1877f2] text-white font-semibold">Facebook</button>
              <button className="w-full py-2.5 rounded-[20px] bg-black text-white font-semibold">OCSTHAEL</button>
            </div>
            <div className="mt-5 text-white cursor-pointer" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Already have an account? Login' : 'CREATE A ACCOUNT'}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative my-6">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer"
              />
              <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Email</label>
            </div>
            <div className="relative my-6">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border-b-2 border-white bg-transparent text-white outline-none peer"
              />
              <label className="absolute left-2 top-2 text-[#ddd] transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-white peer-valid:-top-3 peer-valid:text-xs peer-valid:text-white">Password</label>
            </div>
            {error && <p className="text-xs text-red-200">{error}</p>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#ff4b8b] to-[#ff7eb3] text-white rounded-[25px] font-bold transition-transform active:scale-95">
              {loading ? 'Processing...' : 'LOGIN'}
            </button>
            <button type="button" onClick={() => setShowEmailForm(false)} className="text-white mt-4">Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
