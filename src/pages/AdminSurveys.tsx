import { MessageSquare } from "lucide-react";
import { trpc } from "../frontend/trpc";

export default function AdminSurveys() {
  const surveysQuery = trpc.survey.list.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const adminSurveys = surveysQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          Resident Well-being Inbox
        </h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Review feedback surveys left by residents during monthly public
          satisfaction initiatives.
        </p>
      </div>

      {adminSurveys.length === 0 ? (
        <div className="bg-white border border-slate-300 rounded p-10 text-center shadow-sm">
          <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-slate-900">Inbox is Empty</h3>
          <p className="text-slate-500 text-xs max-w-xs mx-auto mt-1">
            There are no surveys or qualitative reports registered by citizens in
            the system yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {adminSurveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white border border-slate-300 p-4 rounded flex flex-col justify-between shadow-sm space-y-3.5"
            >
              <div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      {survey.residentName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Period: {survey.month}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(survey.date).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs pt-2.5">
                  <div className="bg-slate-50 p-1.5 rounded flex justify-between items-center border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Happiness:</span>
                    <span className="font-bold text-slate-950 font-mono">
                      {survey.overallHappiness}/5
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded flex justify-between items-center border border-slate-200">
                    <span className="text-slate-500 text-[10px]">
                      Services Speed:
                    </span>
                    <span className="font-bold text-slate-950 font-mono">
                      {survey.localServicesRating}/5
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded flex justify-between items-center border border-slate-200">
                    <span className="text-slate-500 text-[10px]">
                      Road Quality:
                    </span>
                    <span className="font-bold text-slate-950 font-mono">
                      {survey.roadQualityRating}/5
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded flex justify-between items-center border border-slate-200">
                    <span className="text-slate-500 text-[10px]">
                      Cleanliness:
                    </span>
                    <span className="font-bold text-slate-950 font-mono">
                      {survey.cleanlinessRating}/5
                    </span>
                  </div>
                </div>

                {survey.feedbackText && (
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 mt-2.5 text-xs leading-normal">
                    <strong className="text-slate-500 block mb-0.5 text-[10px] uppercase tracking-wider">
                      Suggestions & Observations:
                    </strong>
                    <p className="text-slate-700">“{survey.feedbackText}”</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
