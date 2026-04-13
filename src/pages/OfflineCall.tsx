import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Delete, ArrowLeft, Loader2 } from 'lucide-react';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { cn } from '../lib/utils';

export default function OfflineCall() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string | null>(null);

  const handleDial = (digit: string) => {
    if (phoneNumber.length < 15) {
      setPhoneNumber(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleCall = async () => {
    if (!phoneNumber) return;

    // Auto-prefix logic
    let formattedNumber = phoneNumber;
    if (formattedNumber.startsWith('01') && formattedNumber.length === 11) {
      formattedNumber = '880' + formattedNumber.substring(1);
    }

    setIsCalling(true);
    setCallStatus('Initiating call...');

    try {
      const response = await fetch('/api/make-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formattedNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        setCallStatus('Call connected successfully!');
        setTimeout(() => setCallStatus(null), 3000);
      } else {
        setCallStatus(`Failed: ${data.error || 'Unknown error'}`);
        setTimeout(() => setCallStatus(null), 3000);
      }
    } catch (error) {
      console.error('Call error:', error);
      setCallStatus('Failed to initiate call');
      setTimeout(() => setCallStatus(null), 3000);
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-black tracking-widest text-lg">OC-CHAT v1.0.0</span>
          <VerifiedBadge className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Number Display */}
        <div className="h-24 flex flex-col items-center justify-center mb-8 w-full">
          <div className="text-4xl font-mono tracking-wider font-bold text-center break-all">
            {phoneNumber || ' '}
          </div>
          {callStatus && (
            <div className={cn(
              "mt-2 text-sm font-medium",
              callStatus.includes('Failed') ? "text-red-400" : "text-green-400"
            )}>
              {callStatus}
            </div>
          )}
        </div>

        {/* Dialer Pad */}
        <div className="grid grid-cols-3 gap-6 max-w-xs w-full">
          {[
            { digit: '1', letters: '' },
            { digit: '2', letters: 'ABC' },
            { digit: '3', letters: 'DEF' },
            { digit: '4', letters: 'GHI' },
            { digit: '5', letters: 'JKL' },
            { digit: '6', letters: 'MNO' },
            { digit: '7', letters: 'PQRS' },
            { digit: '8', letters: 'TUV' },
            { digit: '9', letters: 'WXYZ' },
            { digit: '*', letters: '' },
            { digit: '0', letters: '+' },
            { digit: '#', letters: '' },
          ].map((item) => (
            <button
              key={item.digit}
              onClick={() => handleDial(item.digit)}
              className="flex flex-col items-center justify-center w-20 h-20 rounded-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors"
            >
              <span className="text-3xl font-medium">{item.digit}</span>
              {item.letters && <span className="text-[10px] text-gray-400 tracking-widest">{item.letters}</span>}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 mt-12 w-full max-w-xs">
          <div className="w-16"></div> {/* Spacer */}
          
          <button
            onClick={handleCall}
            disabled={isCalling || !phoneNumber}
            className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
          >
            {isCalling ? (
              <Loader2 size={32} className="text-white animate-spin" />
            ) : (
              <Phone size={32} className="text-white fill-white" />
            )}
          </button>

          <button
            onClick={handleDelete}
            disabled={!phoneNumber}
            className="w-16 h-16 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 active:bg-gray-700 transition-colors disabled:opacity-30"
          >
            <Delete size={28} />
          </button>
        </div>
      </div>

      {/* Footer - Wallet Balance */}
      <div className="p-6 border-t border-gray-800 bg-gray-900 flex justify-center">
        <div className="bg-gray-800 px-6 py-3 rounded-full flex items-center gap-3">
          <span className="text-gray-400 text-sm font-medium">Wallet Balance</span>
          <span className="text-white font-bold text-lg">$0.00</span>
        </div>
      </div>
    </div>
  );
}
