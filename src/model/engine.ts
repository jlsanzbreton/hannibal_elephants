import type {
  ExportedModel,
  InfluenceRelation,
  Scenario,
  SimulationEvent,
  SystemNode,
  SystemProfile,
} from './types'

export function ratioToCoefficient(sourcePart: number, targetPart: number): number {
  if (sourcePart <= 0 || targetPart <= 0) {
    throw new Error('Ratio parts must be positive and non-zero.')
  }
  return targetPart / sourcePart
}

export function applyPolarity(value: number, polarity: 'direct' | 'inverse' | 'nonlinear'): number {
  if (polarity === 'inverse') {
    return -value
  }
  return value
}

export function computeEffectiveCoefficient(
  ratioCoefficient: number,
  strength: number,
  mediumAvailability: number,
  activationThreshold?: number,
  currentValue?: number,
): number {
  if (mediumAvailability === 0) {
    return 0
  }
  if (activationThreshold !== undefined && currentValue !== undefined && currentValue < activationThreshold) {
    return 0
  }
  const clampedStrength = Math.min(Math.max(strength, 0), 1)
  const clampedMedium = Math.min(Math.max(mediumAvailability, 0), 1)
  return ratioCoefficient * clampedStrength * clampedMedium
}

export function computeCurveResponse(
  input: number,
  curve: 'linear' | 'saturating' | 'threshold',
  activationThreshold: number,
  intensity: number,
): number {
  if (curve === 'threshold') {
    if (input < activationThreshold) {
      return 0
    }
    return input * intensity
  }
  if (curve === 'saturating') {
    const normalized = Math.min(Math.max(input, 0), 30)
    return (normalized / (normalized + 10)) * 10 * intensity
  }
  return input * intensity
}

export function buildDelayedSignal(params: {
  source: string
  target: string
  delaySteps: number
  value: number
}) {
  return {
    source: params.source,
    target: params.target,
    delaySteps: params.delaySteps,
    value: params.value,
    deliveredAt: params.delaySteps,
  }
}

export function absorbPressure(
  incomingPressure: number,
  bufferRemaining: number,
  absorptionRate: number,
): { absorbed: number; remainingBuffer: number } {
  const absorbed = Math.min(bufferRemaining, incomingPressure * absorptionRate)
  return {
    absorbed,
    remainingBuffer: Math.max(0, bufferRemaining - absorbed),
  }
}

export function thresholdRelease(
  boundaryEnergy: number,
  energyThreshold: number,
  releaseFraction: number,
): number {
  if (boundaryEnergy < energyThreshold) {
    return 0
  }
  return releaseFraction * (boundaryEnergy - energyThreshold)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function weightedGeometricMean(values: number[], weights: number[]): number {
  if (values.length === 0) {
    return 0
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight === 0) {
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }
  return values.reduce((product, value, index) => {
    const weight = weights[index] ?? 1
    return product * Math.pow(value, weight / totalWeight)
  }, 1)
}

export function calculateBattlefieldEffect(
  availability: number,
  integration: number,
  doctrine: number,
  enemyAdaptation: number,
): number {
  const effectiveEnemy = Math.max(0, 100 - enemyAdaptation)
  return clamp((availability * 0.35 + integration * 0.35 + doctrine * 0.2 + effectiveEnemy * 0.1) / 1, 0, 100)
}

export function createSeedNodes(): SystemNode[] {
  return [
    {
      id: 'ecological_resource_base',
      label: 'Ecological resource base',
      category: 'foundation',
      description: 'Suitable elephant populations and habitat conditions.',
      detailedMeaning: 'Population and ecology that sustain capture and replacement over time.',
      variableName: 'ecological_resource_base',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 92,
      currentValue: 92,
      boundaryEnergy: 0,
      energyThreshold: 18,
      bufferCapacity: 24,
      bufferRemaining: 24,
      absorptionRate: 0.8,
      dissipationRate: 0.7,
      recoveryRate: 1.3,
      vulnerability: 0.32,
      releaseFraction: 0.22,
      evidenceConfidence: 0.7,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'political_access',
      label: 'Political access',
      category: 'foundation',
      description: 'Territorial and diplomatic ability to reach and control elephants.',
      detailedMeaning: 'Access to elephant sources and reliable supply routes.',
      variableName: 'political_access',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 82,
      currentValue: 82,
      boundaryEnergy: 0,
      energyThreshold: 16,
      bufferCapacity: 22,
      bufferRemaining: 22,
      absorptionRate: 0.74,
      dissipationRate: 0.6,
      recoveryRate: 1.2,
      vulnerability: 0.28,
      releaseFraction: 0.2,
      evidenceConfidence: 0.68,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'capture_replacement_pool',
      label: 'Capture and replacement pool',
      category: 'capability',
      description: 'Capacity to acquire and replace elephants after losses.',
      detailedMeaning: 'The procurement and replenishment system sustaining available elephants.',
      variableName: 'capture_replacement_pool',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 88,
      currentValue: 88,
      boundaryEnergy: 0,
      energyThreshold: 18,
      bufferCapacity: 26,
      bufferRemaining: 26,
      absorptionRate: 0.72,
      dissipationRate: 0.8,
      recoveryRate: 1.25,
      vulnerability: 0.3,
      releaseFraction: 0.21,
      evidenceConfidence: 0.64,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'feed_water_movement',
      label: 'Feed, water and movement',
      category: 'capability',
      description: 'Capacity to sustain elephants during mobilisation and campaign movement.',
      detailedMeaning: 'Food, water, shelter and route logistics for elephant endurance.',
      variableName: 'feed_water_movement',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 84,
      currentValue: 84,
      boundaryEnergy: 0,
      energyThreshold: 18,
      bufferCapacity: 24,
      bufferRemaining: 24,
      absorptionRate: 0.7,
      dissipationRate: 0.75,
      recoveryRate: 1.2,
      vulnerability: 0.33,
      releaseFraction: 0.24,
      evidenceConfidence: 0.66,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'husbandry_veterinary_knowledge',
      label: 'Husbandry and veterinary knowledge',
      category: 'capability',
      description: 'Know-how required to care for, maintain and treat elephants.',
      detailedMeaning: 'Animal health and veterinary expertise within the elephant system.',
      variableName: 'husbandry_veterinary_knowledge',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 90,
      currentValue: 90,
      boundaryEnergy: 0,
      energyThreshold: 17,
      bufferCapacity: 22,
      bufferRemaining: 22,
      absorptionRate: 0.78,
      dissipationRate: 0.72,
      recoveryRate: 1.22,
      vulnerability: 0.31,
      releaseFraction: 0.22,
      evidenceConfidence: 0.65,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'training_tradition',
      label: 'Training tradition',
      category: 'capability',
      description: 'Institutional continuity in elephant handling and command expertise.',
      detailedMeaning: 'Intergenerational and organisational knowledge transferring the skill system.',
      variableName: 'training_tradition',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 93,
      currentValue: 93,
      boundaryEnergy: 0,
      energyThreshold: 17,
      bufferCapacity: 20,
      bufferRemaining: 20,
      absorptionRate: 0.76,
      dissipationRate: 0.7,
      recoveryRate: 1.2,
      vulnerability: 0.29,
      releaseFraction: 0.2,
      evidenceConfidence: 0.63,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'mahout_pool',
      label: 'Mahout pool',
      category: 'capability',
      description: 'Experienced handlers capable of directing elephants under pressure.',
      detailedMeaning: 'The available body of handlers and specialist expertise.',
      variableName: 'mahout_pool',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 91,
      currentValue: 91,
      boundaryEnergy: 0,
      energyThreshold: 18,
      bufferCapacity: 20,
      bufferRemaining: 20,
      absorptionRate: 0.8,
      dissipationRate: 0.8,
      recoveryRate: 1.18,
      vulnerability: 0.35,
      releaseFraction: 0.23,
      evidenceConfidence: 0.65,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'combined_arms_doctrine',
      label: 'Combined-arms doctrine',
      category: 'system',
      description: 'How elephants are integrated with infantry, cavalry and command decisions.',
      detailedMeaning: 'The military doctrine linking elephants to wider operations.',
      variableName: 'combined_arms_doctrine',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 83,
      currentValue: 83,
      boundaryEnergy: 0,
      energyThreshold: 17,
      bufferCapacity: 21,
      bufferRemaining: 21,
      absorptionRate: 0.75,
      dissipationRate: 0.68,
      recoveryRate: 1.25,
      vulnerability: 0.27,
      releaseFraction: 0.19,
      evidenceConfidence: 0.61,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'enemy_adaptation',
      label: 'Enemy adaptation',
      category: 'external-driver',
      description: 'Hostile adaptation that reduces elephant effectiveness.',
      detailedMeaning: 'Enemy learning, gaps, missile concentration and tactical countermeasures.',
      variableName: 'enemy_adaptation',
      unit: 'index',
      higherIsBetter: false,
      baselineValue: 40,
      currentValue: 40,
      boundaryEnergy: 0,
      energyThreshold: 15,
      bufferCapacity: 18,
      bufferRemaining: 18,
      absorptionRate: 0.68,
      dissipationRate: 0.7,
      recoveryRate: 1.15,
      vulnerability: 0.25,
      releaseFraction: 0.2,
      evidenceConfidence: 0.62,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'elephant_availability',
      label: 'Elephant availability',
      category: 'system',
      description: 'Fieldable elephants available at a given time and place.',
      detailedMeaning: 'Readiness and condition of the available elephant pool, not merely theoretical ownership.',
      variableName: 'elephant_availability',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 88,
      currentValue: 88,
      boundaryEnergy: 0,
      energyThreshold: 17,
      bufferCapacity: 23,
      bufferRemaining: 23,
      absorptionRate: 0.76,
      dissipationRate: 0.74,
      recoveryRate: 1.1,
      vulnerability: 0.32,
      releaseFraction: 0.23,
      evidenceConfidence: 0.7,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'military_integration',
      label: 'Military integration',
      category: 'system',
      description: 'Degree to which elephants work as part of the wider battle system.',
      detailedMeaning: 'Operational coordination, command and tactical fit of the elephant arm.',
      variableName: 'military_integration',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 88,
      currentValue: 88,
      boundaryEnergy: 0,
      energyThreshold: 16,
      bufferCapacity: 21,
      bufferRemaining: 21,
      absorptionRate: 0.73,
      dissipationRate: 0.72,
      recoveryRate: 1.15,
      vulnerability: 0.3,
      releaseFraction: 0.22,
      evidenceConfidence: 0.69,
      notes: 'Illustrative hypothesis model.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'battlefield_effect',
      label: 'Battlefield effect',
      category: 'outcome',
      description: 'Net military effect produced in a battle or campaign.',
      detailedMeaning: 'The visible operational result including disruption, shock, and costs.',
      variableName: 'battlefield_effect',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 0,
      currentValue: 0,
      boundaryEnergy: 0,
      energyThreshold: 16,
      bufferCapacity: 20,
      bufferRemaining: 20,
      absorptionRate: 0.7,
      dissipationRate: 0.8,
      recoveryRate: 1.08,
      vulnerability: 0.28,
      releaseFraction: 0.2,
      evidenceConfidence: 0.66,
      notes: 'Calculated outcome from upstream states.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
    {
      id: 'power_demonstration',
      label: 'Power demonstration',
      category: 'outcome',
      description: 'Political and psychological value generated by elephants in deployment.',
      detailedMeaning: 'Prestige and deterrence produced downstream from actual battlefield outcomes.',
      variableName: 'power_demonstration',
      unit: 'index',
      higherIsBetter: true,
      baselineValue: 0,
      currentValue: 0,
      boundaryEnergy: 0,
      energyThreshold: 14,
      bufferCapacity: 18,
      bufferRemaining: 18,
      absorptionRate: 0.63,
      dissipationRate: 0.72,
      recoveryRate: 1.06,
      vulnerability: 0.22,
      releaseFraction: 0.18,
      evidenceConfidence: 0.57,
      notes: 'Downstream outcome, not a foundation.',
      sources: [{ id: 'source-needed', title: 'Source needed', notes: 'Add evidence later.' }],
    },
  ]
}

export function createSeedRelations(): InfluenceRelation[] {
  const base: InfluenceRelation[] = [
    {
      id: 'r-ecological-capture',
      source: 'ecological_resource_base',
      target: 'capture_replacement_pool',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.9,
      mediumAvailability: 0.96,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Access to elephant populations',
      mediumDescription: 'The ecological channels through which elephants can be acquired or replaced.',
      rationale: 'Source base supports replenishment capacity.',
      evidenceConfidence: 0.67,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-political-capture',
      source: 'political_access',
      target: 'capture_replacement_pool',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.89,
      mediumAvailability: 0.92,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Capture organisation',
      mediumDescription: 'Networks that control access, tribute, trade and extraction.',
      rationale: 'Political control improves the reliable acquisition of elephants.',
      evidenceConfidence: 0.64,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-political-feed',
      source: 'political_access',
      target: 'feed_water_movement',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.82,
      mediumAvailability: 0.9,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Supply and transport network',
      mediumDescription: 'Routes, logistics and state capacity to move fodder and animals.',
      rationale: 'Stable access supports living and moving elephants beyond the point of capture.',
      evidenceConfidence: 0.66,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-capture-availability',
      source: 'capture_replacement_pool',
      target: 'elephant_availability',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.9,
      mediumAvailability: 0.95,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Replacement logistics',
      mediumDescription: 'Mechanisms of capture, movement and replacement into the active pool.',
      rationale: 'Replenishment translates to operational fieldable elephants.',
      evidenceConfidence: 0.63,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-feed-availability',
      source: 'feed_water_movement',
      target: 'elephant_availability',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.85,
      mediumAvailability: 0.9,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Feeding and route security',
      mediumDescription: 'Fodder, water and movement capacity that keeps elephants operational.',
      rationale: 'Elephants need a sustained logistical base to remain usable in campaign conditions.',
      evidenceConfidence: 0.67,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-husbandry-availability',
      source: 'husbandry_veterinary_knowledge',
      target: 'elephant_availability',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.88,
      mediumAvailability: 0.91,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Veterinary practice',
      mediumDescription: 'Animal care and disease management that keep elephants combat-ready.',
      rationale: 'Health and behaviour expertise protect both replacement and fielded availability.',
      evidenceConfidence: 0.68,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-training-mahout',
      source: 'training_tradition',
      target: 'mahout_pool',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.9,
      mediumAvailability: 0.93,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Specialist apprenticeship',
      mediumDescription: 'Transmission of handling expertise across generations and institutions.',
      rationale: 'The practice tradition creates the pool of capable handlers.',
      evidenceConfidence: 0.7,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-training-husbandry',
      source: 'training_tradition',
      target: 'husbandry_veterinary_knowledge',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.85,
      mediumAvailability: 0.9,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Institutional memory',
      mediumDescription: 'Continuity in specialist practice and transmission of knowledge.',
      rationale: 'Training systems sustain the knowledge base behind husbandry.',
      evidenceConfidence: 0.67,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-mahout-integration',
      source: 'mahout_pool',
      target: 'military_integration',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.89,
      mediumAvailability: 0.94,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Command system',
      mediumDescription: 'The human command layer that makes elephant movements and control reliable.',
      rationale: 'Skilled handlers determine whether elephants can be used coherently in battle.',
      evidenceConfidence: 0.72,
      evidenceStatus: 'supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-doctrine-integration',
      source: 'combined_arms_doctrine',
      target: 'military_integration',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.83,
      mediumAvailability: 0.9,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Battlefield coordination',
      mediumDescription: 'Command arrangements and drills that integrate elephants into wider operations.',
      rationale: 'A coherent doctrine transforms elephants from assets into a military capability.',
      evidenceConfidence: 0.68,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-availability-integration',
      source: 'elephant_availability',
      target: 'military_integration',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.86,
      mediumAvailability: 0.88,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Operational readiness',
      mediumDescription: 'The translational medium between a large fielded pool and a usable combat system.',
      rationale: 'Without reliable field availability, no doctrine can translate into military integration.',
      evidenceConfidence: 0.7,
      evidenceStatus: 'supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-availability-effects',
      source: 'elephant_availability',
      target: 'battlefield_effect',
      polarity: 'direct',
      curve: 'saturating',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.82,
      mediumAvailability: 0.9,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Front-line application',
      mediumDescription: 'The tactical deployment of available elephants on the field.',
      rationale: 'Availability underpins the immediate physical and psychological effect of elephants in battle.',
      evidenceConfidence: 0.7,
      evidenceStatus: 'supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-integration-effects',
      source: 'military_integration',
      target: 'battlefield_effect',
      polarity: 'direct',
      curve: 'saturating',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.86,
      mediumAvailability: 0.91,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Battlefield coordination',
      mediumDescription: 'The degree to which elephants are coordinated for attack, control and support.',
      rationale: 'Integration determines whether availability translates into effect instead of disorder.',
      evidenceConfidence: 0.71,
      evidenceStatus: 'supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-doctrine-effects',
      source: 'combined_arms_doctrine',
      target: 'battlefield_effect',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.8,
      mediumAvailability: 0.88,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Tactical doctrine',
      mediumDescription: 'The organisational know-how for realising impact in a specific battle.',
      rationale: 'Doctrine shapes how the system is used, especially when the enemy adapts.',
      evidenceConfidence: 0.66,
      evidenceStatus: 'partially-supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-enemy-effects',
      source: 'enemy_adaptation',
      target: 'battlefield_effect',
      polarity: 'inverse',
      curve: 'threshold',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.88,
      mediumAvailability: 0.86,
      delaySteps: 1,
      activationThreshold: 35,
      mediumName: 'Enemy observation and learning',
      mediumDescription: 'Signals from enemy adaptation, gaps, missiles, terrain and harassment.',
      rationale: 'Enemy adaptation undercuts battlefield effect, especially once countermeasures emerge.',
      evidenceConfidence: 0.7,
      evidenceStatus: 'supported',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-effect-power',
      source: 'battlefield_effect',
      target: 'power_demonstration',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.82,
      mediumAvailability: 0.9,
      delaySteps: 1,
      activationThreshold: 0,
      mediumName: 'Political prestige and investment',
      mediumDescription: 'The diplomatic and reputational consequences of a successful deployment.',
      rationale: 'Battlefield effect can generate prestige, political attention and symbolic power.',
      evidenceConfidence: 0.58,
      evidenceStatus: 'assumption',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: true,
    },
    {
      id: 'r-power-politics',
      source: 'power_demonstration',
      target: 'political_access',
      polarity: 'direct',
      curve: 'linear',
      sourcePart: 1,
      targetPart: 1,
      strength: 0.4,
      mediumAvailability: 0.3,
      delaySteps: 2,
      activationThreshold: 20,
      mediumName: 'Political prestige and investment',
      mediumDescription: 'Prestige may encourage investment, diplomacy or expansion, but is not assumed to be automatic.',
      rationale: 'Potential feedback loop; explicitly disabled by default to avoid assuming it automatically operates.',
      evidenceConfidence: 0.42,
      evidenceStatus: 'assumption',
      sources: [{ id: 'source-needed', title: 'Source needed' }],
      enabled: false,
    },
  ]

  return base
}

export function createSeedProfiles(): SystemProfile[] {
  return [
    {
      id: 'indian-source-ecosystem',
      name: 'Indian source ecosystem',
      description: 'Illustrative seed profile emphasizing a stable elephant resource ecosystem.',
      nodeValues: {
        ecological_resource_base: 92,
        political_access: 82,
        capture_replacement_pool: 88,
        feed_water_movement: 84,
        husbandry_veterinary_knowledge: 90,
        training_tradition: 93,
        mahout_pool: 91,
        combined_arms_doctrine: 83,
        elephant_availability: 88,
        military_integration: 88,
        enemy_adaptation: 40,
      },
    },
    {
      id: 'hellenistic-transplant',
      name: 'Hellenistic transplant',
      description: 'Illustrative seed profile for a transplanted elephant system operating under constrained conditions.',
      nodeValues: {
        ecological_resource_base: 50,
        political_access: 56,
        capture_replacement_pool: 43,
        feed_water_movement: 61,
        husbandry_veterinary_knowledge: 55,
        training_tradition: 57,
        mahout_pool: 64,
        combined_arms_doctrine: 71,
        elephant_availability: 54,
        military_integration: 64,
        enemy_adaptation: 60,
      },
    },
  ]
}

export function createSeedScenarios(): Scenario[] {
  return [
    {
      id: 'baseline',
      name: 'Baseline',
      description: 'Ordinary operating conditions without special stress.',
      pressureByNode: {},
      notes: 'No additional external pressure.',
      initialShockNodes: [],
    },
    {
      id: 'far-from-resource-base',
      name: 'Far from the resource base',
      description: 'Campaign distance and supply burden increase pressure on movement and replacement.',
      pressureByNode: { feed_water_movement: 22, political_access: 12, capture_replacement_pool: 10 },
      notes: 'Shock lands on movement, acquisition and route control.',
      initialShockNodes: ['feed_water_movement', 'political_access', 'capture_replacement_pool'],
    },
    {
      id: 'long-campaign',
      name: 'Long campaign',
      description: 'Extended operations strain elephant endurance and husbandry.',
      pressureByNode: { feed_water_movement: 25, husbandry_veterinary_knowledge: 18, elephant_availability: 20 },
      notes: 'Long campaigns heighten attrition and maintenance burdens.',
      initialShockNodes: ['feed_water_movement', 'husbandry_veterinary_knowledge', 'elephant_availability'],
    },
    {
      id: 'loss-of-mahouts',
      name: 'Loss of mahouts and specialist knowledge',
      description: 'Critical human expertise is reduced under stress.',
      pressureByNode: { mahout_pool: 30, training_tradition: 20, husbandry_veterinary_knowledge: 17 },
      notes: 'Knowledge and handler losses are highly destabilising.',
      initialShockNodes: ['mahout_pool', 'training_tradition', 'husbandry_veterinary_knowledge'],
    },
    {
      id: 'enemy-tactical-adaptation',
      name: 'Enemy tactical adaptation',
      description: 'Opposing forces learn and adapt to the elephant threat.',
      pressureByNode: { enemy_adaptation: 25, military_integration: 14, battlefield_effect: 10 },
      notes: 'The enemy channel reduces battlefield effect through countermeasures.',
      initialShockNodes: ['enemy_adaptation', 'military_integration'],
    },
    {
      id: 'attrition-and-replacement-crisis',
      name: 'Attrition and replacement crisis',
      description: 'The replenishment system is unable to keep pace with losses.',
      pressureByNode: { capture_replacement_pool: 28, elephant_availability: 22, political_access: 12 },
      notes: 'Replacement capacity is hit directly by attrition stress.',
      initialShockNodes: ['capture_replacement_pool', 'elephant_availability', 'political_access'],
    },
    {
      id: 'supply-route-interruption',
      name: 'Supply-route interruption',
      description: 'Movement and resupply are blocked or degraded.',
      pressureByNode: { feed_water_movement: 30, political_access: 22, ecological_resource_base: 8 },
      notes: 'Transport and route security fall under systemic stress.',
      initialShockNodes: ['feed_water_movement', 'political_access'],
    },
    {
      id: 'political-access-lost',
      name: 'Political access lost',
      description: 'Diplomatic and territorial access to elephant sources collapses.',
      pressureByNode: { political_access: 34, capture_replacement_pool: 18, feed_water_movement: 16 },
      notes: 'A major boundary failure reduces access and resource flow.',
      initialShockNodes: ['political_access', 'capture_replacement_pool', 'feed_water_movement'],
    },
  ]
}

export function createSeedModel() {
  const nodes = createSeedNodes()
  const relations = createSeedRelations()
  const profiles = createSeedProfiles()
  const scenarios = createSeedScenarios()

  return {
    nodes,
    relations,
    profiles,
    scenarios,
    selectedProfileId: profiles[0]?.id ?? 'indian-source-ecosystem',
    selectedScenarioId: scenarios[0]?.id ?? 'baseline',
    step: 0,
    stressIntensity: 1,
    activeView: 'comparison' as const,
    videoMode: false,
    eventLog: [] as SimulationEvent[],
  }
}

export function resetModel(model: ReturnType<typeof createSeedModel>): ReturnType<typeof createSeedModel> {
  const fresh = createSeedModel()
  return {
    ...fresh,
    selectedProfileId: model.selectedProfileId,
    selectedScenarioId: model.selectedScenarioId,
    stressIntensity: model.stressIntensity,
    activeView: model.activeView,
    videoMode: model.videoMode,
  }
}

export function validateImportedModel(input: unknown): { valid: boolean; message: string; value?: ExportedModel } {
  if (!input || typeof input !== 'object') {
    return { valid: false, message: 'Imported model must be a JSON object.' }
  }

  const candidate = input as Partial<ExportedModel>
  if (candidate.schemaVersion !== 1) {
    return { valid: false, message: 'Imported model schemaVersion must be 1.' }
  }

  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.relations) || !Array.isArray(candidate.profiles) || !Array.isArray(candidate.scenarios)) {
    return { valid: false, message: 'Imported model must include nodes, relations, profiles and scenarios arrays.' }
  }

  return {
    valid: true,
    message: 'Model validation passed.',
    value: candidate as ExportedModel,
  }
}

export function getStressScenarioById(scenarios: Scenario[], id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id)
}

export function getNodeById(nodes: SystemNode[], id: string): SystemNode | undefined {
  return nodes.find((node) => node.id === id)
}

export function getEnabledRelationsForNode(relations: InfluenceRelation[], nodeId: string): InfluenceRelation[] {
  return relations.filter((relation) => relation.enabled && (relation.source === nodeId || relation.target === nodeId))
}

export function getIncomingRelations(relations: InfluenceRelation[], nodeId: string): InfluenceRelation[] {
  return relations.filter((relation) => relation.enabled && relation.target === nodeId)
}

export function getOutgoingRelations(relations: InfluenceRelation[], nodeId: string): InfluenceRelation[] {
  return relations.filter((relation) => relation.enabled && relation.source === nodeId)
}

export function createEventLogEntry(step: number, type: string, message: string, nodeId?: string): SimulationEvent {
  return {
    step,
    type,
    nodeId,
    message,
    details: { nodeId: nodeId ?? '' },
  }
}

export function computeRobustness(_: SystemNode[], profileValues: Record<string, number>): {
  availability: number
  integration: number
  battlefield: number
  metrics: Record<string, number>
} {
  const availabilityValues = [
    profileValues.capture_replacement_pool ?? 0,
    profileValues.feed_water_movement ?? 0,
    profileValues.husbandry_veterinary_knowledge ?? 0,
    profileValues.political_access ?? 0,
  ]
  const integrationValues = [
    profileValues.mahout_pool ?? 0,
    profileValues.training_tradition ?? 0,
    profileValues.combined_arms_doctrine ?? 0,
    profileValues.elephant_availability ?? 0,
  ]

  const availability = weightedGeometricMean(availabilityValues, [1.2, 1.1, 1.3, 1.1])
  const integration = weightedGeometricMean(integrationValues, [1.4, 1.3, 1.2, 1.1])
  const battlefield = calculateBattlefieldEffect(
    availability,
    integration,
    profileValues.combined_arms_doctrine ?? 0,
    profileValues.enemy_adaptation ?? 0,
  )

  return {
    availability,
    integration,
    battlefield,
    metrics: {
      availability,
      integration,
      battlefield,
      ecological_resource_base: profileValues.ecological_resource_base ?? 0,
      political_access: profileValues.political_access ?? 0,
      capture_replacement_pool: profileValues.capture_replacement_pool ?? 0,
      feed_water_movement: profileValues.feed_water_movement ?? 0,
      husbandry_veterinary_knowledge: profileValues.husbandry_veterinary_knowledge ?? 0,
      training_tradition: profileValues.training_tradition ?? 0,
      mahout_pool: profileValues.mahout_pool ?? 0,
      combined_arms_doctrine: profileValues.combined_arms_doctrine ?? 0,
      elephant_availability: profileValues.elephant_availability ?? 0,
      military_integration: profileValues.military_integration ?? 0,
      enemy_adaptation: profileValues.enemy_adaptation ?? 0,
    },
  }
}
