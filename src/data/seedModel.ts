import {
  createSeedModel,
  createSeedProfiles,
  createSeedRelations,
  createSeedScenarios,
  createSeedNodes,
} from '../model/engine'

export const seedNodes = createSeedNodes()
export const seedRelations = createSeedRelations()
export const seedProfiles = createSeedProfiles()
export const seedScenarios = createSeedScenarios()
export const initialSeedModel = createSeedModel()
