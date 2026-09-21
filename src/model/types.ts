export type RelationPolarity = 'direct' | 'inverse' | 'nonlinear'
export type RelationCurve = 'linear' | 'saturating' | 'threshold'

export type NodeCategory =
  | 'foundation'
  | 'capability'
  | 'system'
  | 'external-driver'
  | 'outcome'

export type EvidenceStatus = 'assumption' | 'partially-supported' | 'supported'

export interface EvidenceSource {
  id: string
  title: string
  author?: string
  year?: number
  url?: string
  citation?: string
  notes?: string
}

export interface InfluenceRelation {
  id: string
  source: string
  target: string
  polarity: RelationPolarity
  curve: RelationCurve
  sourcePart: number
  targetPart: number
  strength: number
  mediumAvailability: number
  delaySteps: number
  activationThreshold: number
  mediumName: string
  mediumDescription: string
  rationale: string
  evidenceConfidence: number
  evidenceStatus: EvidenceStatus
  sources: EvidenceSource[]
  enabled: boolean
}

export interface SystemNode {
  id: string
  label: string
  category: NodeCategory
  description: string
  detailedMeaning: string
  variableName: string
  unit: string
  higherIsBetter: boolean
  baselineValue: number
  currentValue: number
  boundaryEnergy: number
  energyThreshold: number
  bufferCapacity: number
  bufferRemaining: number
  absorptionRate: number
  dissipationRate: number
  recoveryRate: number
  vulnerability: number
  releaseFraction: number
  evidenceConfidence: number
  notes: string
  sources: EvidenceSource[]
}

export interface Scenario {
  id: string
  name: string
  description: string
  pressureByNode: Record<string, number>
  notes: string
  initialShockNodes: string[]
}

export interface SystemProfile {
  id: string
  name: string
  description: string
  nodeValues: Record<string, number>
}

export interface ModelState {
  nodes: SystemNode[]
  relations: InfluenceRelation[]
  profiles: SystemProfile[]
  scenarios: Scenario[]
  selectedProfileId: string
  selectedScenarioId: string
  step: number
  stressIntensity: number
  activeView: 'comparison' | 'single'
  videoMode: boolean
  eventLog: SimulationEvent[]
}

export interface SimulationEvent {
  step: number
  type: string
  nodeId?: string
  message: string
  details?: Record<string, number | string | boolean>
}

export interface ExportedModel {
  schemaVersion: 1
  exportedAt: string
  nodes: SystemNode[]
  relations: InfluenceRelation[]
  profiles: SystemProfile[]
  scenarios: Scenario[]
}
