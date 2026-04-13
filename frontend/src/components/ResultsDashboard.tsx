import React, { useState } from 'react';
import { useAssesslyStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Play, MessageSquare, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface ResultsDashboardProps {
  onOpenChat: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ onOpenChat }) => {
  const { result, setResult } = useAssesslyStore();
  const [isTestLoading, setIsTestLoading] = useState(false);

  if (!result) return null;

  const handleRunTests = async () => {
    setIsTestLoading(true);
    toast.message("Initializing E2B Sandbox...", {
      description: "Running tests in a secure container. This takes ~15-30s."
    });

    try {
      const RUN_TESTS_URL = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL.replace('/analyze', '/run-tests')}` 
        : 'http://localhost:3000/Prod/run-tests';
        
      const response = await axios.post(RUN_TESTS_URL, { 
        assessmentId: result.assessmentId 
      });
      
      setResult({
        ...result,
        testExecuted: true,
        testResults: response.data.results
      });
      
      if (response.data.results.success) {
        toast.success("Tests passed successfully!");
      } else {
        toast.error("Some tests failed.", {
          description: "Check the test output for details."
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to run tests", { description: err.message });
    } finally {
      setIsTestLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-fustat text-black mb-2">Assessment Results</h1>
          <p className="text-[#505050] font-inter">Deep dive into candidate's submission</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="rounded-full font-inter">
            Export Report
          </Button>
          <Button className="bg-black text-white rounded-full font-inter">
            Share Link
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Score Card */}
        <Card className="col-span-1 border-none shadow-xl bg-white/60 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="bg-black text-white text-center py-8">
            <CardTitle className="text-lg font-medium font-inter opacity-80 uppercase tracking-widest">Overall Score</CardTitle>
            <div className="text-8xl font-bold font-fustat mt-2">{result.score}</div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <h3 className="flex items-center gap-2 text-green-600 font-bold font-inter mb-3">
                  <CheckCircle2 size={18} /> The Goods
                </h3>
                <ul className="space-y-2">
                  {result.summary.goods.map((item, i) => (
                    <li key={i} className="text-sm text-[#505050] font-inter leading-relaxed">• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-red-500 font-bold font-inter mb-3">
                  <XCircle size={18} /> The Bads
                </h3>
                <ul className="space-y-2">
                  {result.summary.bads.map((item, i) => (
                    <li key={i} className="text-sm text-[#505050] font-inter leading-relaxed">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-8">
          {/* Interview Questions */}
          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md rounded-[24px]">
            <CardHeader>
              <CardTitle className="font-fustat text-2xl">Targeted Interview Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.interviewQuestions.map((q, i) => (
                  <div key={i} className="p-4 bg-black/5 rounded-xl border border-black/5 font-inter text-[#505050]">
                    <span className="font-bold text-black mr-2">Q{i+1}:</span> {q}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Test Detection */}
          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md rounded-[24px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-fustat text-2xl">Test Suite</CardTitle>
              <Badge variant={result.testDetection.exists ? 'default' : 'secondary'} className="rounded-full">
                {result.testDetection.exists ? 'Tests Detected' : 'No Tests Found'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-black w-24">Language:</span>
                    <span className="text-[#505050]">{result.testDetection.language}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-black w-24">Command:</span>
                    <code className="bg-black/10 px-2 py-0.5 rounded text-black">{result.testDetection.command}</code>
                  </div>
                  {result.testDetection.libraries && result.testDetection.libraries.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-black w-24">Libraries:</span>
                      <div className="flex gap-1 flex-wrap">
                        {result.testDetection.libraries.map(lib => (
                          <Badge key={lib} variant="outline" className="text-[10px]">{lib}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleRunTests}
                  disabled={!result.testDetection.exists || isTestLoading}
                  className="h-16 px-8 bg-black text-white rounded-2xl flex items-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {isTestLoading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} fill="currentColor" />}
                  {isTestLoading ? "Running..." : "Run Tests"}
                </Button>
              </div>

              {/* Test Results Area */}
              {result.testExecuted && result.testResults && (
                <div className="mt-6 p-4 rounded-xl bg-black/5 border border-black/10 font-mono text-xs overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                    {result.testResults.success ? (
                      <CheckCircle className="text-green-600" size={16} />
                    ) : ( 
                      <AlertTriangle className="text-red-500" size={16} />
                    )}
                    {result.testResults.success ? "Tests Passed" : "Tests Failed"}
                  </div>
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {result.testResults.stdout}
                    {result.testResults.stderr}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RAG Chat Prompt */}
      <div className="flex items-center justify-between p-8 bg-black text-white rounded-[32px] shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
            <MessageSquare size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-fustat">AI Assistant</h3>
            <p className="text-white/60 font-inter">Ask anything about the candidate's codebase.</p>
          </div>
        </div>
        <Button 
          onClick={onOpenChat}
          className="bg-white text-black hover:bg-white/90 rounded-2xl px-8 h-12 flex items-center gap-2"
        >
          Open RAG Chat
        </Button>
      </div>
    </div>
  );
};

export default ResultsDashboard;
