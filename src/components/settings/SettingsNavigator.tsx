import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import SettingsHome from './SettingsHome';
import AccountCenter from './AccountCenter';
import PasswordSecurity from './PasswordSecurity';
import PersonalInfo from './PersonalInfo';
import ChangePassword from './ChangePassword';
import TwoFactorAuth from './TwoFactorAuth';
import PrivacySettings from './PrivacySettings';
import NotificationSettings from './NotificationSettings';
import SecuritySettings from '../profile/SecuritySettings';
import DangerZone from './DangerZone';
import AccountPrivacy from './AccountPrivacy';
import LanguageSettings from './LanguageSettings';
import DataUsageSettings from './DataUsageSettings';
import UserListSettings from './UserListSettings';
import InteractionSettings from './InteractionSettings';
import ProfessionalAccountSettings from './ProfessionalAccountSettings';
import { ChevronLeft, Settings } from 'lucide-react';

function SettingsPlaceholder({ title, onBack }: { title: string, onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">{title}</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Settings className="text-gray-300" size={40} />
        </div>
        <h2 className="text-lg font-bold mb-2">{title} Settings</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          This feature is being updated to provide more control over your experience on OC-CHAT.
        </p>
      </div>
    </div>
  );
}

export type SettingsView = 
  | 'home' 
  | 'account_center' 
  | 'personal_info' 
  | 'password_security' 
  | 'change_password' 
  | 'two_factor' 
  | 'login_activity' 
  | 'privacy' 
  | 'notifications' 
  | 'danger_zone'
  | 'account_privacy'
  | 'close_friends'
  | 'blocked'
  | 'messages_replies'
  | 'tags_mentions'
  | 'comments'
  | 'language'
  | 'help'
  | 'about'
  | 'data_usage'
  | 'info_permissions'
  | 'accounts_list'
  | 'favorites'
  | 'muted'
  | 'professional';

export default function SettingsNavigator({ onExit }: { onExit: () => void }) {
  const [viewStack, setViewStack] = useState<SettingsView[]>(['home']);

  const currentView = viewStack[viewStack.length - 1];

  const push = (view: SettingsView) => setViewStack(prev => [...prev, view]);
  const pop = () => {
    if (viewStack.length === 1) {
      onExit();
    } else {
      setViewStack(prev => prev.slice(0, -1));
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <SettingsHome onNavigate={push} onBack={pop} />;
      case 'account_center':
        return <AccountCenter onNavigate={push} onBack={pop} />;
      case 'personal_info':
        return <PersonalInfo onBack={pop} />;
      case 'password_security':
        return <PasswordSecurity onNavigate={push} onBack={pop} />; 
      case 'change_password':
        return <ChangePassword onBack={pop} />;
      case 'two_factor':
        return <TwoFactorAuth onBack={pop} />;
      case 'login_activity':
        return <SecuritySettings onBack={pop} />;
      case 'privacy':
        return <PrivacySettings onBack={pop} />;
      case 'notifications':
        return <NotificationSettings onBack={pop} />;
      case 'danger_zone':
        return <DangerZone onBack={pop} />;
      case 'account_privacy':
        return <AccountPrivacy onBack={pop} />;
      case 'close_friends':
        return <UserListSettings type="close_friends" onBack={pop} />;
      case 'blocked':
        return <UserListSettings type="blocked" onBack={pop} />;
      case 'favorites':
        return <UserListSettings type="favorites" onBack={pop} />;
      case 'muted':
        return <UserListSettings type="muted" onBack={pop} />;
      case 'messages_replies':
        return <InteractionSettings type="messages" onBack={pop} />;
      case 'tags_mentions':
        return <InteractionSettings type="tags" onBack={pop} />;
      case 'comments':
        return <InteractionSettings type="comments" onBack={pop} />;
      case 'language':
        return <LanguageSettings onBack={pop} />;
      case 'help':
        return <SettingsPlaceholder title="Help" onBack={pop} />;
      case 'about':
        return <SettingsPlaceholder title="About" onBack={pop} />;
      case 'data_usage':
        return <DataUsageSettings onBack={pop} />;
      case 'professional':
        return <ProfessionalAccountSettings onBack={pop} />;
      case 'info_permissions':
        return <SettingsPlaceholder title="Your information and permissions" onBack={pop} />;
      case 'accounts_list':
        return <SettingsPlaceholder title="Accounts" onBack={pop} />;
      default:
        return <SettingsHome onNavigate={push} onBack={pop} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white text-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
