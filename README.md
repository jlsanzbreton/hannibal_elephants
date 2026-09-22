# Hannibal’s Elephants

A local-first educational web application exploring whether Hellenistic armies could reproduce the visible weapon of the war elephant without reproducing the broader Indian source ecosystem that sustained it.

## Project purpose

This project models the hypothesis that:

> Hellenistic armies could reproduce the visible weapon—the war elephant—but struggled to reproduce the complete ecological, logistical, institutional and military system that sustained it in parts of India.

The application is not a historical probability calculator. It is a systems model inspired by Risks In Sync (RiS): a way to make dependencies, boundary pressure, and communication pathways legible.

## Central historical hypothesis

The model is built to explore how a war-elephant force is not just a set of animals, but a broader system made of resource access, husbandry, transport, command, and political continuity. The app compares two provisional profiles:

- Indian source ecosystem
- Hellenistic transplant

The model does not claim that one profile was universally superior or that a single variable caused decline. It highlights how subsystem weaknesses can accumulate, cross thresholds, and shape battlefield outcomes.

## The two RiS principles

1. Systems accumulate free energy or unresolved pressure at their boundaries. When this exceeds a threshold, a share is released.
2. Systems influence other systems only when a communication medium connects them.

These are modelling assumptions for this project, not laws of physics or proven historical conclusions.

## Important disclaimer

This is an illustrative hypothesis model. Values are editable assumptions, not measured historical probabilities.

The interface permanently displays:

> Illustrative hypothesis model — values are editable assumptions, not measured historical probabilities.

The calculation outputs are deliberately described as model outputs, and evidence confidence is metadata rather than automatic causal weighting unless the user explicitly enables an uncertainty-adjusted view.

## How to install and run

```bash
npm install
npm run dev
npm test
npm run build
```

## Current application state

The current screen is designed to use the full desktop viewport without structural scroll:

- The application shell expands to the full browser width; comparison panels share the available desktop space.
- A compact header contains profile focus, scenario, stress, step count, and simulation controls.
- The Indian source ecosystem and Hellenistic transplant appear side by side as layered dependency pyramids.
- Each profile header shows only System robustness and Breakdown pressure; Battlefield effect is shown once, as the outcome node at the pyramid summit.
- Each node shows its live simulated value, accumulated boundary pressure, and a value meter.
- `Run` advances both profiles at the same cadence. `Step` advances exactly one discrete simulation step. `Reset` restores the seed model.
- Selecting a node opens a modal editor above the comparison. Changes remain a draft until `Save changes`; `Cancel`, the close control, and clicking the backdrop discard the draft.
- `Dependencies` expands the same modal without losing the node draft. It groups incoming and outgoing relationships, lets the user edit or disable a relationship, and supports adding or removing a relationship.
- Relationship saves are validated: endpoints must exist, self-links and duplicate source-target pairs are rejected, ratio parts must be positive, and delay must be a non-negative integer.
- `?` controls beside editable values show brief contextual help. The help closes on pointer exit, when another help is opened, or after a few seconds.
- Saved profile values and model definitions persist locally through browser `localStorage`. `Export` downloads the persistent model data as JSON.

Relationships can be created and edited within a node's modal. The comparison pyramid remains deliberately fixed as a readable presentation layer; adding a relationship changes simulation behavior but does not dynamically redraw a freeform network.

## Reading the screen

All values are model values on a $0$ to $100$ scale unless stated otherwise. They are assumptions for exploration, not measurements or historical probabilities.

| UI item | Meaning |
| --- | --- |
| `System robustness` | A bottleneck-aware aggregate of replacement capacity, feed and movement, husbandry, and political access. A higher value means the model has more capacity to keep elephants available and sustained. Handler, training, doctrine, and enemy-adaptation effects feed the separate battlefield calculation. |
| `Breakdown pressure` | The inverse of aggregate battlefield effect: $100 - \text{battlefield effect}$. It is a compact warning signal, not an independent causal variable. Higher means greater system fragility in the current model state. |
| Node value | The current live value for that subsystem in the profile. Higher is normally better, except for nodes such as Enemy adaptation, where a higher value represents a stronger opposing constraint. |
| `Pressure` | Boundary pressure accumulated by a node relative to its threshold. At $100\%$, the node has reached or exceeded its threshold and can release stress into the rest of the simulation. |
| Node meter | A visual restatement of the current node value, not of pressure. Its color distinguishes the two profiles. |
| `Step` | Advances both profiles by one discrete simulation step under the selected scenario and stress. |
| `Run` | Repeats simulation steps until paused. |

For an editable node, the modal fields mean:

- **Starting value**: the node value restored on reset for the selected profile.
- **Threshold**: pressure at which the node begins to release stress.
- **Buffer capacity / absorption / dissipation / recovery**: respectively, how much pressure can be held, taken in, naturally lost, and restored per step.
- **Vulnerability / release fraction**: how strongly threshold release changes the node, and how much excess pressure is released.
- **Polarity**: direct moves a target with the source; inverse moves it in the opposite direction.
- **Strength / medium availability**: relationship multipliers. Availability at $0$ blocks that relationship.
- **Curve / activation threshold / ratio / delay**: shape, activation condition, explicit source-to-target scale, and the modelled relationship timing assumption.

## How the dependency model works

Nodes represent systems and conditions. Relations represent influence pathways. The UI renders node dependencies as a layered pyramid rather than a freeform graph, keeping both historical profiles immediately comparable.

The graph is deliberately structured in a layered pyramid:

- Foundations at the bottom
- Capabilities in the middle
- Elephant Availability and Military Integration above
- Battlefield Effect at the top
- Power Demonstration downstream of Battlefield Effect

## Node model

Each node contains:

- current and baseline values
- higher-is-better metadata
- boundary energy and threshold
- buffer capacity and remaining buffer
- absorption, dissipation and recovery rates
- vulnerability and release fraction
- evidence confidence and notes

This makes the model legible as both an explanatory system and a changeable scenario engine.

## Edge model

Every relation includes:

- source and target node IDs
- polarity: direct, inverse, or nonlinear
- curve: linear, saturating, or threshold
- ratio semantics in the form source change : target change
- strength and medium availability
- delay and activation threshold
- medium name and description
- rationale and evidence metadata
- enabled/disabled state

Ratio semantics are explicit:

- 1:3 means one unit of source change produces three units of target change before other modifiers
- 4:1 means four units of source change produce one unit of target change

The internal model uses the coefficient:

```ts
ratioCoefficient = targetPart / sourcePart
```

and then:

```ts
effectiveCoefficient = ratioCoefficient * strength * mediumAvailability
```

The transmission is blocked when mediumAvailability is 0.

## Boundary-energy and threshold model

This app uses a conceptual discrete-time model rather than a validated physical equation.

The engine follows the conceptual step model described in the specification:

```ts
incomingPressure_i(t) = externalPressure_i(t) + sum(transmittedPressure_ji(t - delay_ji))
absorbed_i(t) = min(bufferRemaining_i(t), incomingPressure_i(t) * absorptionRate_i)
boundaryEnergy_i(t + 1) = max(0, boundaryEnergy_i(t) + incomingPressure_i(t) - absorbed_i(t) - dissipationRate_i)
bufferRemaining_i(t + 1) = clamp(bufferRemaining_i(t) - absorbed_i(t) + recoveryRate_i, 0, bufferCapacity_i)
```

When boundary energy crosses the threshold, the node releases pressure and emits signals along enabled edges. The release is not zeroed away; a residual boundary energy remains to allow chains of pressure and delayed propagation.

## Robustness calculation

The interface presents a transparent robustness calculation built from a weighted approach that prevents a single strong average from hiding a bottleneck.

The model uses weighted geometric means for availability and integration, with a bottleneck-aware battlefield calculation. The formula is centralized in the engine and can be adjusted as the model evolves.

## Seed profiles

The app ships with two provisional profiles:

- Indian source ecosystem
- Hellenistic transplant

Both are deliberately editable. The initial values are illustrative hypotheses rather than settled historical facts.

## Repository workflow

- `main` is the stable base branch.
- Active development takes place on `dev`.
- Open a pull request from `dev` to `main` in GitHub when a reviewed milestone is ready to merge.

## Suggestions for the next iteration

1. Make relation delay operational in the simulation queue; the model schema and editor expose `delaySteps`, while the current UI-focused simulation uses immediate step propagation.
2. Add a scenario timeline or event log so users can explain why a node reached its pressure threshold.
3. Add source and evidence editing, with citations visible at node and relation level.
4. Add focused UI tests for node and relation drafts: save, cancel, duplicate validation, local persistence, and reset behavior.
5. Add an import action with schema validation to complement the existing JSON export.

## How to add evidence and sources

Each node and relationship has a sources array. It is intentionally easy to add citations, notes, or provenance later. Seed arrays are kept minimal and can be expanded with historical works or modern scholarship.

## Known limitations

- This is a conceptual educational model, not a validated historical simulator.
- The app avoids claiming any measured historical probability.
- The graph simplifies highly complex political, ecological, and military systems.
- The seed data is intentionally provisional and editable.
- Relationship strength and evidence confidence are illustrative rather than academically exhaustive.
- Relation delay is editable but is not yet delivered through a delayed-signal queue in the UI simulation loop.
- New relationships affect the simulation but are not automatically drawn as new lines in the fixed pyramid presentation.

## Future research questions

- Which Indian states or regions had the most robust elephant-resource systems?
- How did disease, transport, and route security interact with elephant performance?
- How did enemy adaptation and command integration vary between campaigns?
- Which communication media mattered most in practice: logistics, doctrine, diplomacy, or political prestige?

## Screenshots

Placeholder for future screenshots and short annotated captures.

## Contribution guidance

Contributions are welcome if they improve the model clarity, transparency, or historical sensitivity.

1. Keep the model logic separate from React components.
2. Write engine tests for behavioral changes.
3. Preserve the distinction between evidence, assumptions, and outputs.
4. Avoid fabricated historical precision or sources.
5. Prefer explicit assumptions over hidden calculations.

## What this model does not prove

This model does not establish that every Indian polity had the same elephant system. It does not treat all Hellenistic kingdoms as identical. It does not prove that one weak factor caused the historical decline of war elephants. It does not derive statistical probability from historical evidence. It is intended to expose dependencies, assumptions, and possible failure paths rather than to produce a historical verdict.

## License

This project is distributed under the MIT license.
