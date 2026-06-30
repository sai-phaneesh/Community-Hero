import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { trpc } from "../../../frontend/trpc";
import { toast } from "sonner";

/**
 * Monthly Well-being Survey page - For residents to provide feedback
 */
export default function SurveyPage() {
  const { user } = useAuth();

  // Form state
  const [surveyHappiness, setSurveyHappiness] = useState<number>(4);
  const [surveyServices, setSurveyServices] = useState<number>(3);
  const [surveyRoads, setSurveyRoads] = useState<number>(3);
  const [surveyCleanliness, setSurveyCleanliness] = useState<number>(3);
  const [surveyFeedback, setSurveyFeedback] = useState("");
  const [surveySuccess, setSurveySuccess] = useState(false);
  const [surveyError, setSurveyError] = useState("");

  // tRPC hooks
  const submitSurveyMutation = trpc.survey.submit.useMutation();
  const surveysQuery = trpc.survey.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSurveyError("");
    setSurveySuccess(false);

    if (surveyFeedback.trim().length > 0 && surveyFeedback.trim().length < 10) {
      toast.error("Written feedback must be at least 10 characters long.");
      return;
    }

    const toastId = toast.loading("Submitting well-being metrics...");
    try {
      await submitSurveyMutation.mutateAsync({
        overallHappiness: surveyHappiness,
        localServicesRating: surveyServices,
        roadQualityRating: surveyRoads,
        cleanlinessRating: surveyCleanliness,
        feedbackText: surveyFeedback,
      });
      toast.success("Well-being survey logged! Thank you.", { id: toastId });
      setSurveySuccess(true);
      setSurveyFeedback("");
      if (user?.role === "admin") {
        surveysQuery.refetch();
      }
    } catch (err: any) {
      const errMsg = err.message || "Failed to submit survey";
      setSurveyError(errMsg);
      toast.error(errMsg, { id: toastId });
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          Monthly Citizen Feedback & Well-being
        </h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Your ratings directly drive accountability metrics, which are
          publicized for future political voting scorecards.
        </p>
      </div>

      {surveySuccess ? (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded text-center space-y-3 shadow-sm">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto animate-bounce" />
          <h3 className="font-bold text-sm text-slate-900">
            Feedback Submitted Successfully!
          </h3>
          <p className="text-slate-600 text-xs max-w-xs mx-auto">
            Thank you. Your voice contributes to the public service
            delivery scorecard of the administration and neighborhood
            handymen.
          </p>
          <button
            onClick={() => setSurveySuccess(false)}
            className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold transition-all hover:bg-slate-800 cursor-pointer shadow-sm"
          >
            Submit New Survey Update
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSurveySubmit}
          className="bg-white border border-slate-300 p-5 rounded space-y-4 shadow-sm"
        >
          {surveyError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-3.5 w-3.5" /> {surveyError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-0.5">
            <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase font-bold">
              ACTIVE PERIOD
            </span>
            <p className="text-xs text-slate-800 font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" /> June
              2026 Feedback Drive
            </p>
          </div>

          {/* Overall Happiness */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              How happy are you with your neighborhood overall?
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSurveyHappiness(rating)}
                  className={`flex-1 py-2 px-1 rounded text-xs font-bold transition-all ${
                    surveyHappiness === rating
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          {/* Local Services */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Rate quality of local services (water, sanitation, etc.)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSurveyServices(rating)}
                  className={`flex-1 py-2 px-1 rounded text-xs font-bold transition-all ${
                    surveyServices === rating
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          {/* Road Quality */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              How would you rate road quality in your area?
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSurveyRoads(rating)}
                  className={`flex-1 py-2 px-1 rounded text-xs font-bold transition-all ${
                    surveyRoads === rating
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          {/* Cleanliness */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              How clean is your neighborhood?
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSurveyCleanliness(rating)}
                  className={`flex-1 py-2 px-1 rounded text-xs font-bold transition-all ${
                    surveyCleanliness === rating
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Additional Feedback (Optional, min 10 chars)
            </label>
            <textarea
              rows={3}
              value={surveyFeedback}
              onChange={(e) => setSurveyFeedback(e.target.value)}
              placeholder="Share your suggestions, concerns, or positive feedback..."
              className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-slate-900 text-white font-bold px-4 py-1.5 rounded text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
            >
              Submit Survey
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
