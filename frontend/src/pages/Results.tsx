import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAssesslyStore } from '@/store/useStore';
import ResultsDashboard from '@/components/ResultsDashboard';
import RAGChat from '@/components/RAGChat';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const Results: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { result, setResult, isLoading, setIsLoading, error, setError } = useAssesslyStore();
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      // If result is already in store and matches the ID, don't fetch
      if (result && result.assessmentId === id) return;

      setIsLoading(true);
      setError(null);

      try {
        const GET_URL = import.meta.env.VITE_API_URL 
          ? `${import.meta.env.VITE_API_URL.replace('/analyze', `/assessment/${id}`)}` 
          : `http://localhost:3000/Prod/assessment/${id}`;

        const response = await axios.get(GET_URL);
        setResult(response.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || "Failed to load assessment");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchAssessment();
    }
  }, [id, result, setResult, setIsLoading, setError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-black/5 blur-3xl rounded-full scale-150 animate-pulse" />
          <Loader2 className="w-16 h-16 text-black animate-spin relative" />
        </div>
        <h2 className="mt-8 text-2xl font-bold font-fustat text-black">Analyzing candidate code...</h2>
        <p className="mt-2 text-[#505050] font-inter">Running tests and generating AI insights.</p>
      </div>
    );
  }

  if (error || (!result && !isLoading)) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-md w-full border border-black/5">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold font-fustat text-black mb-2">Oops!</h2>
          <p className="text-[#505050] font-inter mb-8">{error || "We couldn't find that assessment."}</p>
          <Link to="/">
            <Button className="w-full bg-black text-white rounded-2xl h-12">
              Back to Analysis
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#505050] hover:text-black transition-colors">
            <ChevronLeft size={16} />
            New Analysis
          </Link>
        </div>

        <ResultsDashboard onOpenChat={() => setIsChatOpen(true)} />
      </div>

      {isChatOpen && <RAGChat onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default Results;
