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
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null)
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), nodes: model.nodes, relations: model.relations, profiles: model.profiles, scenarios: model.scenarios } satisfies ExportedModel))
  }, [model.nodes, model.relations, model.profiles, model.scenarios])

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
  const selectedRelation = model.relations.find((relation) => relation.id === selectedRelationId) ?? null
  const relatedRelations = selectedNode ? model.relations.filter((relation) => relation.source === selectedNode.id || relation.target === selectedNode.id) : []

  const updateNode = (field: keyof SystemNode, value: number) => {
    if (!selectedNode) return
    setSimulations((current) => ({ ...current, [selectedProfileId]: current[selectedProfileId].map((node) => node.id === selectedNode.id ? { ...node, [field]: value, ...(field === 'baselineValue' ? { currentValue: value } : {}) } : node) }))
    if (field === 'baselineValue') setModel((current) => ({ ...current, profiles: current.profiles.map((profile) => profile.id === selectedProfileId ? { ...profile, nodeValues: { ...profile.nodeValues, [selectedNode.id]: value } } : profile) }))
  }

  const updateRelation = (field: keyof InfluenceRelation, value: string | number | boolean) => {
    if (!selectedRelation) return
    setModel((current) => ({ ...current, relations: current.relations.map((relation) => relation.id === selectedRelation.id ? { ...relation, [field]: value } : relation) }))
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
      <div className="title-block"><div className="eyebrow">ILLUSTRATIVE HYPOTHESIS MODEL</div><h1>Hannibal’s Elephants</h1><div className="subtitle">A Risks In Sync exploration of war-elephant systems</div></div>
      <div className="toolbar">
        <div className="select-row">
          <select aria-label="Profile being edited" value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>{model.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
          <select aria-label="Scenario selector" value={model.selectedScenarioId} onChange={(event) => setModel((current) => ({ ...current, selectedScenarioId: event.target.value }))}>{model.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select>
        </div>
        <label className="slider-control"><span>Stress intensity</span><input type="range" min="0" max="2" step="0.1" value={model.stressIntensity} onChange={(event) => setModel((current) => ({ ...current, stressIntensity: Number(event.target.value) }))} /></label>
        <div className="button-row"><button type="button" onClick={runSimulationStep}>Step simulation</button><button type="button" className={isRunning ? 'active' : ''} onClick={() => setIsRunning((current) => !current)}>{isRunning ? 'Pause' : 'Run'}</button><button type="button" onClick={resetAll}>Reset</button><button type="button" onClick={exportModel}>Export model</button></div>
      </div>
    </header>
    <div className="summary-row"><div className="summary-pill">Scenario: {selectedScenario?.name ?? 'Baseline'}</div><div className="summary-pill">Simulation step: {model.step}</div><div className="summary-pill">Select a box to inspect or edit it</div></div>
    <main className="comparison-grid">
      {model.profiles.map((profile, index) => {
        const nodes = simulations[profile.id] ?? model.nodes
        const metrics = profileMetrics[profile.id]
        return <section key={profile.id} className={`profile-card ${index === 0 ? 'source' : 'transplant'}`}>
          <div className="profile-header"><h2>{profile.name}</h2><span>{profile.id === selectedProfileId ? 'EDITING' : 'LIVE COMPARISON'}</span></div>
          <div className="score-row"><Score label="System robustness index" value={metrics.availability} /><Score label="Breakdown pressure" value={100 - metrics.battlefield} /><Score label="Battlefield effect" value={metrics.battlefield} /></div>
          <div className="pyramid" aria-label={`${profile.name} system pyramid`}>
            {pyramidLayers.map((layer, layerIndex) => <div className={`pyramid-layer layer-${layerIndex + 1}`} key={`layer-${layerIndex}`}>
              {layer.map((nodeId) => {
                const node = nodes.find((entry) => entry.id === nodeId)
                return node ? <NodeBox key={node.id} node={node} active={node.id === selectedNodeId && profile.id === selectedProfileId} onClick={() => { setSelectedProfileId(profile.id); setSelectedNodeId(node.id); setSelectedRelationId(null) }} /> : null
              })}
            </div>)}
          </div>
        </section>
      })}
    </main>
    <section className="inspector" aria-live="polite">
      {!selectedNode && !selectedRelation && <p>Select a system box to edit its assumptions and inspect its connections.</p>}
      {selectedNode && <div className="inspector-grid"><div><div className="inspector-kicker">{selectedProfileId} / {selectedNode.category}</div><h3>{selectedNode.label}</h3><p>{selectedNode.detailedMeaning}</p><div className="field-grid"><NumberField label="Starting value" value={selectedNode.baselineValue} onChange={(value) => updateNode('baselineValue', value)} /><NumberField label="Threshold" value={selectedNode.energyThreshold} onChange={(value) => updateNode('energyThreshold', value)} /><NumberField label="Buffer capacity" value={selectedNode.bufferCapacity} onChange={(value) => updateNode('bufferCapacity', value)} /><NumberField label="Absorption" step="0.01" value={selectedNode.absorptionRate} onChange={(value) => updateNode('absorptionRate', value)} /><NumberField label="Dissipation" step="0.01" value={selectedNode.dissipationRate} onChange={(value) => updateNode('dissipationRate', value)} /><NumberField label="Recovery" step="0.01" value={selectedNode.recoveryRate} onChange={(value) => updateNode('recoveryRate', value)} /><NumberField label="Vulnerability" step="0.01" value={selectedNode.vulnerability} onChange={(value) => updateNode('vulnerability', value)} /><NumberField label="Release fraction" step="0.01" value={selectedNode.releaseFraction} onChange={(value) => updateNode('releaseFraction', value)} /></div></div><div className="relation-list"><h4>Connections</h4>{relatedRelations.map((relation) => <button key={relation.id} type="button" onClick={() => setSelectedRelationId(relation.id)}>{relation.source === selectedNode.id ? 'Out to' : 'In from'} {relation.source === selectedNode.id ? relation.target : relation.source}</button>)}</div></div>}
      {selectedRelation && <div className="relation-editor"><div className="inspector-kicker">Connection editor</div><h3>{selectedRelation.source} → {selectedRelation.target}</h3><div className="field-grid"><SelectField label="Polarity" value={selectedRelation.polarity} options={['direct', 'inverse', 'nonlinear']} onChange={(value) => updateRelation('polarity', value)} /><SelectField label="Curve" value={selectedRelation.curve} options={['linear', 'saturating', 'threshold']} onChange={(value) => updateRelation('curve', value)} /><NumberField label="Strength" step="0.01" value={selectedRelation.strength} onChange={(value) => updateRelation('strength', value)} /><NumberField label="Medium availability" step="0.01" value={selectedRelation.mediumAvailability} onChange={(value) => updateRelation('mediumAvailability', value)} /><NumberField label="Delay steps" value={selectedRelation.delaySteps} onChange={(value) => updateRelation('delaySteps', value)} /><NumberField label="Activation threshold" value={selectedRelation.activationThreshold} onChange={(value) => updateRelation('activationThreshold', value)} /><NumberField label="Ratio source" value={selectedRelation.sourcePart} onChange={(value) => updateRelation('sourcePart', value)} /><NumberField label="Ratio target" value={selectedRelation.targetPart} onChange={(value) => updateRelation('targetPart', value)} /></div></div>}
    </section>
    <div className="model-note">Illustrative hypothesis model — values are editable assumptions, not measured historical probabilities.</div>
    {errorMessage && <div className="error-banner">{errorMessage}</div>}
  </div>
}

function Score({ label, value }: { label: string; value: number }) { return <div className="score-box"><div className="score-label">{label}</div><div className="score-value">{value.toFixed(0)}/100</div></div> }
function NodeBox({ node, active, onClick }: { node: SystemNode; active: boolean; onClick: () => void }) {
  const pressure = Math.min(100, (node.boundaryEnergy / Math.max(node.energyThreshold, 1)) * 100)
  return <button type="button" className={`node-box ${active ? 'selected' : ''} ${pressure >= 100 ? 'under-pressure' : ''}`} onClick={onClick}><span>{node.label}</span><strong>{node.currentValue.toFixed(0)}<small>/100</small></strong><span className="node-pressure">pressure {pressure.toFixed(0)}%</span><span className="node-meter"><i style={{ width: `${Math.min(node.currentValue, 100)}%` }} /></span></button>
}
function NumberField({ label, value, step = '1', onChange }: { label: string; value: number; step?: string; onChange: (value: number) => void }) { return <label>{label}<input type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label> }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label> }

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