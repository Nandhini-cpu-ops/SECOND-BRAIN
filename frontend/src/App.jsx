import { useMemo, useState } from 'react'
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts'

const steps = [
  'What paths are you considering?',
  'What matters most to you?',
  "What's your current situation?",
  'What are you most afraid of?',
]

const valueOptions = [
  'Financial Security',
  'Growth',
  'Freedom',
  'Impact',
  'Relationships',
]

const confidenceColor = {
  High: 'bg-emerald-500',
  Medium: 'bg-amber-400',
  Low: 'bg-rose-500',
}

const dimensionIcons = {
  Financial: '💰',
  Growth: '📈',
  Freedom: '🕊️',
  Risk: '⚠️',
  Identity: '🧭',
  Reversibility: '🔄',
}

const pathAccentColors = ['path-blue', 'path-teal', 'path-amber']
const radarColors = ['#1B6CA8', '#2A9D8F', '#E8A838']

function DimensionRadar({ path, colorIndex }) {
  const radarData = [
    { dimension: 'Financial', score: path.dimensions.financial.score },
    { dimension: 'Growth', score: path.dimensions.growth.score },
    { dimension: 'Freedom', score: path.dimensions.freedom.score },
    { dimension: 'Risk', score: path.dimensions.risk.score },
    { dimension: 'Identity', score: path.dimensions.identity.score },
    { dimension: 'Reversibility', score: path.dimensions.reversibility.score },
  ]

  const accent = radarColors[colorIndex % radarColors.length]
  return (
    <div className={`rounded-[1rem] border-2 bg-white p-6 shadow-soft`} style={{ borderColor: accent }}>
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-slate-950">{path.name}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">{path.narrative_3yr}</p>
      </div>
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData} outerRadius="80%">
            <PolarGrid stroke="#d8e2f1" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: '#334155', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tickCount={6} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Radar
              name={path.name}
              dataKey="score"
              stroke={accent}
              fill={accent}
              fillOpacity={0.5}
              strokeWidth={2.5}
            />
            <Tooltip formatter={(value) => [`${value}/10`, 'Score']} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Object.entries(path.dimensions).map(([key, value]) => (
          <div key={key} className="space-y-2 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-base">{dimensionIcons[key] || '•'}</span>
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              </div>
              <span>{value.score}/10</span>
            </div>
            <div className="flex items-center gap-2 text-[0.85rem] text-slate-600">
              <span className={`inline-flex h-2.5 w-2.5 rounded-full ${confidenceColor[value.confidence] || 'bg-slate-400'}`} />
              <span>{value.confidence} confidence</span>
            </div>
            <div className="text-sm text-slate-700">{value.reasoning}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Next step</div>
        <div className="mt-2 font-semibold text-slate-900">{path.next_step}</div>
      </div>
    </div>
  )
}

function ResultCard({ path, index }) {
  return <DimensionRadar path={path} colorIndex={index} />
}

export default function App() {
  const [step, setStep] = useState(0)
  const [pathsText, setPathsText] = useState('')
  const [selectedValues, setSelectedValues] = useState([])
  const [situation, setSituation] = useState('')
  const [fears, setFears] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [chosenPath, setChosenPath] = useState(null)
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true)
  const [whatIfQuestion, setWhatIfQuestion] = useState('')
  const [whatIfResponses, setWhatIfResponses] = useState([])
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [scheduleLoadingByPath, setScheduleLoadingByPath] = useState({})
  const [schedulePlans, setSchedulePlans] = useState({})
  const [checkedActions, setCheckedActions] = useState({})

  const paths = useMemo(
    () => pathsText.split('\n').map((line) => line.trim()).filter(Boolean),
    [pathsText],
  )

  const canContinue = useMemo(() => {
    if (step === 0) return paths.length > 0
    if (step === 1) return selectedValues.length > 0
    if (step === 2) return situation.trim().length > 0
    if (step === 3) return fears.trim().length > 0
    return true
  }, [step, paths.length, selectedValues.length, situation, fears])

  const handleValueToggle = (value) => {
    setSelectedValues((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setWhatIfResponses([])

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paths,
          values: selectedValues,
          situation,
          fears,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Server error')
      }

      const data = await response.json()
      setResult(data)
      setStep(4)
    } catch (err) {
      setError(err.message || 'Unable to get analysis from backend.')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatIf = async () => {
    if (!whatIfQuestion.trim() || !result) return

    setWhatIfLoading(true)
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:8000/whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_paths: result.paths.map((path) => path.name),
          original_situation: situation,
          original_fears: fears,
          what_if_question: whatIfQuestion,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Server error')
      }

      const data = await response.json()
      setWhatIfResponses((current) => [...current, { question: whatIfQuestion, ...data }])
      setWhatIfQuestion('')
    } catch (err) {
      setError(err.message || 'Unable to simulate what-if scenario.')
    } finally {
      setWhatIfLoading(false)
    }
  }

  const reset = () => {
    setStep(0)
    setPathsText('')
    setSelectedValues([])
    setSituation('')
    setFears('')
    setResult(null)
    setError('')
    setLoading(false)
    setChosenPath(null)
    setScheduleLoadingByPath({})
    setSchedulePlans({})
    setCheckedActions({})
  }

  const handleBuildSchedule = async (path, index) => {
    const pathKey = path.name
    setScheduleLoadingByPath((s) => ({ ...s, [pathKey]: true }))
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:8000/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path_name: path.name,
          next_step: path.next_step,
          situation,
          values: result.values || selectedValues,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Server error')
      }

      const data = await response.json()
      setSchedulePlans((s) => ({ ...s, [pathKey]: { ...data, _index: index } }))

      // initialize checked actions
      const actions = [
        ...(data.thirty_days?.actions || []),
        ...(data.sixty_days?.actions || []),
        ...(data.ninety_days?.actions || []),
      ]
      setCheckedActions((c) => ({ ...c, [pathKey]: actions.map(() => false) }))
    } catch (err) {
      setError(err.message || 'Unable to build 90-day plan.')
    } finally {
      setScheduleLoadingByPath((s) => ({ ...s, [pathKey]: false }))
    }
  }

  const toggleActionChecked = (pathName, actionIndex) => {
    setCheckedActions((c) => ({
      ...c,
      [pathName]: c[pathName].map((v, i) => (i === actionIndex ? !v : v)),
    }))
  }

  const hideSchedule = (pathName) => {
    setSchedulePlans((s) => {
      const copy = { ...s }
      delete copy[pathName]
      return copy
    })
    setCheckedActions((c) => {
      const copy = { ...c }
      delete copy[pathName]
      return copy
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-[#12293f] to-background-end px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="animate-fade-in-step rounded-[1.5rem] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-sm">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent-teal/90">PathMapper</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">Map your life choices with thoughtful clarity</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200">
              Answer simple questions about your options, what matters most, and what you worry about. Then get a calm, structured view of each path.
            </p>
          </div>
        </header>

        <section className="animate-fade-in-step rounded-[1.5rem] border border-white/10 bg-card/95 p-8 shadow-soft text-slate-900">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-950">{step < 4 ? 'Step ' + (step + 1) : 'Your Path Analysis'}</h2>
              {step < 4 ? <p className="mt-2 text-sm leading-7 text-slate-600">{steps[step]}</p> : <p className="mt-2 text-sm leading-7 text-slate-600">Review your analysis and reflect on the results.</p>}
            </div>
            {step < 4 && (
              <div className="w-full max-w-xs rounded-full bg-slate-100/80 p-1">
                <div className="text-xs uppercase tracking-[0.35em] text-accent-teal">Progress</div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div className={`h-2 rounded-full bg-accent-teal transition-all duration-500`} style={{ width: `${((step + 1) / 4) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {step === 0 && (
            <div className="space-y-6 animate-fade-in-step">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.35em] text-label-teal">Paths</div>
                <label className="block text-lg font-semibold text-slate-900">What paths are you considering?</label>
              </div>
              <textarea
                rows={6}
                value={pathsText}
                onChange={(event) => setPathsText(event.target.value)}
                placeholder="Enter each path on its own line, for example:\nStart a new business\nMove to a new city\nReturn to school"
                className="w-full rounded-[1rem] border border-slate-300 bg-slate-50/95 px-5 py-4 text-sm leading-7 text-slate-900 shadow-sm outline-none transition duration-200 focus:border-accent-teal focus:ring-4 focus:ring-accent-teal/20"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-fade-in-step">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.35em] text-label-teal">Values</div>
                <p className="text-lg font-semibold text-slate-900">Select the values that matter most to you.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {valueOptions.map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => handleValueToggle(value)}
                    className={`w-full rounded-[1rem] border px-5 py-4 text-left text-sm leading-6 shadow-sm transition duration-200 ${selectedValues.includes(value) ? 'border-accent-teal bg-accent-teal/10 text-slate-950' : 'border-slate-300 bg-white text-slate-800 hover:border-accent-teal hover:bg-accent-teal/5'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in-step">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.35em] text-label-teal">Situation</div>
                <label className="block text-lg font-semibold text-slate-900">What's your current situation?</label>
              </div>
              <textarea
                rows={5}
                value={situation}
                onChange={(event) => setSituation(event.target.value)}
                placeholder="Describe your current work, life, and anything else that matters right now."
                className="w-full rounded-[1rem] border border-slate-300 bg-slate-50/95 px-5 py-4 text-sm leading-7 text-slate-900 shadow-sm outline-none transition duration-200 focus:border-accent-teal focus:ring-4 focus:ring-accent-teal/20"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in-step">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.35em] text-label-teal">Risks</div>
                <label className="block text-lg font-semibold text-slate-900">What are you most afraid of?</label>
              </div>
              <textarea
                rows={5}
                value={fears}
                onChange={(event) => setFears(event.target.value)}
                placeholder="Share the risks, doubts, or outcomes you worry about most."
                className="w-full rounded-[1rem] border border-slate-300 bg-slate-50/95 px-5 py-4 text-sm leading-7 text-slate-900 shadow-sm outline-none transition duration-200 focus:border-accent-teal focus:ring-4 focus:ring-accent-teal/20"
              />
            </div>
          )}

          {step === 4 && result && (
            <div className="space-y-8">
              <div className="rounded-[1rem] bg-[#FFF4D6] p-5 shadow-sm">
                <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#8d6507]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F8D88B]/20 text-[#8d6507]">⚠️</span>
                  <span>These are thinking tools, not predictions</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-800">PathMapper helps you see assumptions, risks, and potential outcomes. Use this as a guide, not a decision.</p>
              </div>

              <div className="space-y-8">
                <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-sky-100 via-slate-100 to-cyan-50 p-6 shadow-soft">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-950">How PathMapper reasoned through this</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-700">A simple flow of your input, the assumptions we noticed, and the scoring approach.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReasoningExpanded((prev) => !prev)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition duration-200 hover:bg-white"
                    >
                      {isReasoningExpanded ? 'Hide Reasoning' : 'Show Reasoning'}
                    </button>
                  </div>

                  {isReasoningExpanded && (
                    <div className="mt-6 space-y-6">
                      <div className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm">
                        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">What you told us</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {result.paths.map((path) => (
                            <span key={path.name} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">{path.name}</span>
                          ))}
                          {result.values?.map((value) => (
                            <span key={value} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">{value}</span>
                          ))}
                          {result.situation && (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">Situation</span>
                          )}
                          {result.fears && (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700">Fears</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm">
                        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">What we noticed</div>
                        <p className="mt-3 text-sm leading-7 text-slate-700">Before analyzing, we identified these assumptions in your framing:</p>
                        <ol className="mt-4 space-y-3 pl-5 text-slate-700">
                          {result.hidden_assumptions.map((item, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-sm text-slate-700">💡</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm">
                        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">How we scored each path</div>
                        <p className="mt-3 text-sm leading-7 text-slate-700">
                          Each path was scored across 6 dimensions using structured AI reasoning, not a formula. Confidence levels (High/Medium/Low) reflect how certain these projections are based on available context.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {result.paths.map((path, index) => (
                    <div key={`${path.name}-${index}`} className="space-y-4">
                      <ResultCard path={path} index={index} />

                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => handleBuildSchedule(path, index)}
                          disabled={scheduleLoadingByPath[path.name]}
                          className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-md transition duration-200 ${index === 0 ? 'bg-[#1B6CA8]' : index === 1 ? 'bg-[#2A9D8F]' : 'bg-[#E8A838]'} hover:opacity-95 disabled:opacity-50`}
                        >
                          {scheduleLoadingByPath[path.name] ? 'Building your 90-day plan...' : `Build My 90-Day Plan for ${path.name}`}
                        </button>
                      </div>

                      {schedulePlans[path.name] && (
                        <div className="mt-4 rounded-[1rem] bg-white p-6 shadow-soft text-slate-900">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {/* Days 1-30 */}
                            <div className="border-t-4 pt-4" style={{ borderTopColor: radarColors[index % radarColors.length] }}>
                              <div className="text-sm font-semibold text-slate-600">Days 1-30</div>
                              <div className="mt-1 text-xs text-slate-500">{schedulePlans[path.name].thirty_days?.theme}</div>
                              <ul className="mt-3 space-y-2">
                                {(schedulePlans[path.name].thirty_days?.actions || []).map((action, aIdx) => {
                                  const globalIndex = aIdx
                                  const checked = (checkedActions[path.name] || [])[globalIndex]
                                  return (
                                    <li key={aIdx} className="flex items-start gap-3">
                                      <input type="checkbox" checked={!!checked} onChange={() => toggleActionChecked(path.name, globalIndex)} />
                                      <span className="text-sm">{action}</span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>

                            {/* Days 31-60 */}
                            <div className="border-t-4 pt-4" style={{ borderTopColor: radarColors[index % radarColors.length] }}>
                              <div className="text-sm font-semibold text-slate-600">Days 31-60</div>
                              <div className="mt-1 text-xs text-slate-500">{schedulePlans[path.name].sixty_days?.theme}</div>
                              <ul className="mt-3 space-y-2">
                                {(schedulePlans[path.name].sixty_days?.actions || []).map((action, aIdx) => {
                                  const globalIndex = (schedulePlans[path.name].thirty_days?.actions || []).length + aIdx
                                  const checked = (checkedActions[path.name] || [])[globalIndex]
                                  return (
                                    <li key={aIdx} className="flex items-start gap-3">
                                      <input type="checkbox" checked={!!checked} onChange={() => toggleActionChecked(path.name, globalIndex)} />
                                      <span className="text-sm">{action}</span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>

                            {/* Days 61-90 */}
                            <div className="border-t-4 pt-4" style={{ borderTopColor: radarColors[index % radarColors.length] }}>
                              <div className="text-sm font-semibold text-slate-600">Days 61-90</div>
                              <div className="mt-1 text-xs text-slate-500">{schedulePlans[path.name].ninety_days?.theme}</div>
                              <ul className="mt-3 space-y-2">
                                {(schedulePlans[path.name].ninety_days?.actions || []).map((action, aIdx) => {
                                  const globalIndex = (schedulePlans[path.name].thirty_days?.actions || []).length + (schedulePlans[path.name].sixty_days?.actions || []).length + aIdx
                                  const checked = (checkedActions[path.name] || [])[globalIndex]
                                  return (
                                    <li key={aIdx} className="flex items-start gap-3">
                                      <input type="checkbox" checked={!!checked} onChange={() => toggleActionChecked(path.name, globalIndex)} />
                                      <span className="text-sm">{action}</span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-6 rounded-lg bg-slate-50 p-4 border border-slate-200">
                            <div className="text-sm text-slate-600">Your First Action — Do This Today:</div>
                            <div className="mt-2 font-bold text-slate-900">{schedulePlans[path.name].first_action_today}</div>
                          </div>

                          <div className="mt-4">
                            <button onClick={() => hideSchedule(path.name)} className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Hide Plan</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                  <h3 className="text-lg font-semibold text-navy">Explore a Scenario</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">Ask what would happen under a specific scenario — PathMapper will reason through it honestly.</p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={whatIfQuestion}
                      onChange={(event) => setWhatIfQuestion(event.target.value)}
                      placeholder="e.g. What if I fail at the startup after 1 year? What if I get a scholarship?"
                      className="w-full rounded-[1rem] border border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-accent-teal focus:ring-4 focus:ring-accent-teal/20"
                    />
                    <button
                      type="button"
                      onClick={handleWhatIf}
                      disabled={!whatIfQuestion.trim() || whatIfLoading}
                      className="inline-flex items-center justify-center rounded-full bg-accent-teal px-6 py-3 text-sm font-semibold text-white shadow-md shadow-accent-teal/25 transition duration-200 hover:scale-[1.02] hover:bg-[#238c7d] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {whatIfLoading ? 'Simulating your scenario...' : 'Explore This Scenario'}
                    </button>
                  </div>

                  {whatIfResponses.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {whatIfResponses.map((item, index) => (
                        <div key={`${item.question}-${index}`} className="rounded-[1.5rem] border-l-4 border-amber-400 bg-white p-6 shadow-sm">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">What If?</p>
                              <p className="mt-1 font-semibold text-slate-900">{item.question}</p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                              <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.confidence === 'High' ? 'bg-emerald-500' : item.confidence === 'Medium' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                              <span>{item.confidence} confidence</span>
                            </div>
                          </div>
                          <div className="mt-5 space-y-4 text-sm text-slate-700">
                            <div>
                              <div className="font-semibold text-slate-900">What likely happens:</div>
                              <p className="mt-2">{item.likely_outcome}</p>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Recovery options:</div>
                              <ul className="mt-2 list-disc pl-5">
                                {item.recovery_paths.map((path, pathIndex) => (
                                  <li key={pathIndex}>{path}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">How this changes your tradeoffs:</div>
                              <p className="mt-2">{item.tradeoff_impact}</p>
                            </div>
                            <div className="text-sm italic text-slate-600">
                              <span className="font-semibold text-slate-900">What we're uncertain about:</span> {item.honest_uncertainty}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                  <h3 className="text-lg font-semibold text-navy">What We Don't Know</h3>
                  <ul className="mt-4 space-y-3 list-disc pl-5 text-slate-700">
                    {result.what_i_dont_know.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {!chosenPath ? (
                  <div className="rounded-3xl border-2 border-accent-teal bg-white/80 p-8 shadow-soft">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-slate-950">What will you do next?</h3>
                      <p className="mt-2 text-base text-slate-600">Make your choice and commit to the next step.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {result.paths.map((path, index) => (
                        <button
                          key={`${path.name}-${index}`}
                          type="button"
                          onClick={() => setChosenPath(path)}
                          className="group rounded-[1rem] border-2 border-slate-300 bg-white px-6 py-4 text-left shadow-sm transition duration-200 hover:border-accent-teal hover:bg-accent-teal/5 hover:shadow-md"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-accent-teal transition duration-200">
                            I'm choosing:<br />
                            <span className="text-lg">{path.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-8 shadow-soft">
                    <div className="mb-6 flex items-start gap-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl text-white flex-shrink-0">
                        ✓
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-emerald-900">You've chosen <span className="text-emerald-700">{chosenPath.name}</span></h3>
                      </div>
                    </div>
                    <div className="mb-6 rounded-[1rem] bg-white/60 p-6 border border-emerald-200">
                      <p className="text-xs uppercase tracking-[0.18em] font-semibold text-emerald-700 mb-2">Your single most important first step in the next 7 days:</p>
                      <p className="text-lg font-bold text-slate-900">{chosenPath.next_step}</p>
                    </div>
                    <div className="rounded-[1rem] bg-white/40 p-4 border border-emerald-200/50">
                      <p className="text-sm text-slate-700 italic">
                        <span className="font-semibold">PathMapper</span> helped you think — this decision is entirely yours.
                      </p>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setChosenPath(null)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition duration-200 hover:border-slate-400 hover:bg-slate-50"
                      >
                        Review Paths Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-3xl bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                disabled={step === 0}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition duration-200 hover:-translate-y-0.5 hover:border-accent-teal hover:bg-accent-teal/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
            ) : null}

            {step < 4 ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => {
                  if (step < 3) {
                    setStep((prev) => prev + 1)
                  } else {
                    handleSubmit()
                  }
                }}
                className="inline-flex items-center justify-center rounded-full bg-accent-teal px-6 py-3 text-sm font-semibold text-white shadow-md shadow-accent-teal/25 transition duration-200 hover:scale-[1.02] hover:bg-[#238c7d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step < 3 ? 'Next' : 'Analyze My Paths'}
              </button>
            ) : null}

            {loading && (
              <div className="inline-flex items-center gap-3 rounded-full bg-slate-100 px-4 py-3 text-sm text-slate-700">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-teal border-t-transparent" />
                Thinking through your paths...
              </div>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition duration-200 hover:-translate-y-0.5 hover:border-accent-teal hover:bg-accent-teal/10"
              >
                Start Over
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
