import ScoreBar from './ScoreBar'

export default function MatchCard({ match }) {
  const org = match.organization

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-slate-800">{org?.name}</h4>
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
            {org?.org_type}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">{Math.round(match.score)}</div>
          <div className="text-xs text-slate-400">match score</div>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <ScoreBar score={match.capability_overlap} label="Capability" />
        <ScoreBar score={100 - Math.min(100, match.distance_miles / 5)} label="Proximity" />
        <ScoreBar score={match.need_score_component} label="Need Score" />
        <ScoreBar score={match.llm_score} label="AI Score" />
      </div>

      <p className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
        {match.explanation}
      </p>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span>{match.distance_miles} mi away</span>
        {org?.certifications?.length > 0 && (
          <span>{org.certifications.join(', ')}</span>
        )}
      </div>
    </div>
  )
}
