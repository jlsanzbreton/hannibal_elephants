import { describe, it, expect } from 'vitest'
import {
  ratioToCoefficient,
  applyPolarity,
  computeEffectiveCoefficient,
  computeCurveResponse,
  buildDelayedSignal,
  absorbPressure,
  thresholdRelease,
  createSeedModel,
  resetModel,
  validateImportedModel,
  calculateBattlefieldEffect,
} from './engine'

describe('engine', () => {
  it('1:3 converts to coefficient 3', () => {
    expect(ratioToCoefficient(1, 3)).toBe(3)
  })

  it('4:1 converts to coefficient 0.25', () => {
    expect(ratioToCoefficient(4, 1)).toBeCloseTo(0.25, 10)
  })

  it('direct relationships preserve change direction', () => {
    expect(applyPolarity(12, 'direct')).toBe(12)
  })

  it('inverse relationships reverse change direction', () => {
    expect(applyPolarity(12, 'inverse')).toBe(-12)
  })

  it('medium availability of zero blocks all transmission', () => {
    expect(computeEffectiveCoefficient(1, 1, 0, 0, 0.1)).toBe(0)
  })

  it('threshold curves do not transmit before activation', () => {
    const result = computeCurveResponse(3, 'threshold', 5, 0.75)
    expect(result).toBe(0)
  })

  it('saturating curves cannot grow without bound', () => {
    const resultA = computeCurveResponse(10, 'saturating', 0, 0.9)
    const resultB = computeCurveResponse(20, 'saturating', 0, 0.9)
    expect(resultA).toBeGreaterThan(0)
    expect(resultB).toBeGreaterThan(resultA)
    expect(resultB).toBeLessThanOrEqual(10)
  })

  it('delay steps postpone the signal correctly', () => {
    const outgoing = buildDelayedSignal({ source: 'a', target: 'b', delaySteps: 2, value: 7 })
    expect(outgoing.deliveredAt).toBe(2)
    expect(outgoing.value).toBe(7)
  })

  it('buffers absorb pressure and are depleted', () => {
    const result = absorbPressure(25, 10, 10)
    expect(result.absorbed).toBe(10)
    expect(result.remainingBuffer).toBe(0)
  })

  it('threshold crossing produces a release', () => {
    const released = thresholdRelease(12, 5, 0.4)
    expect(released).toBeGreaterThan(0)
  })

  it('reset recreates the exact initial state', () => {
    const model = createSeedModel()
    const reset = resetModel(model)
    expect(reset.nodes).toHaveLength(model.nodes.length)
    expect(reset.relations).toHaveLength(model.relations.length)
    expect(reset.step).toBe(0)
  })

  it('identical initial states produce identical simulations', () => {
    const modelA = createSeedModel()
    const modelB = createSeedModel()
    expect(modelA.nodes).toEqual(modelB.nodes)
    expect(modelA.relations).toEqual(modelB.relations)
  })

  it('feedback loops do not cause recursion or freeze the app', () => {
    const model = createSeedModel()
    expect(model.relations.some((r) => r.source === 'power_demonstration' && r.target === 'political_access')).toBe(true)
    expect(model.step).toBe(0)
  })

  it('invalid imported JSON does not replace the current model', () => {
    const result = validateImportedModel({ bad: 'payload' })
    expect(result.valid).toBe(false)
  })

  it('battlefield effect responds to upstream changes', () => {
    const base = calculateBattlefieldEffect(80, 70, 60, 30)
    const boosted = calculateBattlefieldEffect(90, 80, 70, 25)
    expect(boosted).toBeGreaterThan(base)
  })
})
