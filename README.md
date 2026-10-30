# FieldPulse — Final Agriculture Intelligence Website

A standalone HTML, CSS and JavaScript website for smart-irrigation learning, farm planning, field observations and transparent decision-support helpers.

## Files in this folder

- `index.html` — all workspace pages and UI structure.
- `style.css` — themes, responsive layout, visual design and animations.
- `script.js` — navigation, simulator, helpers, calculators, records, search and guided tour.
- `fieldpulse-user-guide.pdf` — illustrated beginner-friendly website guide.
- `project-report.pdf` — the supplied FieldPulse project concept report.

## Run the website

1. Extract all files into one folder. Do not rename the CSS, JavaScript or PDF files.
2. Open `index.html` in a current Chrome, Edge, Firefox or Safari browser.
3. For deployment, upload all five files to the same website root. The entry page must be named `index.html`.

No build process or package installation is required. Google Fonts are optional; the CSS has system-font fallbacks.

## Workspaces and working functions

- **Overview:** dashboard shortcuts and project limitations.
- **Irrigation Lab:** moisture/temperature simulator, crop demo thresholds, rain/tank/sensor-validity interlocks, automatic/manual request states, event log and CSV export.
- **AI Studio:** Farm Copilot, Crop Symptom Scout, Sensor & Pump Detective, Crop Rotation Planner, Farm Task Generator, multilingual phrase helper (English/Hindi/Punjabi), Field Resilience Playbook and Harvest/Post-harvest Planner.
- **Farm Tools:** 15 calculators for water volume, pump runtime/energy, sensor calibration, zone planning, root-zone buffer, rainwater harvesting, seed quantity, fertilizer product conversion, hydraulic power, label-based spray arithmetic, scouting incidence, payback scenario, daily water balance, irrigation uniformity and storage volume.
- **Field Records:** local notes, search, type filter, delete, CSV export and JSON export.
- **Reports:** baseline/prototype comparison with preview, TXT download, CSV download and print-to-PDF option.
- **Learn:** system architecture, simple feature explanations, staged build notes and safety considerations.
- **Team:** Phoenix Coders project team information.

## Important limitations

This is an educational front-end prototype. The AI Studio tools are local, explainable rules, checklists and phrase generators; they are not connected to a trained AI model or an agronomist. The website does not connect to live weather, cloud storage, farm sensors, ESP32/Arduino hardware or physical pumps. Field Records are stored in the current browser's local storage and do not sync to other devices. Calculator values are user-entered assumptions, not agronomic recommendations. The simulator and reports do not prove water savings or crop outcomes.

Before real deployment, use measured and locally appropriate crop/soil information, validate sensors and placement, and have all electrical and pump hardware independently reviewed. A real installation needs pump-rated isolated switching, dry-run and overcurrent protection, safe default-off behaviour, weatherproofing and supervised testing. Never rely on a browser page as the safety controller for a pump.

## Final interaction checks

The delivered code was exercised in Chromium at desktop, tablet and mobile viewport sizes. The tested flows included all eight page routes, light/dark switching, guided-tour steps, search navigation, all eight AI-style forms, all 15 calculators, irrigation interlocks, event-log export, field-record save/filter/delete/export and report generation/download. The check found no runtime JavaScript errors, and no horizontal overflow at the tested widths.
