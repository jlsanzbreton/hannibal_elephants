import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { clamp, computeCurveResponse, computeEffectiveCoefficient, createSeedModel, getNodeById, getStressScenarioById, ratioToCoefficient, resetModel, validateImportedModel, computeRobustness } from './model/engine'
import type { ExportedModel, InfluenceRelation, SystemNode, SystemProfile } from './model/types'

const STORAGE_KEY = 'hannibal-elephants-model'
type Simulations = Record<string, SystemNode[]>

const pyramidLayers = [
  ['ecological_resource_base', 'political_access'],
  ['capture_replacement_pool', 'feed_water_movement', 'husbandry_veterinary_knowledge', 'training_tradition', 'mahout_pool'],
  ['combined_arms_doctrine', 'elephant_availability', 'military_integration', 'enemy_adaptation'],
  ['battlefield_effect', 'power_demonstration'],
]

function createProfileSimulations(nodes: SystemNode[], profiles: SystemProfile[]): Simulations {
  return Object.fromEntries(profiles.map((profile) => {
    const initialNodes = nodes.map((node) => {
    const value = profile.nodeValues[node.id] ?? node.baselineValue
    return { ...node, baselineValue: value, currentValue: value, boundaryEnergy: 0, bufferRemaining: node.bufferCapacity }
    })
    return [profile.id, synchronizeOutcome(initialNodes)]
  }))
}

function App() {
  const [model, setModel] = useState(() => createSeedModel())
  const [simulations, setSimulations] = useState<Simulations>(() => {
    const seed = createSeedModel()
    return createProfileSimulations(seed.nodes, seed.profiles)
  })
  const [isRunning, setIsRunning] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState('indian-source-ecosystem')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeDraft, setNodeDraft] = useState<SystemNode | null>(null)
  const [relationDrafts, setRelationDrafts] = useState<InfluenceRelation[]>([])
  const [showDependencies, setShowDependencies] = useState(false)
  const [activeRelationId, setActiveRelationId] = useState<string | null>(null)
  const [helpKey, setHelpKey] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      const validation = validateImportedModel(JSON.parse(stored) as Partial<ExportedModel>)
      if (validation.valid && validation.value) {
        const value = validation.value
        setModel((current) => ({ ...current, nodes: value.nodes, relations: value.relations, profiles: value.profiles, scenarios: value.scenarios, selectedProfileId: value.profiles[0]?.id ?? current.selectedProfileId, selectedScenarioId: value.scenarios[0]?.id ?? current.selectedScenarioId }))
        setSimulations(createProfileSimulations(value.nodes, value.profiles))
        setSelectedProfileId(value.profiles[0]?.id ?? 'indian-source-ecosystem')
      }
    } catch {
      setErrorMessage('Stored model could not be loaded. Seed data remains available.')
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), nodes: model.nodes, relations: model.relations, profiles: model.profiles, scenarios: model.scenarios } satisfies ExportedModel))
    } catch {
      // Storage quota exceeded or unavailable (e.g. Safari private mode) — app keeps working without autosave.
      setErrorMessage('Could not autosave to local storage. Your changes will not persist after closing this tab.')
    }
  }, [model.nodes, model.relations, model.profiles, model.scenarios])

  useEffect(() => {
    if (!helpKey) return undefined
    const timer = window.setTimeout(() => setHelpKey(null), 4500)
    return () => window.clearTimeout(timer)
  }, [helpKey])

  const runSimulationStep = () => {
    const scenario = getStressScenarioById(model.scenarios, model.selectedScenarioId)
    setSimulations((current) => Object.fromEntries(Object.entries(current).map(([profileId, nodes]) => [profileId, advanceNodes(nodes, model.relations, scenario?.pressureByNode ?? {}, model.stressIntensity)])))
    setModel((current) => ({ ...current, step: current.step + 1 }))
  }

  useEffect(() => {
    if (!isRunning) return undefined
    const timer = window.setTimeout(runSimulationStep, 650)
    return () => window.clearTimeout(timer)
  }, [isRunning, model.step, model.relations, model.scenarios, model.selectedScenarioId, model.stressIntensity])

  const selectedScenario = useMemo(() => getStressScenarioById(model.scenarios, model.selectedScenarioId) ?? model.scenarios[0], [model.scenarios, model.selectedScenarioId])
  const profileMetrics = useMemo(() => Object.fromEntries(model.profiles.map((profile) => {
    const nodes = simulations[profile.id] ?? model.nodes
    return [profile.id, computeRobustness(nodes, Object.fromEntries(nodes.map((node) => [node.id, node.currentValue])))]
  })) as Record<string, ReturnType<typeof computeRobustness>>, [model.nodes, model.profiles, simulations])
  const selectedNodes = simulations[selectedProfileId] ?? model.nodes
  const selectedNode = selectedNodes.find((node) => node.id === selectedNodeId) ?? null

  const saveNodeDraft = () => {
    if (!nodeDraft || !selectedNode) return
    const relationError = validateRelations(relationDrafts, model.nodes)
    if (relationError) {
      setErrorMessage(relationError)
      return
    }
    setSimulations((current) => ({
      ...current,
      [selectedProfileId]: current[selectedProfileId].map((node) => node.id === nodeDraft.id ? { ...nodeDraft, currentValue: nodeDraft.baselineValue } : node),
    }))
    setModel((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === nodeDraft.id ? { ...node, ...nodeDraft, baselineValue: node.baselineValue, currentValue: node.currentValue, boundaryEnergy: node.boundaryEnergy, bufferRemaining: node.bufferRemaining } : node),
      profiles: current.profiles.map((profile) => profile.id === selectedProfileId ? { ...profile, nodeValues: { ...profile.nodeValues, [nodeDraft.id]: nodeDraft.baselineValue } } : profile),
      relations: relationDrafts,
    }))
    setErrorMessage('')
    setNodeDraft(null)
    setShowDependencies(false)
    setActiveRelationId(null)
  }

  const openNodeEditor = (profileId: string, node: SystemNode) => {
    setSelectedProfileId(profileId)
    setSelectedNodeId(node.id)
    setNodeDraft({ ...node })
    setRelationDrafts(model.relations.map((relation) => ({ ...relation })))
    setShowDependencies(false)
    setActiveRelationId(null)
  }

  const updateRelationDraft = (relationId: string, field: keyof InfluenceRelation, value: string | number | boolean) => {
    setRelationDrafts((current) => current.map((relation) => relation.id === relationId ? { ...relation, [field]: value } : relation))
  }

  const addRelationDraft = () => {
    if (!nodeDraft) return
    const target = model.nodes.find((node) => node.id !== nodeDraft.id)
    if (!target) return
    const relation: InfluenceRelation = {
      id: `relation-${Date.now()}`,
      source: nodeDraft.id,
      target: target.id,
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.5,
      mediumAvailability: 1,
      delaySteps: 0,
      activationThreshold: 0,
      mediumName: 'User-defined medium',
      mediumDescription: 'Connection added in the dependency editor.',
      rationale: 'User-defined exploratory relationship.',
      evidenceConfidence: 0,
      evidenceStatus: 'assumption',
      sources: [],
      enabled: true,
    }
    setRelationDrafts((current) => [...current, relation])
    setActiveRelationId(relation.id)
  }

  const closeEditor = () => {
    setNodeDraft(null)
    setShowDependencies(false)
    setActiveRelationId(null)
    setHelpKey(null)
  }

  const resetAll = () => {
    const reset = resetModel(model)
    setModel(reset)
    setSimulations(createProfileSimulations(reset.nodes, reset.profiles))
    setIsRunning(false)
  }

  const exportModel = () => {
    const payload: ExportedModel = { schemaVersion: 1, exportedAt: new Date().toISOString(), nodes: model.nodes, relations: model.relations, profiles: model.profiles, scenarios: model.scenarios }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'hannibal-elephants-model.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="title-block"><div className="eyebrow">ILLUSTRATIVE HYPOTHESIS MODEL</div><h1>Hannibal’s Elephants</h1></div>
      <div className="toolbar">
        <div className="select-row">
          <select aria-label="Profile being edited" value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>{model.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
          <select aria-label="Scenario selector" value={model.selectedScenarioId} onChange={(event) => setModel((current) => ({ ...current, selectedScenarioId: event.target.value }))}>{model.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select>
          <label className="slider-control"><span>Stress</span><input type="range" min="0" max="2" step="0.1" value={model.stressIntensity} onChange={(event) => setModel((current) => ({ ...current, stressIntensity: Number(event.target.value) }))} /></label>
          <span className="step-counter">Step {model.step}</span>
        </div>
        <div className="button-row"><button type="button" onClick={runSimulationStep}>Step</button><button type="button" className={isRunning ? 'active' : ''} onClick={() => setIsRunning((current) => !current)}>{isRunning ? 'Pause' : 'Run'}</button><button type="button" onClick={resetAll}>Reset</button><button type="button" className="secondary-action" onClick={exportModel}>Export</button></div>
      </div>
    </header>
    <div className="workspace-label">{selectedScenario?.name ?? 'Baseline'} <span>· Select a node to edit its assumptions</span></div>
    <main className="comparison-grid">
      {model.profiles.map((profile, index) => {
        const nodes = simulations[profile.id] ?? model.nodes
        const metrics = profileMetrics[profile.id]
        const otherProfile = model.profiles.find((entry) => entry.id !== profile.id)
        const otherMetrics = otherProfile ? profileMetrics[otherProfile.id] : undefined
        return <section key={profile.id} className={`profile-card ${index === 0 ? 'source' : 'transplant'}`}>
          <div className="profile-header"><h2>{profile.name}</h2><div className="score-row"><Score label="System robustness" kind="robustness" value={metrics.availability} otherValue={otherMetrics?.availability} /><Score label="Breakdown pressure" kind="pressure" value={100 - metrics.battlefield} otherValue={otherMetrics ? 100 - otherMetrics.battlefield : undefined} /></div></div>
          <div className="pyramid" aria-label={`${profile.name} system pyramid`}>
            {pyramidLayers.map((layer, layerIndex) => <div className={`pyramid-layer layer-${layerIndex + 1}`} key={`layer-${layerIndex}`}>
              {layer.map((nodeId) => {
                const node = nodes.find((entry) => entry.id === nodeId)
                return node ? <NodeBox key={node.id} node={node} active={node.id === selectedNodeId && profile.id === selectedProfileId} onClick={() => openNodeEditor(profile.id, node)} /> : null
              })}
            </div>)}
          </div>
        </section>
      })}
    </main>
    {nodeDraft && selectedNode && <div className="modal-backdrop" role="presentation" onMouseDown={closeEditor}><section className={`node-modal ${showDependencies ? 'dependencies-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="node-editor-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close editor" onClick={closeEditor}>×</button><div className="inspector-kicker">{selectedProfileId} / {nodeDraft.category}</div><h3 id="node-editor-title">{nodeDraft.label}</h3><p>{nodeDraft.detailedMeaning}</p><div className="field-grid"><NumberField label="Starting value" help="The value used when this profile is reset or first loaded." helpKey="baselineValue" activeHelp={helpKey} onHelp={setHelpKey} value={nodeDraft.baselineValue} onChange={(value) => setNodeDraft((draft) => draft ? { ...draft, baselineValue: value } : draft)} /><NumberField label="Threshold" help="Pressure level at which this node begins to release accumulated stress." helpKey="energyThreshold" activeHelp={helpKey} onHelp={setHelpKey} value={nodeDraft.energyThreshold} onChange={(value) => setNodeDraft((draft) => draft ? { ...draft, energyThreshold: value } : draft)} /><NumberField label="Buffer capacity" help="Maximum pressure this node can absorb before it reaches the boundary." helpKey="bufferCapacity" activeHelp={helpKey} onHelp={setHelpKey} value={nodeDraft.bufferCapacity} onChange={(value) => setNodeDraft((draft) => draft ? { ...draft, bufferCapacity: value } : draft)} /><NumberField label="Absorption" help="Share of incoming pressure taken up by the remaining buffer at each step." helpKey="absorptionRate" activeHelp={helpKey} onHelp={setHelpKey} step="0.01" value={nodeDraft.absorptionRate} onChange={(value) => setNodeDraft((draft) => draft ? { ...draft, absorptionRate: value } : draft)} /><NumberField label="Dissipation" help="Pressure that naturally leaves the node at each simulation step." helpKey="dissipationRate" activeHelp={helpKey} onHelp={setHelpKey} step="0.01" value={nodeDraft.dissipationRate} onChange={(value) => setNodeDraft((draft) => draft ? { ...draft, dissipationRate: value } : draft)} /><NumberField label="Recovery" help="Buffer capacity restored at each simulation step." helpKey="recoveryRate" activeHelp={helpKey} onHelp={setHelpKey} step="0.01" value={nodeDraft.recoveryRate} onChange={(value) => setNodeDraft((draft) => draft ? { ...draft, recoveryRate: value } : draft)} /><NumberField label="Vulnerability" help="How strongly released pressure changes the node's live value." helpKey="vulnerability" activeHelp={helpKey} onHelp={setHelpKey} step="0.01" value={nodeDraft.vulnerability} onChange={(value) => setNodeDraft((draft) => draft ? { ...draft, vulnerability: value } : draft)} /><NumberField label="Release fraction" help="Share of pressure above the threshold released into the simulation." helpKey="releaseFraction" activeHelp={helpKey} onHelp={setHelpKey} step="0.01" value={nodeDraft.releaseFraction} onChange={(value) => setNodeDraft((draft) => draft ? { ...draft, releaseFraction: value } : draft)} /></div><div className="modal-actions"><button type="button" className={showDependencies ? 'active' : ''} onClick={() => setShowDependencies((current) => !current)}>Dependencies</button><button type="button" onClick={closeEditor}>Cancel</button><button type="button" className="save-button" onClick={saveNodeDraft}>Save changes</button></div>{showDependencies && <DependencyEditor node={nodeDraft} nodes={model.nodes} relations={relationDrafts} activeRelationId={activeRelationId} onSelect={setActiveRelationId} onUpdate={updateRelationDraft} onAdd={addRelationDraft} onRemove={(relationId) => { setRelationDrafts((current) => current.filter((relation) => relation.id !== relationId)); setActiveRelationId(null) }} helpKey={helpKey} onHelp={setHelpKey} />}</section></div>}
    <div className="model-note">Illustrative hypothesis model — values are editable assumptions, not measured historical probabilities.</div>
    {errorMessage && <div className="error-banner">{errorMessage}</div>}
  </div>
}

function Score({ label, value, kind, otherValue }: { label: string; value: number; kind: 'robustness' | 'pressure'; otherValue?: number }) {
  const severity = getScoreSeverity(kind, value)
  const comparison = otherValue === undefined || Math.round(value) === Math.round(otherValue) ? null : (kind === 'robustness' ? value > otherValue : value < otherValue) ? 'better' : 'worse'
  return <div className={`score-box ${severity}`}>
    <div className="score-label"><span className={`score-dot ${severity}`} />{label}{comparison && <span className={`score-arrow ${comparison}`}>{comparison === 'better' ? '▲' : '▼'}</span>}</div>
    <div className="score-value">{value.toFixed(0)}<small>/100</small></div>
    <div className="score-bar"><i className={severity} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} /></div>
  </div>
}
function getScoreSeverity(kind: 'robustness' | 'pressure', value: number): 'safe' | 'warn' | 'danger' {
  if (kind === 'robustness') return value >= 70 ? 'safe' : value >= 40 ? 'warn' : 'danger'
  return value < 30 ? 'safe' : value < 65 ? 'warn' : 'danger'
}
function NodeBox({ node, active, onClick }: { node: SystemNode; active: boolean; onClick: () => void }) {
  const pressure = Math.min(100, (node.boundaryEnergy / Math.max(node.energyThreshold, 1)) * 100)
  return <button type="button" className={`node-box ${active ? 'selected' : ''} ${pressure >= 100 ? 'under-pressure' : ''}`} onClick={onClick}><span>{node.label}</span><strong>{node.currentValue.toFixed(0)}<small>/100</small></strong><span className="node-pressure">pressure {pressure.toFixed(0)}%</span><span className="node-meter"><i style={{ width: `${Math.min(node.currentValue, 100)}%` }} /></span></button>
}
function NumberField({ label, value, step = '1', onChange, help, helpKey, activeHelp, onHelp }: { label: string; value: number; step?: string; onChange: (value: number) => void; help?: string; helpKey?: string; activeHelp?: string | null; onHelp?: (key: string | null) => void }) { return <label><span className="field-label">{label}{help && helpKey && onHelp && <button type="button" className="help-button" aria-label={`Explain ${label}`} onClick={() => onHelp(activeHelp === helpKey ? null : helpKey)}>?</button>}{help && helpKey === activeHelp && <span className="help-popover" onMouseLeave={() => onHelp?.(null)}>{help}</span>}</span><input type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label> }

function DependencyEditor({ node, nodes, relations, activeRelationId, onSelect, onUpdate, onAdd, onRemove, helpKey, onHelp }: { node: SystemNode; nodes: SystemNode[]; relations: InfluenceRelation[]; activeRelationId: string | null; onSelect: (id: string | null) => void; onUpdate: (id: string, field: keyof InfluenceRelation, value: string | number | boolean) => void; onAdd: () => void; onRemove: (id: string) => void; helpKey: string | null; onHelp: (key: string | null) => void }) {
  const related = relations.filter((relation) => relation.source === node.id || relation.target === node.id)
  const incoming = related.filter((relation) => relation.target === node.id)
  const outgoing = related.filter((relation) => relation.source === node.id)
  const active = relations.find((relation) => relation.id === activeRelationId) ?? null
  return <div className="dependency-editor"><div className="dependency-heading"><div><div className="inspector-kicker">Dependency editor</div><h4>Incoming and outgoing influences</h4></div><button type="button" onClick={onAdd}>Add dependency</button></div><div className="dependency-columns"><DependencyList title="Incoming" nodeId={node.id} relations={incoming} nodes={nodes} selectedId={activeRelationId} onSelect={onSelect} /><DependencyList title="Outgoing" nodeId={node.id} relations={outgoing} nodes={nodes} selectedId={activeRelationId} onSelect={onSelect} /></div>{active && <div className="relation-draft"><div className="relation-draft-heading"><h4>{active.source} → {active.target}</h4><button type="button" className="danger-action" onClick={() => onRemove(active.id)}>Remove</button></div><div className="field-grid relation-fields"><SelectField label="Source" value={active.source} options={nodes.map((item) => item.id)} onChange={(value) => onUpdate(active.id, 'source', value)} /><SelectField label="Target" value={active.target} options={nodes.map((item) => item.id)} onChange={(value) => onUpdate(active.id, 'target', value)} /><SelectField label="Polarity" value={active.polarity} options={['direct', 'inverse', 'nonlinear']} onChange={(value) => onUpdate(active.id, 'polarity', value)} /><SelectField label="Curve" value={active.curve} options={['linear', 'saturating', 'threshold']} onChange={(value) => onUpdate(active.id, 'curve', value)} /><NumberField label="Strength" help="Multiplier for the relationship before curve and availability effects." helpKey={`strength-${active.id}`} activeHelp={helpKey} onHelp={onHelp} step="0.01" value={active.strength} onChange={(value) => onUpdate(active.id, 'strength', value)} /><NumberField label="Medium availability" help="A value of zero blocks this pathway completely; one means fully available." helpKey={`medium-${active.id}`} activeHelp={helpKey} onHelp={onHelp} step="0.01" value={active.mediumAvailability} onChange={(value) => onUpdate(active.id, 'mediumAvailability', value)} /><NumberField label="Delay steps" help="Whole simulation steps before this relationship takes effect." helpKey={`delay-${active.id}`} activeHelp={helpKey} onHelp={onHelp} value={active.delaySteps} onChange={(value) => onUpdate(active.id, 'delaySteps', value)} /><NumberField label="Activation threshold" help="Source value required before this relationship transmits." helpKey={`activation-${active.id}`} activeHelp={helpKey} onHelp={onHelp} value={active.activationThreshold} onChange={(value) => onUpdate(active.id, 'activationThreshold', value)} /><NumberField label="Ratio source" help="First half of the explicit source:target relationship ratio." helpKey={`source-ratio-${active.id}`} activeHelp={helpKey} onHelp={onHelp} value={active.sourcePart} onChange={(value) => onUpdate(active.id, 'sourcePart', value)} /><NumberField label="Ratio target" help="Second half of the explicit source:target relationship ratio." helpKey={`target-ratio-${active.id}`} activeHelp={helpKey} onHelp={onHelp} value={active.targetPart} onChange={(value) => onUpdate(active.id, 'targetPart', value)} /></div><label className="enabled-toggle"><input type="checkbox" checked={active.enabled} onChange={(event) => onUpdate(active.id, 'enabled', event.target.checked)} /> Enabled in simulation</label></div>}</div>
}

function DependencyList({ title, nodeId, relations, nodes, selectedId, onSelect }: { title: string; nodeId: string; relations: InfluenceRelation[]; nodes: SystemNode[]; selectedId: string | null; onSelect: (id: string) => void }) { return <div className="dependency-list"><h5>{title}</h5>{relations.length === 0 ? <p>No relations.</p> : relations.map((relation) => { const other = relation.source === nodeId ? relation.target : relation.source; const label = nodes.find((node) => node.id === other)?.label ?? other; return <button className={selectedId === relation.id ? 'active' : ''} type="button" key={relation.id} onClick={() => onSelect(relation.id)}><span>{label}</span><small>{relation.polarity} · {relation.strength.toFixed(2)}</small></button> })}</div> }

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label><span className="field-label">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label> }

function validateRelations(relations: InfluenceRelation[], nodes: SystemNode[]): string | null {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const pairs = new Set<string>()
  for (const relation of relations) {
    if (!nodeIds.has(relation.source) || !nodeIds.has(relation.target)) return 'Each dependency must reference an existing node.'
    if (relation.source === relation.target) return 'A dependency cannot connect a node to itself.'
    if (relation.sourcePart <= 0 || relation.targetPart <= 0) return 'Dependency ratio parts must be positive.'
    if (relation.delaySteps < 0 || !Number.isInteger(relation.delaySteps)) return 'Dependency delay must be a whole number of steps.'
    const pair = `${relation.source}:${relation.target}`
    if (pairs.has(pair)) return 'Only one dependency is allowed for the same source and target pair.'
    pairs.add(pair)
  }
  return null
}

function advanceNodes(nodes: SystemNode[], relations: InfluenceRelation[], pressureByNode: Record<string, number>, stressIntensity: number): SystemNode[] {
  const stressedNodes = nodes.map((node) => {
    const incomingPressure = (pressureByNode[node.id] ?? 0) * stressIntensity
    const absorbed = Math.min(node.bufferRemaining, incomingPressure * node.absorptionRate)
    const bufferRemaining = clamp(node.bufferRemaining - absorbed + node.recoveryRate, 0, node.bufferCapacity)
    const boundaryEnergy = Math.max(0, node.boundaryEnergy + incomingPressure - absorbed - node.dissipationRate)
    const release = boundaryEnergy >= node.energyThreshold ? node.releaseFraction * (boundaryEnergy - node.energyThreshold) : 0
    return { ...node, boundaryEnergy, bufferRemaining, currentValue: release === 0 ? node.currentValue : clamp(node.currentValue + (node.higherIsBetter ? -release : release) * node.vulnerability, 0, 100) }
  })
  const influencedNodes = stressedNodes.map((node) => {
    const influence = relations.filter((relation) => relation.enabled && relation.target === node.id).reduce((total, relation) => {
      const source = getNodeById(stressedNodes, relation.source)
      if (!source) return total
      const coefficient = computeEffectiveCoefficient(ratioToCoefficient(relation.sourcePart, relation.targetPart), relation.strength, relation.mediumAvailability, relation.activationThreshold, source.currentValue)
      const response = computeCurveResponse(Math.abs(source.currentValue - node.currentValue), relation.curve, relation.activationThreshold, coefficient)
      return total + (relation.polarity === 'inverse' ? -response : response)
    }, 0)
    return { ...node, currentValue: clamp(node.currentValue + influence, 0, 100) }
  })
  return synchronizeOutcome(influencedNodes)
}

function synchronizeOutcome(nodes: SystemNode[]): SystemNode[] {
  const metrics = computeRobustness(nodes, Object.fromEntries(nodes.map((node) => [node.id, node.currentValue])))
  return nodes.map((node) => node.id === 'battlefield_effect' ? { ...node, currentValue: metrics.battlefield } : node)
}

export default App