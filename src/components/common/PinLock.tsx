import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Delete, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useSettings } from '../../hooks/useSettings';

interface PinLockProps {
  onUnlock: () => void;
  isSetting?: boolean;
  onSetPin?: (pin: string) => void;
  onCancel?: () => void;
}

export default function PinLock({ onUnlock, isSetting = false, onSetPin, onCancel }: PinLockProps) {
  const { user } = useAuth();
  const { t } = useSettings();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>(isSetting ? 'enter' : 'enter');

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (isSetting) {
        if (step === 'enter') {
          setConfirmPin(pin);
          setPin('');
          setStep('confirm');
        } else {
          if (pin === confirmPin) {
            onSetPin?.(pin);
          } else {
            setError(true);
            setPin('');
            setTimeout(() => setError(false), 500);
          }
        }
      } else {
        if (pin === user?.securitySettings?.pin) {
          onUnlock();
        } else {
          setError(true);
          setPin('');
          setTimeout(() => setError(false), 500);
        }
      }
    }
  }, [pin, isSetting, step, confirmPin, user?.securitySettings?.pin, onUnlock, onSetPin]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex flex-col items-center w-full max-w-xs"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
            <Lock className="text-primary" size={32} />
          </div>

          <h2 className="text-2xl font-black text-text mb-2">
            {isSetting 
              ? (step === 'enter' ? t('profile.setPin') : t('profile.confirmPin'))
              : t('profile.enterPin')
            }
          </h2>
          <p className="text-sm text-muted mb-8 text-center">
            {isSetting 
              ? t('profile.pinDescription')
              : t('profile.appLocked')
            }
          </p>

          {/* PIN Dots */}
          <div className={cn(
            "flex gap-4 mb-12",
            error && "animate-shake"
          )}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all duration-200",
                  pin.length > i 
                    ? "bg-primary border-primary scale-110" 
                    : "border-border"
                )}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-16 rounded-2xl bg-gray-50 text-2xl font-bold text-text hover:bg-gray-100 active:scale-90 transition-all"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleNumberClick('0')}
              className="h-16 rounded-2xl bg-gray-50 text-2xl font-bold text-text hover:bg-gray-100 active:scale-90 transition-all"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-16 rounded-2xl flex items-center justify-center text-muted hover:text-text active:scale-90 transition-all"
            >
              <Delete size={24} />
            </button>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-8 flex items-center gap-2 text-sm font-bold text-muted hover:text-primary transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
