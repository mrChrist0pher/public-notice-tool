# Process maps

Read left to right. Bold outlines mark **P&DS GIS** work. The maps show operational movement, not automatic code integrations.

## Documented manual process

```mermaid
flowchart LR
  P[Planner: prepare case request and notice letter] -->|Email| G["P&DS GIS: prepare vicinity map"]
  G -->|Email VM| R{Planner: subject location correct?}
  R -->|Corrections by email| G
  R -->|Approval by email| S["P&DS GIS: select owner records"]
  S --> F["P&DS GIS: save raw feature class and DBF"]
  F --> C["P&DS GIS: clean and format ML spreadsheet"]
  C --> A[Operator: assemble PN2 and ML]
  A -->|Email package and spreadsheet| V[Mailing vendor]
  V -->|Questions or corrections| A
  V --> M[Mail fulfillment]
  A --> E[Operator: assemble PN3 and upload to EnerGov]
  E --> X[Operator: update tracking and complete workflow step]
  classDef gis stroke:#176b78,stroke-width:4px,fill:#e8f3f4,color:#152b33;
  class G,S,F,C gis;
```

Operator ownership for the last handoffs requires team confirmation. Fulfillment is performed by the vendor, not the GIS code. The historical board-secretary intake variation is omitted from the main path until clarified.

## Current Pro toolbox

```mermaid
flowchart LR
  O[Open Pro template] --> T1[1. Prepare Notice Map: case number]
  T1 --> R[Check subject, layout and scan QR]
  R --> T2[2. Export Notice Map: VM PDF and case APRX]
  T2 -->|Email map| P{Planner approves location?}
  P -->|Correction| T1
  P -->|Approved; reopen case APRX| T3[3. Select Recipients: 300 / 600 / Adjacent / Custom]
  T3 --> U[Adjust final selection in map view]
  U --> T4[4. Export Mailing List: raw FC/DBF and cleaned XLSX/CSV]
  T4 --> H[Manual vendor handoff, records and EnerGov close-out]
```

## Proposed planner self-service

```mermaid
flowchart LR
  W[Planner opens public notice web app] --> Q[Search case and confirm subject location]
  Q --> VM[Generate location-map PDF with QR]
  VM --> B[Choose 300 / 600 / Adjacent / Custom]
  B --> S[Run and adjust recipient selection]
  S --> ML[Download cleaned mailing CSV]
  ML --> V[Planner sends package to mailing vendor]
  V --> E[Complete records upload and close out in EnerGov]
```

The last path is the intended handoff model; organizational ownership still requires agreement. The web prototype implements search/map/selection/list generation. Vendor email, official records storage and EnerGov close-out are not wired into the app. P&DS GIS maintains the tool and source integrations.
