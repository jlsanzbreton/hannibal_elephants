# Architecture

## Overview

The application separates model logic from presentation. The engine computes deterministic state changes, while the React layer renders a two-profile dependency-pyramid comparison and a modal node editor.

## Data flow

1. Seed data is created from the model layer.
2. UI state reads the current model from localStorage when available.
3. App state creates an independent live node set for each profile, initialized from its profile values.
4. The comparison renders each live node set in the same layered pyramid.
5. `Step` and `Run` advance both live node sets under the selected scenario and stress intensity.
6. A node editor operates on a local draft. Only `Save changes` writes the result to the selected profile and persistent model state.
7. Results are fed back into the UI and the persistent model can be exported as JSON.

## Key files

- src/model/types.ts — shared model types and interfaces
- src/model/engine.ts — deterministic engine logic and seed data
- src/model/engine.test.ts — model behavior tests
- src/App.tsx — profile simulations, comparison pyramids, simulation controls, and draft modal editor
- src/App.css — compact documentary comparison layout and modal styling
- src/data/seedModel.ts — seed data exports

## Model conventions

- All simulations are deterministic.
- The same initial state and actions produce the same result.
- Pressure can propagate only via enabled relations and communication media.
- Delay steps are integer simulation steps and avoid recursive immediate propagation.
- Evidence confidence is metadata; it does not automatically change causal strength unless the user explicitly enables a separate uncertainty-adjusted mode.
- Each profile simulation is isolated, so running a scenario updates both profiles without mutating one profile through the other.
- The Battlefield effect node is synchronized with the aggregate robustness calculation so the pyramid outcome and headline model calculation agree.
- Node editing uses a draft-and-save boundary to avoid accidental persistent mutations while a user is exploring assumptions.

## Why this structure

The separation keeps the engine easy to test without React and avoids hidden UI side effects. It also makes future extensions easier, such as relation editing, delayed signal queues, uncertainty adjustments, richer scenario metadata, or alternate historical profiles.
