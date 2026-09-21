# Playwright Generalized Test Framework: Architecture & Developer Manual

> **System Overview**: This document provides a complete, architectural-level explanation of the generalized Playwright test automation framework implemented in `PlaywrightDemo-main`. It explains how the declarative Finite State Machine (FSM), autonomous APEX form filler, page registry, and step handlers operate together, and provides an actionable blueprint for automating new business modules.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Complete Folder Structure](#2-complete-folder-structure)
3. [Purpose of Each Important File](#3-purpose-of-each-important-file)
4. [Complete Test Execution Flow](#4-complete-test-execution-flow)
5. [JSON Files and Their Schemas](#5-json-files-and-their-schemas)
6. [Complete JSON Example](#6-complete-json-example)
7. [Form Filling Architecture](#7-form-filling-architecture)
8. [Workflow Engine Architecture](#8-workflow-engine-architecture)
9. [Handler/Action Architecture](#9-handleraction-architecture)
10. [State Management](#10-state-management)
11. [Locator Strategy](#11-locator-strategy)
12. [Generic vs Module-Specific Code](#12-generic-vs-module-specific-code)
13. [How to Add a New Module](#13-how-to-add-a-new-module)
14. [Minimum Required Input for a New Module](#14-minimum-required-input-for-a-new-module)
15. [Existing Module End-to-End Example](#15-existing-module-end-to-end-example)
16. [Dependency Map](#16-dependency-map)
17. [Naming Conventions](#17-naming-conventions)
18. [Files I Should Not Touch](#18-files-i-should-not-touch)
19. [Common Configuration Mistakes](#19-common-configuration-mistakes)
20. [One-Page Quick Reference](#20-one-page-quick-reference)

---

## 1. Architecture Overview

The testing framework is designed around a **Declarative Finite State Machine (FSM) & Self-Discovering Automation Engine** specifically optimized for enterprise Oracle APEX applications.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLAYWRIGHT TEST SPEC                            │
│           (e.g., incidentWorkflow.spec.js, hazmatWorkflow.spec.js)     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ imports & executes
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      GENERIC WORKFLOW ENGINE                           │
│   (workflowEngine.js, decisionStrategy.js, assertionRunner.js)         │
├────────────────────────────────────────────────────────────────────────┤
│ • Finite State Machine execution loop                                  │
│ • State visit guards & cycle mitigation                                │
│ • Multi-branch decision strategies (approve, reject, rework)           │
│ • Declarative pre- & post-step assertions                              │
└──────┬───────────────────────────┬───────────────────────────────┬─────┘
       │ delegates by state.type   │ resolves pages/locators       │ fills form
       ▼                           ▼                               ▼
┌─────────────────────────┐ ┌───────────────────────────┐ ┌──────────────┐
│  STEP HANDLERS REGISTRY │ │       PAGE REGISTRY       │ │ APEX FORM    │
│  (stepHandlerRegistry)  │ │     (pageRegistry.js)     │ │ FILLER       │
├─────────────────────────┤ ├───────────────────────────┤ ├──────────────┤
│ • form (stepForm)       │ │ Central semantic registry │ │ • Label      │
│ • submit (stepSubmit)   │ │ mapping logical names to: │ │   matching   │
│ • review (stepReview)   │ │  - Page definitions       │ │ • Smart DOM  │
│ • assignment            │ │  - URL/Icon triggers      │ │   discovery  │
│ • action / click / tab  │ │  - Element selectors      │ │ • Dynamic    │
│ • tableAction/selectRow │ │  - Scope boundaries       │ │   dropdowns  │
│ • closure / decision    │ └───────────────────────────┘ │ • Toggles    │
└─────────────────────────┘                               └──────────────┘
```

### Key Architectural Concepts:
1. **Decoupled Orchestration**: Test flows are defined as declarative JSON state machines, completely independent from test execution logic.
2. **Autonomous Form Discovery**: The `ApexFormFiller` scans the DOM, matches labels case-insensitively, handles dynamic cascading dropdowns, toggles switches, and uploads files without requiring hardcoded element IDs.
3. **Pluggable Dispatcher**: Step handlers implement distinct operational behaviors (`form`, `submit`, `review`, `assignment`, `action`, `tableAction`, `closure`) and are registered dynamically into a central registry.
4. **Central Semantic Registry**: Selectors and page navigation patterns are registered once in a global `PageRegistry` using pure XPath or CSS, preventing selector duplication across test files.

---

## 2. Complete Folder Structure

```text
d:\playwright\PlaywrightDemo-main\
├── config/
│   └── workflows/
│       ├── contractorSupplier.workflow.json    # CSM operational workflow FSM
│       ├── hazmat.workflow.json                # Hazardous Materials approval workflow
│       ├── incident.workflow.json              # Full 29-step Incident Management FSM
│       └── nearMiss.workflow.json              # Near-Miss reporting & RCA workflow
├── data/
│   ├── contractorSupplierData.json             # Form data for CSM vendor registration
│   ├── hazmatChemical.json                     # Form data for Hazmat module
│   ├── incidentData.json                       # Form data for Incident reporting, scope, approvals
│   ├── nearMissData.json                       # Form data for Near-Miss, RCA & CAPA
│   └── testIncidentForm.json                   # Extended form test payloads
├── pages/
│   ├── pageRegistry.js                         # Central semantic page and locator registry
│   ├── incidentPage.js                         # Incident module page definitions and XPath locators
│   ├── hazmatPage.js                           # Hazmat module pages and locators
│   ├── nearMissPage.js                         # Near-Miss module pages and locators
│   ├── contractorSupplierPage.js               # CSM module pages and locators
│   ├── loginpage.js                            # Legacy direct POM for login
│   └── homepage.js                             # Legacy direct POM for home
├── workflows/
│   ├── engine/
│   │   ├── workflowEngine.js                   # Core FSM executor & lifecycle loop
│   │   ├── stepHandlerRegistry.js              # State type to handler dispatcher
│   │   ├── decisionStrategy.js                 # Strategy logic (approve/reject/rework/seeded PRNG)
│   │   └── assertionRunner.js                  # Declarative assertion executor
│   ├── navigation/
│   │   └── navigationHelper.js                 # Cross-page navigation and tab switcher
│   └── steps/
│       ├── stepAction.js                       # Generic clicks, tabs, menu items, iframe modal clicks
│       ├── stepAssignment.js                   # Modal iframe user assignment handler
│       ├── stepClosure.js                      # Closure initiation & closure review handlers
│       ├── stepForm.js                         # Form state handler delegating to ApexFormFiller
│       ├── stepReview.js                       # Approval/Rejection/Rework decision handler
│       ├── stepSubmit.js                       # Submit button & APEX modal confirmation handler
│       └── stepTableAction.js                  # Interactive grid / table row finder & eye-icon clicker
├── utils/
│   ├── apexFormFiller.js                       # Reusable APEX label-matching form filler
│   ├── badgeColors.js                          # Badge status color RGB assertions
│   ├── badgeColor.json                         # Expected badge color definitions
│   └── jira.js                                 # Optional JIRA bug integration
├── tests/
│   ├── workflows/
│   │   ├── incidentWorkflow.spec.js            # Live end-to-end test spec for Incident Module
│   │   ├── hazmatWorkflow.spec.js              # Test spec for Hazmat Chemical Module
│   │   ├── nearMissWorkflow.spec.js            # Test spec for Near-Miss Reporting Module
│   │   ├── contractorSupplierWorkflow.spec.js  # Test spec for Contractor Supplier Module
│   │   ├── threeModulesWorkflow.spec.js        # Multi-module DOM verification tests
│   │   └── workflowEngine.spec.js              # Unit tests for Engine, PRNG, and Handlers
│   └── login.spec.js                           # Direct authentication tests
├── explanation/                                # Documentation and architectural manuals
├── playwright.config.js                        # Playwright configuration
├── package.json                                # Node dependencies and test scripts
└── .env                                        # Environment configuration (credentials, URLs)
```

---

## 3. Purpose of Each Important File

| File Path | Role | Key Functions / Classes | Generic or Module-Specific? | Modify for New Module? |
|---|---|---|---|---|
| `workflows/engine/workflowEngine.js` | Core FSM executor | `executeWorkflow()`, `WorkflowLimitExceededError` | **Generic** | **No** |
| `workflows/engine/stepHandlerRegistry.js` | Step type dispatcher | `StepHandlerRegistry.register()`, `StepHandlerRegistry.execute()` | **Generic** | **No** |
| `workflows/engine/decisionStrategy.js` | Review branching logic | `DecisionStrategy`, `SeededRandom` | **Generic** | **No** |
| `workflows/engine/assertionRunner.js` | Declarative assertions | `AssertionRunner.run()`, `AssertionRunner._resolveLocator()` | **Generic** | **No** |
| `workflows/navigation/navigationHelper.js` | Cross-page navigation | `NavigationHelper.navigateTo()` | **Generic** | **No** |
| `workflows/steps/stepForm.js` | Form step handler | `executeStepForm()` | **Generic** | **No** |
| `workflows/steps/stepSubmit.js` | Submit & confirm dialogs | `executeStepSubmit()` | **Generic** | **No** |
| `workflows/steps/stepAction.js` | Clicks, tabs, menu items | `executeStepAction()` | **Generic** | **No** |
| `workflows/steps/stepTableAction.js` | Table row eye/action click | `executeStepTableAction()` | **Generic** | **No** |
| `workflows/steps/stepAssignment.js` | Modal iframe assignment | `executeStepAssignment()` | **Generic** | **No** |
| `workflows/steps/stepReview.js` | Approval / rejection flow | `executeStepReview()` | **Generic** | **No** |
| `workflows/steps/stepClosure.js` | Incident / record closure | `executeStepClosureInitiation()`, `executeStepClosureReview()` | **Generic** | **No** |
| `utils/apexFormFiller.js` | Autonomous form discovery | `ApexFormFiller` | **Generic** | **No** |
| `pages/pageRegistry.js` | Semantic locator dictionary | `PageRegistry`, `defaultRegistry` | **Generic** | **No** |
| `config/workflows/incident.workflow.json` | Workflow JSON configuration | State definitions, transitions | **Module-Specific** | **Yes (Create new for new module)** |
| `data/incidentData.json` | Form field values | Key-value dictionary | **Module-Specific** | **Yes (Create new for new module)** |
| `pages/incidentPage.js` | Page & locator registrations | `registerIncidentPages()` | **Module-Specific** | **Yes (Create new for new module)** |
| `tests/workflows/incidentWorkflow.spec.js` | Test spec trigger | Playwright test definition | **Module-Specific** | **Yes (Create new for new module)** |

---

## 4. Complete Test Execution Flow

```text
1. Execution Command:
   npx playwright test tests/workflows/incidentWorkflow.spec.js --headed --project=Desktop --reporter=list
       │
       ▼
2. Playwright Test Runner:
   - Reads playwright.config.js
   - Loads desktop browser context with ignoreHTTPSErrors: true
       │
       ▼
3. Test Spec Execution (incidentWorkflow.spec.js):
   - Sets test.setTimeout(180000)
   - Navigates to targetUrl
   - Detects session expiration or login page (#P9999_USERNAME)
   - Fills credentials (alice@abc.com / Oracle@12345) and clicks Sign In
   - Waits for "Go To Module" landing button and clicks it
   - Imports config/workflows/incident.workflow.json
   - Imports data/incidentData.json
   - Imports pages/incidentPage.js (registers locators into defaultRegistry)
   - Calls executeWorkflow(page, incidentWorkflow, incidentTestData, options)
       │
       ▼
4. Workflow Engine Finite State Machine (workflowEngine.js):
   - Initializes context: { currentState: workflowConfig.start, attempts: 0, stateVisits: {}, history: [] }
   - Evaluates DecisionStrategy (defaults to "approve")
   - Loops while context.currentState != null:
       ├── Guard 1: Verify context.attempts < maxAttempts
       ├── Guard 2: Increment stateVisits[currentState] and assert <= maxStateVisits[currentState]
       ├── Step Pre-Assertions: AssertionRunner.run(stateDef.preAssertions)
       ├── Navigation: If stateDef.page is defined and not on that page -> NavigationHelper.navigateTo()
       │
       ├── Step Execution Dispatch: StepHandlerRegistry.execute(page, stateDef, context)
       │      │
       │      ├── If stateDef.type === "form":
       │      │     stepForm.js extracts fieldData -> calls ApexFormFiller.fillAll()
       │      │     -> matches visible <label> text to data -> inputs text, selects options, sets toggles
       │      │
       │      ├── If stateDef.type === "submit":
       │      │     stepSubmit.js clicks button -> waits for APEX "OK" confirmation dialog
       │      │     -> clicks OK -> asserts no APEX error toast
       │      │
       │      ├── If stateDef.type === "tableAction":
       │      │     stepTableAction.js scans table for row matching status ("Open", "In Progress")
       │      │     -> clicks Actions column Eye icon using relative .// XPath
       │      │
       │      ├── If stateDef.type === "assignment":
       │      │     stepAssignment.js clicks Assign -> detects modal iframe
       │      │     -> selects random valid user from dropdown -> clicks inner Assign button
       │      │
       │      ├── If stateDef.type === "action":
       │      │     stepAction.js checks scope -> ensures active tab -> scrolls into view
       │      │     -> clicks button/tab -> executes sub-menu actions or dialog confirmations
       │      │
       │      └── If stateDef.type === "review":
       │            stepReview.js queries DecisionStrategy -> enters comment -> clicks action button
       │            -> selects transition branch
       │
       ├── Step Post-Assertions: AssertionRunner.run(stateDef.assertions)
       ├── History Logging: Appends step, state, action, and duration to context.history
       ├── Terminal Check: If result.isTerminal or stateDef.type in ["complete", "rejected", "closed"] -> breaks loop
       └── State Transition: context.currentState = result.nextState
       │
       ▼
5. Test Assertions & Report:
   - expect(result.status).toBe("completed");
   - expect(result.history.length).toBeGreaterThanOrEqual(10);
   - Attaches markdown table and workflow-history.json to Playwright test report.
```

---

## 5. JSON Files and Their Schemas

To automate a new module, you only need to provide **two JSON files**:
1. **Workflow JSON (`config/workflows/<module>.workflow.json`)**
2. **Business Data JSON (`data/<module>Data.json`)**

### A. Workflow JSON Schema (`config/workflows/*.workflow.json`)
Read by: `workflows/engine/workflowEngine.js`

```json
{
  "name": "string (Required) - Descriptive title of the operational workflow",
  "module": "string (Required) - Module identifier, e.g. 'incident', 'chemical'",
  "version": "string (Optional) - Workflow schema version, e.g. '1.0.0'",
  "start": "string (Required) - Exact key of the first state to execute",
  "maxAttempts": "number (Optional) - Global step execution limit to prevent runaway loops (Default: 10)",
  "strategy": "string (Optional) - Default decision strategy: 'approve' | 'reject' | 'sendBack' | 'sendBackThenApprove' | 'random'",
  "maxStateVisits": {
    "<STATE_NAME>": "number (Optional) - Maximum times an individual state can be re-entered (loop mitigation)"
  },
  "states": {
    "<STATE_KEY>": {
      "type": "string (Required) - Handler type: 'form' | 'submit' | 'review' | 'assignment' | 'action' | 'tableAction' | 'closureInitiation' | 'closureReview' | 'decision' | 'complete' | 'rejected' | 'closed'",
      "page": "string (Optional) - Semantic page key to navigate to. Omit for in-page/in-tab actions",
      "forceNavigation": "boolean (Optional) - If true, re-navigates even if current page matches",
      "next": "string (Required for linear states) - Key of the next state to execute",

      /* --- Form State Properties --- */
      "formKey": "string (Optional) - Key inside data.json containing fields for this form",
      "scope": "string (Optional) - Selector/Key defining the form container (Default: #t_Body_content)",
      "enableToggles": "boolean (Optional) - Auto-enable boolean switches (Default: true)",
      "testBoundaries": "boolean (Optional) - Run boundary checks on textareas (Default: false)",

      /* --- Submit State Properties --- */
      "button": "string (Optional) - Semantic locator key for the submit button",
      "modalConfirm": "boolean (Optional) - Automatically wait and confirm APEX dialog OK (Default: true)",
      "modalTimeout": "number (Optional) - Timeout in ms for dialog popup (Default: 10000)",
      "checkErrors": "boolean (Optional) - Assert no APEX red error alerts appeared (Default: true)",
      "catchErrors": "boolean (Optional) - Catch APEX alerts without failing test immediately",

      /* --- Action / Tab / Click Properties --- */
      "target": "string (Optional) - Locator key or selector to click",
      "frame": "string (Optional) - Iframe selector if target is inside an iframe",
      "menuItem": "string (Optional) - Sub-menu item locator to click after main target",
      "waitFor": "string (Optional) - Element to wait for after action",
      "timeout": "number (Optional) - Timeout for click action in ms",

      /* --- TableAction Properties --- */
      "status": "string (Optional) - Status text to locate in row (e.g. 'Open', 'In Progress')",
      "action": "string (Optional) - Semantic locator key for the eye/action icon",

      /* --- Assignment Properties --- */
      "triggerButton": "string (Optional) - Locator key for the Assign/Reassign button",
      "frame": "string (Optional) - Iframe selector for modal dialog",
      "userField": "string (Optional) - Select dropdown for user selection",
      "submitButton": "string (Optional) - Button inside iframe to confirm assignment",

      /* --- Review State Properties --- */
      "actions": ["string (Optional) - Allowed choices: ['approve', 'reject', 'sendBack']"],
      "buttons": {
        "approve": "locatorKey",
        "reject": "locatorKey",
        "sendBack": "locatorKey"
      },
      "commentInput": "string (Optional) - Locator key for comments textarea",
      "comments": {
        "approve": "string",
        "reject": "string",
        "sendBack": "string"
      },
      "transitions": {
        "approve": "NEXT_STATE_KEY",
        "reject": "REJECTED_STATE_KEY",
        "sendBack": "REWORK_STATE_KEY"
      },

      /* --- Assertions (Optional on ANY state) --- */
      "assertions": [
        {
          "type": "'noApexError' | 'visible' | 'notVisible' | 'text' | 'badge'",
          "locator": "string",
          "text": "string",
          "expectedBg": "string",
          "expectedColor": "string"
        }
      ]
    }
  }
}
```

### B. Business Data JSON Schema (`data/*.json`)
Read by: `workflows/steps/stepForm.js` and `utils/apexFormFiller.js`

```json
{
  "<formKeyName>": {
    "<Exact or Partial Label Text>": "Value to enter or select"
  }
}
```
- **Label Normalization Rule**: Asterisks (`*`), leading/trailing whitespace, and casing are stripped before matching. `"Incident Description"` automatically matches `<label for="P1_DESC">* Incident Description</label>`.

---

## 6. Complete JSON Example

Here is a realistic, working example of the JSON configuration for a new **Chemical Management** module:

### `config/workflows/chemical.workflow.json`
```json
{
  "name": "Chemical Inventory & Regulatory Approval Workflow",
  "module": "chemical",
  "version": "1.0.0",
  "start": "REGISTER_CHEMICAL",
  "maxAttempts": 20,
  "maxStateVisits": {
    "REGISTER_CHEMICAL": 2,
    "SUBMIT_CHEMICAL": 2,
    "APPROVE_CHEMICAL": 3
  },
  "states": {
    "REGISTER_CHEMICAL": {
      "type": "form",
      "page": "chemicalRegistration",
      "formKey": "chemicalRegistrationData",
      "testBoundaries": false,
      "next": "SUBMIT_CHEMICAL"
    },
    "SUBMIT_CHEMICAL": {
      "type": "submit",
      "button": "saveChemicalButton",
      "modalConfirm": true,
      "checkErrors": true,
      "next": "NAV_PENDING_APPROVALS",
      "assertions": [
        {
          "type": "noApexError"
        }
      ]
    },
    "NAV_PENDING_APPROVALS": {
      "type": "action",
      "page": "pendingApprovals",
      "forceNavigation": true,
      "target": "pendingChemicalsTab",
      "next": "SELECT_PENDING_CHEMICAL"
    },
    "SELECT_PENDING_CHEMICAL": {
      "type": "tableAction",
      "status": "Under Review",
      "action": "chemicalRowEyeIcon",
      "next": "APPROVE_CHEMICAL"
    },
    "APPROVE_CHEMICAL": {
      "type": "review",
      "strategy": "approve",
      "actions": ["approve", "reject", "sendBack"],
      "buttons": {
        "approve": "chemicalApproveButton",
        "reject": "chemicalRejectButton",
        "sendBack": "chemicalReworkButton"
      },
      "commentInput": "chemicalApprovalComment",
      "comments": {
        "approve": "MSDS sheet verified. Chemical approved for warehouse storage.",
        "reject": "Missing hazardous classification documents.",
        "sendBack": "Please provide secondary containment volume."
      },
      "transitions": {
        "approve": "CHEMICAL_ACTIVE",
        "reject": "CHEMICAL_REJECTED",
        "sendBack": "REGISTER_CHEMICAL"
      }
    },
    "CHEMICAL_ACTIVE": {
      "type": "complete",
      "page": "chemicalDashboard"
    },
    "CHEMICAL_REJECTED": {
      "type": "rejected",
      "page": "chemicalDashboard"
    }
  }
}
```

### `data/chemicalData.json`
```json
{
  "chemicalRegistrationData": {
    "Chemical Name": "Hydrochloric Acid 37% Technical Grade",
    "CAS Number": "7647-01-0",
    "Physical State": "Liquid",
    "Hazard Class": "Corrosive",
    "Storage Location": "Bay-4 Corrosive Cabinet",
    "Initial Quantity": "200"
  }
}
```

---

## 7. Form Filling Architecture

Form automation is implemented in `utils/apexFormFiller.js`.

### How Form Controls Are Identified & Handled:

1. **Text Inputs (`fillTextInputs`)**:
   - Locates elements matching: `input.apex-item-text:visible, input[type='text']:visible`.
   - Resolves the matching `<label for="...">` element.
   - Normalizes label text (stripping `*` and whitespace).
   - If found in `fieldData`, enters the configured string; if omitted, enters `DUMMY_LOREM_TEXT`.
   - Truncates automatically to respect `maxlength` attributes.

2. **Textareas (`fillTextAreas`)**:
   - Locates elements matching: `textarea.apex-item-textarea:visible, textarea:visible`.
   - If matched in `fieldData`, fills the exact string.
   - If unmatched and `testBoundaries: true`, runs boundary mutation checks (`belowMin`, `aboveMax`).

3. **Dropdowns (`selectDropdowns`)**:
   - Locates elements matching: `select:visible`.
   - Supports APEX cascading LOVs: if `optionCount <= 1`, waits up to 2000ms for AJAX population.
   - Selects a random non-placeholder option (`index = 1` through `optionCount - 1`).
   - Waits for network idle to allow cascading dependent fields to populate.

4. **Toggle Switches (`fillToggles`)**:
   - Locates elements matching: `input[type='checkbox']:visible`.
   - If already checked, leaves it untouched.
   - If unchecked, enables the toggle using `.check({ force: true })` with a fallback click.

5. **File Uploads (`uploadFiles`)**:
   - Locates elements matching: `input[type='file']`.
   - Directly assigns the file using Playwright's `fileInput.setInputFiles(this.staticData.filePath)` without triggering native OS dialogs.

6. **Scope Detection (`_resolveScope`)**:
   - Auto-detects if a visible modal dialog iframe is present (`div[role='dialog']:visible iframe, iframe:visible`) and automatically scopes to `frameLocator(...).locator("body")`.
   - Defaults to Oracle APEX Universal Theme's content container `#t_Body_content`, avoiding header search bars and navigation menus.

---

## 8. Workflow Engine Architecture

Implemented in `workflows/engine/workflowEngine.js`.

### Execution Cycle:
1. Reads `workflowConfig.start` to set `context.currentState`.
2. Verifies loop limits:
   - `context.attempts < maxAttempts`
   - `context.stateVisits[state] <= maxStateVisits[state]`
3. Evaluates declarative pre-assertions via `AssertionRunner`.
4. Handles page navigation via `NavigationHelper` (only if `state.page` is explicitly defined).
5. Dispatches execution via `StepHandlerRegistry.execute()`.
6. Evaluates declarative post-assertions via `AssertionRunner`.
7. Records step history, execution time, and status into `context.history`.
8. Checks for terminal states (`complete`, `rejected`, `closed`).
9. Transitions to `result.nextState`.

### Decision Strategy (`decisionStrategy.js`):
Determines which branch to take during review/decision states:
- `"approve"`: Always approves.
- `"reject"`: Always rejects.
- `"sendBack"`: Always requests rework.
- `"sendBackThenApprove"`: Reworks on pass 1, approves on subsequent passes.
- `"random"`: Deterministic pseudo-random choice powered by a Seeded PRNG (`SeededRandom`), with loop mitigation to prevent infinite cycles.

---

## 9. Handler/Action Architecture

| Handler Type | Implementation File | Dispatched In JSON | Parameters | Typical Elements Interacted With | Returns | Generic? |
|---|---|---|---|---|---|
| `form` | `workflows/steps/stepForm.js` | `"type": "form"` | `formKey`, `scope`, `testBoundaries` | All inputs, selects, textareas, toggles in region | `{ actionTaken: "FORM_FILLED", nextState }` | **Yes** |
| `submit` | `workflows/steps/stepSubmit.js` | `"type": "submit"` | `button`, `modalConfirm`, `checkErrors` | Submit buttons, confirmation OK dialogs | `{ actionTaken: "SUBMITTED", nextState }` | **Yes** |
| `action` / `click` / `tab` | `workflows/steps/stepAction.js` | `"type": "action"` | `target`, `frame`, `menuItem`, `modalConfirm` | Tabs (`t-Tabs-link`), buttons, menu options, iframes | `{ actionTaken: "ACTION_PERFORMED", nextState }` | **Yes** |
| `tableAction` / `selectRow` | `workflows/steps/stepTableAction.js` | `"type": "tableAction"` | `status`, `action` | Interactive grid rows, Actions column eye icons | `{ actionTaken: "ROW_SELECTED", nextState }` | **Yes** |
| `assignment` | `workflows/steps/stepAssignment.js` | `"type": "assignment"` | `triggerButton`, `frame`, `userField`, `submitButton` | Quick Action Assign button, modal iframe, user select | `{ actionTaken: "ASSIGNED", nextState }` | **Yes** |
| `review` | `workflows/steps/stepReview.js` | `"type": "review"` | `actions`, `buttons`, `commentInput`, `transitions` | Approve/Reject/SendBack buttons, comment textarea | `{ actionTaken: "<ACTION>", nextState }` | **Yes** |
| `closureInitiation` | `workflows/steps/stepClosure.js` | `"type": "closureInitiation"` | `button`, `next` | Initiate Closure buttons | `{ actionTaken: "CLOSURE_INITIATED", nextState }` | **Yes** |
| `closureReview` / `closure` | `workflows/steps/stepClosure.js` | `"type": "closureReview"` | `actions`, `buttons`, `transitions` | Authorize Closure modal, approve/reject buttons | `{ actionTaken: "APPROVE", nextState }` | **Yes** |
| `decision` | `workflows/engine/stepHandlerRegistry.js` | `"type": "decision"` | `conditionLocator`, `evaluate`, `transitions` | Element presence/visibility or custom evaluation | `{ actionTaken: "DECISION_YES/NO", nextState }` | **Yes** |
| `complete` | `workflows/engine/stepHandlerRegistry.js` | `"type": "complete"` | `page` | Landing page / dashboard icon | `{ actionTaken: "COMPLETED", isTerminal: true }` | **Yes** |
| `rejected` | `workflows/engine/stepHandlerRegistry.js` | `"type": "rejected"` | `page` | Dashboard / reject queue | `{ actionTaken: "REJECTED", isTerminal: true }` | **Yes** |
| `closed` | `workflows/engine/stepHandlerRegistry.js` | `"type": "closed"` | `page` | Final archive page | `{ actionTaken: "CLOSED", isTerminal: true }` | **Yes** |

---

## 10. State Management

Runtime state is maintained within an in-memory execution `context` object passed across all handlers:

```javascript
const context = {
  workflowName,
  currentState: workflowConfig.start,
  currentPage: null,
  attempts: 0,
  stateVisits: {},
  history: [],
  testData,
  options,
  pageRegistry: options.pageRegistry || null,
  decisionStrategy,
  runtimeData: {}, // Dynamic storage for runtime values (e.g. generated record IDs)
};
```

- **Static Data (`context.testData`)**: Loaded from `data/*.json` files.
- **Runtime Data (`context.runtimeData`)**: Created on the fly. If an earlier step extracts an incident number or token, it assigns `context.runtimeData.incidentId = id`, making it accessible to subsequent steps.
- **History Tracking (`context.history`)**: Every step appends its state name, action taken, duration, and output metadata.

---

## 11. Locator Strategy

Element resolution follows a strict hierarchy designed to prevent fragile selectors:

1. **Page Registry Lookup** (Preferred):
   - Named keys resolve via `pageRegistry.getLocator(container, key)`.
2. **Pure XPath with Union (`|`)**:
   - Robust against theme variations:
     `//button[contains(.,'Create')] | //span[normalize-space()='Create']/parent::button | //*[contains(@class,'t-Button') and contains(.,'Create')]`
3. **Container-Relative Queries (`.//`)**:
   - Table rows and modal containers resolve child elements using `selectedRow.locator(".//td[last()]//a")` to avoid document-root pollution.
4. **Autonomous Label Association**:
   - Form inputs resolve via `<label for="fieldId">`.
5. **No Mixed Selectors**:
   - CSS commas (`,`) and XPath slashes (`//`) are never combined into a single string to avoid Playwright parsing errors.

---

## 12. Generic vs Module-Specific Code

### A. Generic Framework Code (DO NOT TOUCH)
- `workflows/engine/workflowEngine.js`
- `workflows/engine/stepHandlerRegistry.js`
- `workflows/engine/decisionStrategy.js`
- `workflows/engine/assertionRunner.js`
- `workflows/navigation/navigationHelper.js`
- `workflows/steps/stepAction.js`
- `workflows/steps/stepAssignment.js`
- `workflows/steps/stepClosure.js`
- `workflows/steps/stepForm.js`
- `workflows/steps/stepReview.js`
- `workflows/steps/stepSubmit.js`
- `workflows/steps/stepTableAction.js`
- `utils/apexFormFiller.js`
- `pages/pageRegistry.js`

### B. Module Configuration (CREATE PER NEW MODULE)
- `config/workflows/<newModule>.workflow.json`
- `data/<newModule>Data.json`

### C. Module Page Objects (CREATE PER NEW MODULE)
- `pages/<newModule>Page.js`

### D. Test Specs (CREATE PER NEW MODULE)
- `tests/workflows/<newModule>Workflow.spec.js`

---

## 13. How to Add a NEW Module (Step-by-Step)

Example: Automating a new **Safety Audit** module.

### Step 1: Create Business Data JSON
File: `data/safetyAuditData.json`
```json
{
  "auditCreationData": {
    "Audit Title": "Quarterly Chemical Warehouse Safety Audit",
    "Audit Type": "Internal Compliance",
    "Auditor Name": "John Smith",
    "Department": "Operations",
    "Scope Description": "Review of hazardous chemical storage and fire suppression systems."
  }
}
```

### Step 2: Create Page Definitions & Locators
File: `pages/safetyAuditPage.js`
```javascript
const { defaultRegistry } = require("./pageRegistry");

function registerSafetyAuditPages(registry = defaultRegistry) {
  registry.registerPage("safetyAuditDashboard", {
    iconLocator: "//span[contains(@class,'fa-clipboard')]",
    headerLocator: "//h1[contains(.,'Audit Dashboard')]",
    expectedTitle: "Audit Dashboard"
  });

  registry.registerPage("safetyAuditCreate", {
    triggerLocator: "//button[contains(.,'New Audit')]",
    headerLocator: "//h1[contains(.,'Create Audit')]",
    expectedTitle: "Create Audit"
  });

  registry.registerLocators({
    saveAuditButton: "//button[contains(.,'Save') or normalize-space()='Create']",
    auditTableEye: ".//td[last()]//a | .//span[contains(@class,'fa-eye')]/parent::a",
    approveAuditButton: "//button[contains(.,'Approve')]"
  });
}

registerSafetyAuditPages(defaultRegistry);
module.exports = { registerSafetyAuditPages };
```

### Step 3: Create Workflow JSON
File: `config/workflows/safetyAudit.workflow.json`
```json
{
  "name": "Safety Audit Operational Workflow",
  "module": "safetyAudit",
  "start": "CREATE_AUDIT",
  "maxAttempts": 15,
  "states": {
    "CREATE_AUDIT": {
      "type": "form",
      "page": "safetyAuditCreate",
      "formKey": "auditCreationData",
      "testBoundaries": false,
      "next": "SUBMIT_AUDIT"
    },
    "SUBMIT_AUDIT": {
      "type": "submit",
      "button": "saveAuditButton",
      "modalConfirm": true,
      "checkErrors": true,
      "next": "AUDIT_COMPLETE"
    },
    "AUDIT_COMPLETE": {
      "type": "complete",
      "page": "safetyAuditDashboard"
    }
  }
}
```

### Step 4: Create Playwright Spec
File: `tests/workflows/safetyAuditWorkflow.spec.js`
```javascript
const { test, expect } = require("@playwright/test");
const { executeWorkflow } = require("../../workflows/engine/workflowEngine");
const { defaultRegistry } = require("../../pages/pageRegistry");
require("../../pages/safetyAuditPage");

const auditWorkflow = require("../../config/workflows/safetyAudit.workflow.json");
const auditData = require("../../data/safetyAuditData.json");

test.describe("Safety Audit - Operational Workflow", () => {
  test("TC_AUDIT_001 - Safety Audit Creation & Submission", async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const targetUrl = process.env.AUDIT_URL || "https://your-apex-host/ords/r/app/audit/dashboard";
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    const result = await executeWorkflow(page, auditWorkflow, auditData, {
      strategy: "approve",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");
  });
});
```

### Step 5: Execute Test
```bash
npx playwright test tests/workflows/safetyAuditWorkflow.spec.js --headed --project=Desktop --reporter=list
```

---

## 14. Minimum Required Input for a New Module

### Required:
1. **Module identifier (`module`)**: Unique string matching your module name.
2. **Start state (`start`)**: Key of the first state to execute.
3. **States dictionary (`states`)**: Contains state definitions and transitions.
4. **Data JSON (`data/<module>Data.json`)**: Key-value map matching visible form field labels.
5. **Spec File (`tests/workflows/<module>Workflow.spec.js`)**: Instantiates `executeWorkflow()`.

### Optional:
- `maxAttempts`: Defaults to 10.
- `strategy`: Defaults to `"approve"`.
- `modalConfirm`: Defaults to `true`.
- `checkErrors`: Defaults to `true`.
- `assertions`: Declarative pre/post-assertions.

### Module-Specific:
- Iframe selectors if modal windows render inside an `<iframe>`.
- Status text filters for table rows (`"Open"`, `"Under Review"`, `"In Progress"`).

---

## 15. Existing Module End-to-End Example (Incident Management)

Here is the exact trace of the Incident Management Module:

```text
[SPEC] tests/workflows/incidentWorkflow.spec.js
  ↓
[LOGIN] Authenticates alice@abc.com / Oracle@12345 -> Clicks "Go To Module"
  ↓
[ENGINE START] executeWorkflow() with config/workflows/incident.workflow.json
  ↓
[STEP 1] STATE: "REPORT_INCIDENT"
  • Handler: stepForm.js
  • Action: ApexFormFiller fills 9 fields from incidentReportingData
  ↓
[STEP 2] STATE: "SUBMIT_INCIDENT"
  • Handler: stepSubmit.js
  • Action: Clicks incidentCreateButton -> confirms APEX "OK" dialog
  ↓
[STEP 3] STATE: "SELECT_OPEN_INCIDENT"
  • Handler: stepTableAction.js
  • Action: Navigates to incidentDashboard -> finds row with "Open" -> clicks Eye icon
  ↓
[STEP 4] STATE: "ASSIGN_INCIDENT"
  • Handler: stepAssignment.js
  • Action: Clicks Reassign -> switches to modal iframe -> picks random user -> clicks Assign
  ↓
[STEP 5] STATE: "START_INVESTIGATION"
  • Handler: stepAction.js
  • Action: Clicks investigationTab
  ↓
[STEP 6] STATE: "FILL_INVESTIGATION_SCOPE"
  • Handler: stepForm.js
  • Action: ApexFormFiller fills * Investigation Scope textarea
  ↓
[STEP 7] STATE: "CLICK_START_INVESTIGATION"
  • Handler: stepAction.js
  • Action: Clicks startInvestigationButton
  ↓
[STEP 8] STATE: "NAV_INVESTIGATION_TAB"
  • Handler: stepAction.js
  • Action: Re-clicks investigationTab after page reload
  ↓
[STEP 9] STATE: "CLICK_GO_TO_INVESTIGATION"
  • Handler: stepAction.js
  • Action: Clicks goToInvestigationButton (#B3484085389661880442)
  ↓
[STEP 10] STATE: "NAV_EVIDENCE_TAB"
  • Handler: stepAction.js
  • Action: Clicks evidenceTab
  ↓
[STEP 11] STATE: "VERIFY_COC_ACTION"
  • Handler: stepAction.js
  • Action: Clicks row 3-dots action button -> selects Verify CoC menu option
  ↓
[STEP 12] STATE: "SIGN_AND_LOCK_RECORD"
  • Handler: stepAction.js
  • Action: Clicks Sign & Lock Record button in modal dialog
  ↓
[STEP 13] STATE: "NAV_INTERVIEWS_TAB"
  • Handler: stepAction.js
  • Action: Clicks interviewsTab
  ↓
[STEP 14] STATE: "CLICK_ADD_INTERVIEW"
  • Handler: stepAction.js
  • Action: Clicks addInterviewButton
  ↓
[STEP 15] STATE: "FILL_INTERVIEW_FORM"
  • Handler: stepForm.js
  • Action: ApexFormFiller fills interview form fields
  ↓
[STEP 16] STATE: "SAVE_INTERVIEW"
  • Handler: stepAction.js
  • Action: Clicks saveInterviewButton
  ↓
[STEP 17] STATE: "SUBMIT_FOR_REVIEW"
  • Handler: stepAction.js
  • Action: Clicks submitForReviewButton
  ↓
[STEP 18] STATE: "NAV_PENDING_APPROVALS"
  • Handler: stepAction.js
  • Action: Navigates to pendingApprovals -> clicks pendingInvestigationsTab
  ↓
[STEP 19] STATE: "SELECT_PENDING_INVESTIGATION"
  • Handler: stepTableAction.js
  • Action: Finds row with status "In Progress" -> clicks Eye icon
  ↓
[STEP 20] STATE: "FILL_INVESTIGATION_APPROVAL"
  • Handler: stepForm.js
  • Action: ApexFormFiller fills approval comments
  ↓
[STEP 21] STATE: "APPROVE_INVESTIGATION"
  • Handler: stepAction.js
  • Action: Clicks approveInvestigationButton inside approval modal
  ↓
[STEP 22] STATE: "NAV_DASHBOARD_FOR_CLOSURE"
  • Handler: stepTableAction.js
  • Action: Returns to dashboard -> clicks Eye icon
  ↓
[STEP 23-29] Closure sequence -> TERMINAL
```

---

## 16. Dependency Map

```text
tests/workflows/<module>Workflow.spec.js
 ├── imports: config/workflows/<module>.workflow.json
 ├── imports: data/<module>Data.json
 ├── imports: pages/<module>Page.js
 │     └── registers into: pages/pageRegistry.js
 └── calls: workflows/engine/workflowEngine.js
       │
       ├── instantiates: workflows/engine/decisionStrategy.js
       │     └── uses: SeededRandom PRNG
       │
       ├── calls: workflows/navigation/navigationHelper.js
       │     └── resolves via: pages/pageRegistry.js
       │
       ├── calls: workflows/engine/assertionRunner.js
       │     ├── calls: utils/badgeColors.js (reads utils/badgeColor.json)
       │     └── calls: utils/apexFormFiller.js (assertNoErrorAlert)
       │
       └── calls: workflows/engine/stepHandlerRegistry.js
             ├── "form"               -> workflows/steps/stepForm.js
             │                             └── calls: utils/apexFormFiller.js
             ├── "submit"             -> workflows/steps/stepSubmit.js
             │                             └── calls: utils/apexFormFiller.js
             ├── "review"             -> workflows/steps/stepReview.js
             │                             └── calls: workflows/engine/decisionStrategy.js
             ├── "assignment"         -> workflows/steps/stepAssignment.js
             ├── "action"|"click"|"tab"-> workflows/steps/stepAction.js
             ├── "tableAction"        -> workflows/steps/stepTableAction.js
             ├── "closureInitiation"  -> workflows/steps/stepClosure.js
             ├── "closureReview"      -> workflows/steps/stepClosure.js
             └── "complete"|"rejected"-> inline terminal resolution
```

---

## 17. Naming Conventions

| Entity | Pattern | Example |
|---|---|---|
| **Workflow Definition** | `config/workflows/<moduleName>.workflow.json` | `config/workflows/incident.workflow.json` |
| **Test Data File** | `data/<moduleName>Data.json` | `data/incidentData.json` |
| **Page Definition** | `pages/<moduleName>Page.js` | `pages/incidentPage.js` |
| **Registration Function** | `register<ModuleName>Pages(registry)` | `registerIncidentPages(defaultRegistry)` |
| **Test Spec File** | `tests/workflows/<moduleName>Workflow.spec.js` | `tests/workflows/incidentWorkflow.spec.js` |
| **Workflow State Keys** | `UPPERCASE_SNAKE_CASE` | `REPORT_INCIDENT`, `START_INVESTIGATION` |
| **Semantic Locator Keys** | `camelCase` ending in role | `incidentCreateButton`, `investigationTab` |
| **Form Keys** | `camelCase` ending in `Data` | `incidentReportingData`, `investigationData` |

---

## 18. Files I Should Not Touch

### DO NOT MODIFY UNLESS NECESSARY:
1. `workflows/engine/workflowEngine.js`: Core Finite State Machine execution loop, iteration guards, and report attachments.
2. `workflows/engine/stepHandlerRegistry.js`: Dispatches step types to handlers.
3. `utils/apexFormFiller.js`: Handles generic APEX label discovery, cascading dropdowns, file uploads, and error alerts.
4. `pages/pageRegistry.js`: Houses the central dictionary mapping semantic names to locators.
5. `workflows/steps/*.js`: Reusable generic step handlers (`stepAction.js`, `stepAssignment.js`, `stepForm.js`, `stepReview.js`, `stepSubmit.js`, `stepTableAction.js`, `stepClosure.js`).

---

## 19. Common Configuration Mistakes

| Mistake | What Happens | How to Avoid |
|---|---|---|
| **Mixing CSS & XPath** (`button:has-text('X'), //button[contains(.,'X')]`) | Playwright throws: `Unexpected token "/" while parsing selector`. | Keep selector pure XPath (joined with ` \| `) or pure Playwright CSS (joined with `,`). |
| **Adding `"page"` on Sub-tabs or In-page Steps** | Engine triggers navigation, which reloads the page and resets the active tab to tab #1. | Only define `"page"` when actually switching pages/URLs. Omit `"page"` for in-tab actions. |
| **Omitting Mandatory Form Fields in Data JSON** | APEX client-side validation prevents submission; button click does nothing or page resets. | Ensure every required field (red asterisk `*`) has a corresponding entry in `data/*.json`. |
| **Using Absolute XPath in Table Row Actions** | XPath starting with `//tbody` evaluates from document root, clicking the first row on page rather than target row. | Use container-relative `.//` inside row locators (e.g. `selectedRow.locator(".//td[last()]//a")`). |
| **Using `networkidle` Without Timeout** | Long-running APEX background polls or WebSockets stall execution for up to 30s per step, causing test timeout. | Use `waitForLoadState("domcontentloaded")` or `waitForLoadState("networkidle", { timeout: 3000 })`. |
| **Missing `transitions` on Review States** | Engine throws `StepReview: No transition defined for action "<action>"`. | Ensure `"transitions"` in review states defines mapping for every action in `"actions"`. |

---

## 20. One-Page Quick Reference

### Developer Checklist: Automating Any New Module

```text
[ ] 1. DATA FILE: data/<module>Data.json
    - Create JSON key-value pairs matching the exact visible label text on the form.
    - Omit asterisks and extra spaces (handled automatically).

[ ] 2. PAGE OBJECT: pages/<module>Page.js
    - Call registry.registerPage("<pageKey>", { iconLocator, headerLocator, expectedTitle })
    - Call registry.registerLocators({ <buttonKey>: "<pure-xpath-or-css>" })
    - Register into defaultRegistry: register<Module>Pages(defaultRegistry)

[ ] 3. WORKFLOW: config/workflows/<module>.workflow.json
    - Set "start": "FIRST_STATE"
    - Define states with "type": "form" | "submit" | "tableAction" | "action" | "review" | "complete"
    - Link each step using "next": "NEXT_STATE" or "transitions": { "approve": "...", "reject": "..." }

[ ] 4. TEST SPEC: tests/workflows/<module>Workflow.spec.js
    - Import PageRegistry, require("../../pages/<module>Page")
    - Import workflow JSON and data JSON
    - Call executeWorkflow(page, workflowConfig, testData, { strategy: "approve", pageRegistry: defaultRegistry })

[ ] 5. RUN & VERIFY:
    npx playwright test tests/workflows/<module>Workflow.spec.js --headed --project=Desktop --reporter=list
```
