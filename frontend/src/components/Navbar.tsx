import React from 'react';
import { useAssesslyStore } from '@/store/useStore';
import { signInWithGoogle, signOut } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user } = useAssesslyStore();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-[120px] py-[16px]">
      <div 
        className="text-[24px] font-semibold tracking-[-1.44px] font-schibsted text-black select-none pointer-events-none"
      >
        Assessly
      </div>
      
      <div className="flex items-center gap-[32px] font-inter text-[14px] font-medium text-[#505050]">
        <a href="#" className="hover:text-black transition-colors">Platform</a>
        <div className="flex items-center gap-1 cursor-pointer hover:text-black transition-colors">
          Features
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <a href="#" className="hover:text-black transition-colors">Pricing</a>
        <a href="#" className="hover:text-black transition-colors">Resources</a>
      </div>
      
      <div className="flex items-center gap-[16px]">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 rounded-full">
              <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                <User size={14} className="text-black/60" />
              </div>
              <span className="text-[13px] font-medium font-inter text-black/80 truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
            <button 
              onClick={handleSignOut}
              className="group flex items-center gap-2 h-[40px] px-4 text-[14px] font-medium font-inter text-red-500 hover:bg-red-50 rounded-full transition-all"
            >
              <LogOut size={16} className="transition-transform group-hover:-translate-x-0.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={handleSignIn}
              className="w-[82px] h-[40px] text-[14px] font-medium font-inter hover:bg-gray-50 rounded-full transition-colors"
            >
              Sign Up
            </button>
            <Button 
              onClick={handleSignIn}
              className="h-[40px] px-6 bg-black text-white text-[14px] font-medium font-inter rounded-full hover:bg-black/90 transition-all flex items-center gap-2"
            >
              <LogIn size={16} />
              Log In
            </Button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
