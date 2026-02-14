import ScoreBar from './ScoreBar'

export default function MatchCard({ match }) {
  const org = match.organization

  const typeBadge = {
    supplier: 'bg-blue-100 text-blue-700',
    distributor: 'bg-purple-100 text-purple-700',
    nonprofit: 'bg-green-100 text-green-700',
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-800">{org?.name}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[org?.org_type] || ''}`}>
            {org?.org_type}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-700">{Math.round(match.score)}</div>
          <div className="text-xs text-slate-500">match score</div>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <ScoreBar score={match.capability_overlap} label="Capability" />
        <ScoreBar score={100 - Math.min(100, match.distance_miles / 5)} label="Proximity" />
        <ScoreBar score={match.need_score_component} label="Need Score" />
        <ScoreBar score={match.llm_score} label="AI Score" />
      </div>

      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 italic">
        {match.explanation}
      </p>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span>{match.distance_miles} mi away</span>
        {org?.certifications?.length > 0 && (
          <span>{org.certifications.join(', ')}</span>
        )}
      </div>
    </div>
  )
}
