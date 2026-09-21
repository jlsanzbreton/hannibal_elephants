# Architecture

## Overview

The application separates model logic from presentation. The engine computes deterministic state changes, while the React layer renders the graph and editors.

## Data flow

1. Seed data is created from the model layer.
2. UI state reads the current model from localStorage when available.
3. The graph renders nodes and edges from the model state.
4. The simulation engine updates node boundary energy, thresholds and transmitted signals.
5. Results are fed back into the UI and optionally exported as JSON.

## Key files

- src/model/types.ts — shared model types and interfaces
- src/model/engine.ts — deterministic engine logic and seed data
- src/model/engine.test.ts — model behavior tests
- src/App.tsx — interactive graph and top-level application state
- src/App.css — documentary visual system
- src/data/seedModel.ts — seed data exports

## Model conventions

- All simulations are deterministic.
- The same initial state and actions produce the same result.
- Pressure can propagate only via enabled relations and communication media.
- Delay steps are integer simulation steps and avoid recursive immediate propagation.
- Evidence confidence is metadata; it does not automatically change causal strength unless the user explicitly enables a separate uncertainty-adjusted mode.

## Why this structure

The separation keeps the engine easy to test without React and avoids hidden UI side effects. It also makes future extensions easier, such as uncertainty adjustments, richer scenario metadata, or alternate historical profiles.
