# ClearUse

Use AI. Show your thinking.

ClearUse helps students explain how they used AI, describe their own contribution, reflect on an independent decision, and generate an AI Use Receipt.

## Demo

- Hosted app: https://clearuse-student-receipt.ignatfarmax.chatgpt.site/
- Hackathon submission: https://devpost.com/software/clearuse

The hosted app currently requires owner-authorized ChatGPT access. The source can be run locally without a ChatGPT account or API key.

## Features

- Four-step assignment and reflection workflow
- Browser-local draft saving
- Example assignment
- Copy receipt and print / save as PDF through the browser
- Responsive layout

The receipt documents process and reflection; it does not prove authorship and is not an AI detector. Drafts remain in localStorage on the same browser. ClearUse does not call an AI model to generate its receipts.

## Stack

React, TypeScript, Tailwind CSS, shadcn UI components, and Vinext/Vite using Next.js conventions. Cloudflare tooling is included by the original Sites starter. Optional database examples are starter code and are not used by the ClearUse workflow.

## Run locally

Requires Node.js >=22.13.0 and pnpm 11.25.0 (the version declared in package.json).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed by the development server (normally http://localhost:5173).

```sh
pnpm build
```

Internet access is needed to install dependencies; the layout uses Google Fonts. No application environment variables or API keys are needed for the current workflow.

## Source map

- app/page.tsx: workflow, draft persistence, and receipt
- app/globals.css: styles and print layout
- app/layout.tsx: metadata and fonts
- components/ui/: shared UI components

## AI disclosure

This project was developed with AI assistance in ChatGPT Sites, including implementation and wording. The student author directed the product concept, feature choices, testing, and revisions. AI-assisted development does not imply that the application calls an AI API at runtime.

## Export note

This is the existing ClearUse source recovered from its Sites repository, commit 3121681d37dc9c5a5468e5b31f9f2a63effd1cec. This export replaces the starter README and uses an empty .openai/hosting.json to remove the original hosting project identifier while preserving the configuration import needed for local development. Application source files are unchanged. Git history, installed dependencies, runtime data, and credentials are not included. A fresh installation/build of this export has not been run in this environment.
