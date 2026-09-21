# Contributing

This project is a local-first educational model. Contributions should remain transparent, historically careful, and easy to test.

## Workflow

1. Keep the engine logic in the model layer and independent from UI code.
2. Add or update tests for behavior changes.
3. Prefer explicit assumptions over hidden calculations.
4. Avoid fabricated historical precision or sources.
5. Preserve the educational framing: this is an illustrative system model, not a probability calculator.

## Local development

```bash
npm install
npm test
npm run build
npm run dev
```

## Pull requests

When submitting changes, explain:

- the model assumption affected
- the new or changed behavior
- the verification command run
- any limitations or remaining uncertainty
