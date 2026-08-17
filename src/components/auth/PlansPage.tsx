import { AuthLayout } from "./AuthLayout";
import { PlanCard } from "./PlanCard";

type PlansPageProps = {
  onCustomPlanClick: () => void;
  onSignInClick?: () => void;
};

export function PlansPage({ onCustomPlanClick, onSignInClick }: PlansPageProps) {
  return (
    <AuthLayout
      title="Fire Weather Dashboard"
      subtitle="Climate-informed fire danger products for operational planning and risk assessment."
      variant="wide"
    >
      <div className="flex flex-col gap-8">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 sm:text-base">
          <li>Fire Weather Index forecasts and historical trends</li>
          <li>Interactive maps and station-level views</li>
          <li>Probabilistic ranges for risk-informed planning</li>
          <li>Early signals for elevated fire weather conditions</li>
          <li>Operational insights for fire management and energy markets</li>
          <li>Regular forecast updates incorporating the latest climate signals</li>
        </ul>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch [&>div]:min-w-0 [&>div]:flex-1">
          <PlanCard
            title="Monthly plan"
            description="Forecast access for recurring monthly operational review."
            buttonLabel="Contact Us"
            href="https://climformatics.com/"
          />
          <PlanCard
            title="Annual plan"
            description="Longer-horizon planning access for annual review cycles."
            buttonLabel="Contact Us"
            href="https://climformatics.com/"
          />
          <PlanCard
            title="Custom plan"
            description="Organization access for approved partners using a reusable access code."
            buttonLabel="Get Started"
            onSelect={onCustomPlanClick}
          />
        </div>
      </div>

      {onSignInClick ? (
        <div className="mt-8 text-center text-xs">
          <span className="text-slate-500">Already have an account? </span>
          <button
            type="button"
            onClick={onSignInClick}
            className="whitespace-nowrap border-0 bg-transparent p-0 font-medium text-violet-600 shadow-none transition-colors hover:bg-transparent hover:text-violet-700"
          >
            Sign in
          </button>
        </div>
      ) : null}
    </AuthLayout>
  );
}
