import React from 'react';
import { useAssesslyStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Star } from 'lucide-react';

const AssessmentForm: React.FC<{ onAnalyze: () => void }> = ({ onAnalyze }) => {
  const { 
    assessmentDoc, setAssessmentDoc, 
    repoUrl, setRepoUrl, 
    isLoading, error 
  } = useAssesslyStore();

  const handleAnalyze = () => {
    onAnalyze();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 -mt-[50px] text-center z-10">
      {/* Badge Section */}
      <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="bg-black text-white px-3 py-1 rounded-full text-[14px] font-medium flex items-center gap-1.5 font-inter">
          <Star size={14} fill="currentColor" />
          New
        </div>
        <div className="bg-white/50 backdrop-blur-sm border border-black/5 px-3 py-1 rounded-full text-[14px] font-medium font-inter text-black/60">
          Discover what's possible
        </div>
      </div>

      {/* Headline */}
      <h1 className="text-[80px] font-bold tracking-[-4.8px] font-fustat leading-[0.95] max-w-[1000px] mb-6 text-black">
        Review GitHub <br /> Assessments in Seconds
      </h1>

      {/* Subtitle */}
      <p className="text-[20px] font-medium font-fustat tracking-[-0.4px] text-[#505050] max-w-[736px] mb-12">
        Paste assessment doc and candidate GitHub link. Get score, gaps, smart questions, and run tests instantly.
      </p>

      {/* Form Card */}
      <div className="w-full max-w-[800px] bg-white/40 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[32px] p-8 space-y-6 animate-in fade-in zoom-in-95 duration-700">
        <div className="space-y-4">
          <Textarea 
            placeholder="Paste the assessment document here..."
            className="min-h-[160px] bg-white/60 border-none rounded-[20px] p-4 text-[16px] focus-visible:ring-black/10 resize-none font-inter"
            value={assessmentDoc}
            onChange={(e) => setAssessmentDoc(e.target.value)}
          />
          <Input 
            placeholder="GitHub Repository URL (e.g., https://github.com/user/repo)"
            className="h-[56px] bg-white/60 border-none rounded-[16px] px-4 text-[16px] focus-visible:ring-black/10 font-inter"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={handleAnalyze}
          disabled={isLoading || !assessmentDoc || !repoUrl}
          className="w-full h-[64px] bg-black text-white hover:bg-black/90 rounded-[20px] text-[18px] font-semibold font-fustat transition-all transform active:scale-[0.98]"
        >
          {isLoading ? "Analyzing Submission..." : "Analyze Submission"}
        </Button>
        
        {error && (
          <p className="text-red-500 text-[14px] font-medium font-inter">{error}</p>
        )}
      </div>
    </div>
  );
};

export default AssessmentForm;
