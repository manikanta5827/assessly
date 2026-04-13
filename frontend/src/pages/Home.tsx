import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoBackground from '../components/VideoBackground';
import AssessmentForm from '../components/AssessmentForm';
import { useAssesslyStore } from '../store/useStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import axios from 'axios';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, setResult, setIsLoading, setError, assessmentDoc, repoUrl } = useAssesslyStore();
  
  const videoSrc = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260329_050842_be71947f-f16e-4a14-810c-06e83d23ddb5.mp4";

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  const handleAnalyze = async () => {
    if (!repoUrl || !assessmentDoc) {
      toast.error("Please provide both repo URL and assessment requirements");
      return;
    }

    setIsLoading(true);
    setError(null);
    toast.message("Starting analysis...", {
      description: "Fetching repository and calling AI. This takes ~10s."
    });

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/Prod/analyze';
      
      const response = await axios.post(API_URL, { 
        requirementsText: assessmentDoc, 
        repoUrl,
        userId: user?.id 
      });
      
      setResult(response.data);
      toast.success("Analysis complete!");
      navigate(`/results/${response.data.assessmentId}`);
    } catch (err: any) {
      console.error(err);
      
      if (err.response?.status === 403) {
        toast.error("Free limit reached", { 
          description: "You have already performed one free assessment. Please sign in with Google to continue.",
          duration: 5000,
        });
      } else {
        setError(err.message);
        toast.error("Analysis failed", { description: err.message });
        
        // MOCK DATA for local testing
        if (import.meta.env.DEV) {
          setTimeout(() => {
            const mockResult = {
              assessmentId: "mock-123",
              score: 88,
              summary: {
                goods: ["Clean project structure", "Effective use of hooks", "Comprehensive README"],
                bads: ["Missing unit tests for edge cases", "Hardcoded API endpoints"]
              },
              interviewQuestions: [
                "Why did you choose Zustand over Redux for this scale?",
                "How would you handle race conditions in the search feature?"
              ],
              testDetection: {
                exists: true,
                command: "npm test",
                language: "TypeScript",
                libraries: ["Vitest", "Testing Library"]
              }
            };
            setResult(mockResult);
            setIsLoading(false);
            toast.success("Used mock data for development!");
            navigate(`/results/${mockResult.assessmentId}`);
          }, 2000);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden selection:bg-purple-500 selection:text-white">
      <Navbar />
      <VideoBackground src={videoSrc} />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20">
        <AssessmentForm onAnalyze={handleAnalyze} />
      </div>
    </main>
  );
};

export default Home;
