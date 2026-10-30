(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const storage = {
    get(key, fallback = null) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Private browsing may block storage. */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* Ignore unavailable storage. */ } }
  };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const number = id => Number($( `#${id}` )?.value);
  const value = id => $( `#${id}` )?.value ?? '';
  const fmt = (n, digits = 1) => Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  const fmtLitres = n => `${fmt(n, 0)} L`;
  const finitePositive = (...values) => values.every(v => Number.isFinite(v) && v > 0);
  const root = document.documentElement;

  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function setResult(id, eyebrow, headline, description, tone = '') {
    const node = $(`#${id}`);
    if (!node) return;
    node.classList.remove('warning', 'danger', 'success');
    if (tone) node.classList.add(tone);
    const label = $('small', node);
    const strong = $('strong', node);
    const paragraph = $('p', node);
    if (label) label.textContent = eyebrow;
    if (strong) strong.textContent = headline;
    if (paragraph) paragraph.textContent = description;
  }
  function setOutput(id, label, html) {
    const node = $(`#${id}`);
    if (!node) return;
    node.innerHTML = `<span class="output-label">${escapeHTML(label)}</span><div class="result-content">${html}</div>`;
  }

  // ---------------------------------------------------------------------------
  // App navigation: each navbar item opens a dedicated workspace view.
  // ---------------------------------------------------------------------------
  const pages = new Set($$('.page[data-view]').map(page => page.dataset.view));
  function currentRoute() {
    const match = location.hash.match(/^#\/(.+)$/);
    return match && pages.has(match[1]) ? match[1] : 'dashboard';
  }
  function showPage(page, updateHash = true) {
    if (!pages.has(page)) page = 'dashboard';
    $$('.page[data-view]').forEach(section => {
      const active = section.dataset.view === page;
      section.classList.toggle('active', active);
      section.hidden = !active;
      if (active) section.setAttribute('aria-hidden', 'false');
      else section.setAttribute('aria-hidden', 'true');
    });
    $$('.nav-link').forEach(link => {
      const active = link.dataset.page === page;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('#mainNav').classList.remove('open');
    $('#mobileMenu').setAttribute('aria-expanded', 'false');
    if (updateHash && location.hash !== `#/${page}`) history.pushState({ page }, '', `#/${page}`);
    window.scrollTo({ top: 0, behavior: root.dataset.reduceMotion === 'true' ? 'auto' : 'smooth' });
    $('#appMain').focus({ preventScroll: true });
    observeReveals(document.querySelector(`.page[data-view="${page}"]`));
    updateProgress();
  }
  $$('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
  $$('[data-go]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.go)));
  addEventListener('hashchange', () => showPage(currentRoute(), false));
  addEventListener('popstate', () => showPage(currentRoute(), false));
  $('#mobileMenu').addEventListener('click', () => {
    const open = $('#mainNav').classList.toggle('open');
    $('#mobileMenu').setAttribute('aria-expanded', String(open));
  });
  // Initial page activation is performed after the reveal observer is initialised below.

  // ---------------------------------------------------------------------------
  // Colour mode, scroll progress and gentle reveal animation.
  // ---------------------------------------------------------------------------
  function applyTheme(theme, announce = false) {
    const selected = theme === 'light' ? 'light' : 'dark';
    root.dataset.theme = selected;
    storage.set('fieldpulse-theme', selected);
    $('#themeToggle').textContent = selected === 'light' ? '☾' : '☼';
    $('#themeToggle').setAttribute('aria-label', `Switch to ${selected === 'light' ? 'dark' : 'light'} mode`);
    if (announce) toast(`${selected === 'light' ? 'Light' : 'Dark'} mode enabled`);
  }
  applyTheme(storage.get('fieldpulse-theme', 'dark'));
  $('#themeToggle').addEventListener('click', () => applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true));
  $('#year').textContent = new Date().getFullYear();
  const todayLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('#recordDate').value = todayLocal;
  $('#scoutDate').value = todayLocal;

  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 }) : null;
  function observeReveals(scope = document) {
    $$('.reveal', scope).forEach(element => {
      if (revealObserver) revealObserver.observe(element);
      else element.classList.add('visible');
    });
  }
  observeReveals();
  function updateProgress() {
    const page = $('.page.active');
    if (!page) return;
    const max = page.scrollHeight - innerHeight;
    $('#topProgress').style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
    $('#backTop').classList.toggle('visible', scrollY > 480);
  }
  showPage(currentRoute(), false);
  addEventListener('scroll', updateProgress, { passive: true });
  $('#backTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // ---------------------------------------------------------------------------
  // Irrigation simulator: illustrative rule-based logic, never a real actuator.
  // ---------------------------------------------------------------------------
  const moisture = $('#moistureRange');
  const temperature = $('#temperatureRange');
  let manualCommand = null;
  let pumpWasOn = false;
  function logEvent(message, tone = 'normal') {
    const list = $('#eventLog');
    const item = document.createElement('li');
    const dot = document.createElement('i');
    if (tone === 'warn') dot.style.background = 'var(--gold)';
    if (tone === 'info') dot.style.background = 'var(--sky)';
    const text = document.createElement('span');
    text.textContent = message;
    const time = document.createElement('time');
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    item.append(dot, text, time);
    list.prepend(item);
    while (list.children.length > 12) list.lastElementChild.remove();
  }
  function calculateIrrigation(log = true) {
    const m = Number(moisture.value);
    const t = Number(temperature.value);
    const target = Number($('#cropSelect').value);
    const rain = $('#rainToggle').checked;
    const tank = $('#tankToggle').checked;
    const valid = $('#sensorValidToggle').checked;
    const manual = $('#modeSelect').value === 'manual';
    $('#moistureValue').textContent = m;
    $('#temperatureValue').textContent = t;
    $('#gaugeValue').textContent = m;
    $('#targetValue').textContent = `${target}%`;
    $('#resultTemp').textContent = `${t}°C`;
    $('#heroMoisture').innerHTML = `${m}<span>%</span>`;
    $('#heroPump').textContent = pumpWasOn ? 'ON REQUEST' : 'STANDBY';
    $('#heroMode').textContent = manual ? 'MANUAL REQUEST' : 'AUTO MODE';

    const degree = Math.round(m * 3.6);
    const gaugeTone = m < target - 3 ? 'var(--gold)' : m > target + 3 ? 'var(--leaf)' : 'var(--sky)';
    $('#moistureGauge').style.background = `conic-gradient(${gaugeTone} 0deg ${degree}deg, var(--surface-3) ${degree}deg 360deg)`;
    let on = false, title = '', message = '', status = 'MONITORING', icon = '◉', tone = 'normal';

    if (manual) {
      $('#manualControls').classList.remove('hidden');
      if (manualCommand === null) {
        title = 'Manual request ready'; message = 'Choose a simulated ON or OFF request. The rain and water-availability interlocks remain active.'; status = 'MANUAL READY'; icon = '☝';
      } else if (manualCommand && !valid) {
        title = 'Manual request blocked'; message = 'The sensor-validity interlock is false. Verify the input before proceeding.'; status = 'INPUT BLOCK'; icon = '⚠'; tone = 'warn';
      } else if (manualCommand && !tank) {
        title = 'Request blocked: water unavailable'; message = 'Water is unavailable. The demo blocks the request to represent dry-run protection.'; status = 'SAFETY BLOCK'; icon = '⚠'; tone = 'warn';
      } else if (manualCommand && rain) {
        title = 'Request paused: rain detected'; message = 'Rain is active. This demo holds the request under its configured rain policy.'; status = 'RAIN HOLD'; icon = '☂'; tone = 'warn';
      } else {
        on = Boolean(manualCommand); title = on ? 'Manual ON request accepted' : 'Manual OFF request'; message = on ? 'The simulated request is ON. A real installation needs independent protections and supervised control.' : 'The simulated pump request is OFF.'; status = 'MANUAL MODE'; icon = on ? 'ϟ' : '⏻';
      }
    } else {
      $('#manualControls').classList.add('hidden');
      if (!valid) { title = 'Sensor input is not valid'; message = 'Automatic irrigation is blocked. Inspect the probe, wiring, calibration and timestamp before using the reading.'; status = 'INPUT BLOCK'; icon = '⚠'; tone = 'warn'; }
      else if (!tank) { title = 'Water unavailable'; message = 'The tank interlock is active. The demo blocks irrigation to represent dry-run protection.'; status = 'SAFETY BLOCK'; icon = '⚠'; tone = 'warn'; }
      else if (rain) { title = 'Irrigation paused'; message = 'Rain is marked active, so the automatic demo rule holds watering even when moisture is below its example threshold.'; status = 'RAIN HOLD'; icon = '☂'; tone = 'warn'; }
      else if (m < target - 3) { on = true; title = 'Irrigation request indicated'; message = `The moisture index is below the ${target}% illustrative threshold. Verify root-zone conditions and local crop guidance before any real watering.`; status = 'PUMP REQUEST'; icon = 'ϟ'; }
      else if (m <= target + 3) { title = 'Near the demo target'; message = 'The reading is inside the ±3 point demo band. Recheck later rather than rapidly switching at one boundary.'; status = 'MONITORING'; icon = '◉'; }
      else { title = 'Moisture index above target'; message = 'The reading is above the demo stop band. The simple rule does not request irrigation.'; status = 'NO REQUEST'; icon = '✓'; }
    }

    $('#pumpState').textContent = on ? 'ON REQUEST / DEMO' : 'OFF / STANDBY';
    $('#heroPump').textContent = on ? 'ON REQUEST' : 'STANDBY';
    $('#decisionStatus').textContent = status;
    $('#decisionTitle').textContent = title;
    $('#decisionText').textContent = message;
    $('#decisionIcon').textContent = icon;
    $('#moistureLabel').textContent = m < target - 3 ? 'Below demo band' : m > target + 3 ? 'Above demo band' : 'Inside demo band';
    $('#decisionStatus').style.color = tone === 'warn' ? 'var(--gold)' : 'var(--leaf)';
    if (log) {
      if (on !== pumpWasOn) logEvent(on ? 'Pump ON requested by demo rules' : 'Pump request cleared / standby', on ? 'normal' : 'info');
      logEvent(`${m}% moisture index · ${t}°C · ${status}`, tone);
    }
    pumpWasOn = on;
  }
  [moisture, temperature, $('#cropSelect'), $('#modeSelect'), $('#rainToggle'), $('#tankToggle'), $('#sensorValidToggle')].forEach(control => {
    control.addEventListener('input', () => { if (control.id === 'modeSelect') manualCommand = null; calculateIrrigation(false); });
  });
  $('#runLogic').addEventListener('click', () => { calculateIrrigation(true); toast('Decision recalculated from the demo inputs'); });
  $('#manualOn').addEventListener('click', () => { manualCommand = true; calculateIrrigation(true); });
  $('#manualOff').addEventListener('click', () => { manualCommand = false; calculateIrrigation(true); });
  $('#clearLog').addEventListener('click', () => { $('#eventLog').replaceChildren(); logEvent('Event log cleared', 'info'); toast('Event log cleared'); });
  $('#exportLog').addEventListener('click', () => {
    const rows = [['time', 'event'], ...$$('#eventLog li').map(li => [ $('time', li)?.textContent ?? '', $('span', li)?.textContent ?? '' ])];
    if (rows.length < 2) return toast('There are no events to export');
    downloadText('fieldpulse-event-log.csv', rows.map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
  });
  calculateIrrigation(false);

  // ---------------------------------------------------------------------------
  // AI Studio: local deterministic helpers and content generators.
  // ---------------------------------------------------------------------------
  $$('[data-ai-tab]').forEach(tab => tab.addEventListener('click', () => {
    $$('[data-ai-tab]').forEach(item => item.classList.toggle('active', item === tab));
    $$('[data-ai-view]').forEach(view => {
      const active = view.dataset.aiView === tab.dataset.aiTab;
      view.classList.toggle('active', active);
      view.hidden = !active;
    });
  }));

  $('#copilotForm').addEventListener('submit', event => {
    event.preventDefault();
    const crop = value('copilotCrop'), stage = value('copilotStage'), m = number('copilotMoisture'), temp = number('copilotTemp');
    const rain = value('copilotRain'), water = value('copilotWater'), notes = value('copilotNotes').trim();
    if (![m, temp].every(Number.isFinite) || m < 0 || m > 100 || temp < -10 || temp > 60) return toast('Check the moisture index and temperature values');
    const priorities = [];
    let status = 'FIELD REVIEW';
    if (water === 'no') { status = 'WATER LIMITATION'; priorities.push(['First priority', 'Water is marked unavailable. Do not plan an irrigation run until supply and the level measurement are checked.']); }
    else if (water === 'low') { status = 'CONSERVE & VERIFY'; priorities.push(['First priority', 'Water is marked limited. Review the measured root-zone condition, available storage and locally appropriate allocation before scheduling.']); }
    if (rain === 'recent' || rain === 'expected') { priorities.push(['Rain check', 'Compare rainfall with a soil check at the active root depth. A rainfall report does not prove that the root zone has received enough water.']); }
    else if (rain === 'unknown') { priorities.push(['Weather information missing', 'Check a trusted local forecast and inspect the field. This helper does not retrieve live weather.']); }
    if (m <= 15) { priorities.push(['Verify the low index', 'A very low entered index deserves a repeat reading and a manual soil check. Confirm probe contact, calibration and units before deciding.']); }
    else if (m >= 85) { priorities.push(['Check drainage and probe placement', 'A high entered index can indicate wet soil, a local wet patch or a sensor-placement issue. Inspect the root zone and drainage before adding water.']); }
    else { priorities.push(['Root-zone check', `Compare the ${m}% sensor index with a representative soil check for ${crop} at the ${stage.toLowerCase()} stage. The index is not automatically volumetric water content.`]); }
    if (temp >= 36) priorities.push(['Heat context', `The entered temperature is ${temp}°C. Check crop stress, soil moisture and local forecast; temperature alone is not an irrigation trigger.`]);
    priorities.push(['Record the evidence', 'Note date, field zone, probe depth, rainfall, crop stage and any manual intervention so the next check can be compared.']);
    priorities.push(['Safety gate', 'Any real controller must enforce dry-run prevention, maximum runtime, overcurrent protection and safe default-off behaviour independently of this website.']);
    setOutput('copilotOutput', 'FIELD ACTION BRIEF', `<span class="result-pill ${water === 'no' ? 'result-warning' : 'result-success'}">${escapeHTML(status)}</span><h3>${escapeHTML(crop)} · ${escapeHTML(stage)}</h3><p>Inputs received: moisture index ${fmt(m, 0)} / 100 · ${fmt(temp, 1)}°C · rain: ${escapeHTML(rain)} · water: ${escapeHTML(water)}.</p><ul class="result-list">${priorities.map(([title, detail]) => `<li><strong>${escapeHTML(title)}:</strong> ${escapeHTML(detail)}</li>`).join('')}</ul>${notes ? `<p><strong>Your note:</strong> ${escapeHTML(notes)}</p>` : ''}<p class="report-disclaimer">This is a transparent local checklist generator, not an agronomic diagnosis or trained AI recommendation.</p>`);
  });

  $('#scoutForm').addEventListener('submit', event => {
    event.preventDefault();
    const symptoms = $$('input[name="symptom"]:checked', $('#scoutForm')).map(item => item.value);
    const crop = value('scoutCrop').trim() || 'Unspecified crop';
    const inspected = number('scoutInspected'), affected = number('scoutAffected'), part = value('scoutPart'), pattern = value('scoutPattern');
    if (!Number.isInteger(inspected) || !Number.isInteger(affected) || inspected < 1 || affected < 0 || affected > inspected) return toast('Affected plants must be from zero to the number inspected');
    if (!symptoms.length) return toast('Select at least one symptom you observed');
    const incidence = affected / inspected * 100;
    const findings = [];
    if (symptoms.includes('chew')) findings.push('Chewing or holes can be associated with insect or animal feeding. Look for insects, frass, eggs and fresh feeding at different times of day.');
    if (symptoms.includes('spots') || symptoms.includes('powder') || symptoms.includes('rot')) findings.push('Spots, powdery growth or rotting tissue can have infectious and non-infectious causes. Photograph both sides of leaves and collect a correctly labelled sample for expert review.');
    if (symptoms.includes('yellow') || symptoms.includes('stunt') || symptoms.includes('curl') || symptoms.includes('wilt')) findings.push('Yellowing, stunting, curling and wilting may be linked to water stress, roots, nutrition, pests, disease or chemical injury. Compare affected and healthy plants and review recent field operations.');
    if (pattern.includes('wet')) findings.push('A low or wet area pattern makes drainage, waterlogging and soil differences worth checking.');
    if (pattern.includes('Uniform')) findings.push('A uniform field pattern may point to a shared field-wide factor such as weather, input, irrigation or a widespread pest/disease pressure. Verify with samples.');
    if (pattern.includes('Patchy')) findings.push('Patchy clusters make it useful to map the affected area and compare soil, water flow and crop operations in affected versus unaffected zones.');
    const next = ['Photograph the whole plant and close-ups, including both leaf surfaces.', 'Inspect a set of affected and apparently healthy plants using the same sampling method.', 'Record date, crop variety, growth stage, field zone, recent rainfall and recent inputs.', 'Ask a local Krishi Vigyan Kendra (KVK), extension officer or plant-health specialist to verify the cause before applying a treatment.'];
    setOutput('scoutOutput', 'CROP SCOUT SUMMARY', `<span class="result-pill">OBSERVATION ORGANISER</span><h3>${escapeHTML(crop)} · ${escapeHTML(part)}</h3><p><strong>${fmt(incidence, 1)}% incidence</strong> (${affected} of ${inspected} plants inspected). Pattern: ${escapeHTML(pattern)}. Symptoms selected: ${symptoms.map(escapeHTML).join(', ')}.</p><h3>Broad possibilities to investigate</h3><ul>${findings.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul><h3>Evidence to collect next</h3><ol>${next.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ol><p class="report-disclaimer">This is not image recognition, a disease diagnosis or a pesticide recommendation. Several conditions can look similar; confirm locally.</p>`);
  });

  $('#sensorForm').addEventListener('submit', event => {
    event.preventDefault();
    const readings = [number('probeA'), number('probeB'), number('probeC')];
    const expected = number('expectedFlow'), measured = number('measuredFlow'), tolerance = number('flowTolerance'), pump = value('detectPump');
    if (readings.some(n => !Number.isFinite(n) || n < 0 || n > 100) || !finitePositive(expected, tolerance) || !Number.isFinite(measured) || measured < 0 || tolerance > 80) return toast('Check sensor values, expected flow and allowed deviation');
    const spread = Math.max(...readings) - Math.min(...readings);
    const deviation = Math.abs(expected - measured) / expected * 100;
    const checks = [];
    if (spread > 25) checks.push(`Probe spread is ${fmt(spread, 1)} points. Check whether the probes are calibrated, at similar depths and in comparable soil zones; map wet and dry patches before assuming a fault.`);
    else checks.push(`Probe spread is ${fmt(spread, 1)} points. These entered values are relatively close, but this alone does not prove that the sensors are accurate.`);
    if (pump === 'Running' && deviation > tolerance) checks.push(`Measured flow differs from expected by ${fmt(deviation, 1)}%, above your ${fmt(tolerance, 1)}% tolerance. Inspect the flow meter, valve position, filter, pipe blockage, leaks and pump operating conditions.`);
    else if (pump === 'Running') checks.push(`Flow deviation is ${fmt(deviation, 1)}%, within the entered tolerance. Continue routine checks and compare over time.`);
    else if (measured > 0) checks.push('The pump is marked stopped while measured flow is above zero. Verify flow-meter zero offset, gravity flow, another connected line or a valve that is not fully closed.');
    else checks.push('Pump and flow inputs are both marked stopped / zero. Keep a baseline reading for future comparisons.');
    const alert = spread > 25 || (pump === 'Running' && deviation > tolerance) || (pump === 'Stopped' && measured > 0);
    setOutput('sensorOutput', 'SENSOR & FLOW REVIEW', `<span class="result-pill ${alert ? 'result-warning' : 'result-success'}">${alert ? 'CHECKS TO INVESTIGATE' : 'NO LARGE DEVIATION FLAGGED'}</span><h3>Consistency snapshot</h3><p>Moisture probe values: ${readings.map(n => `${fmt(n, 0)}%`).join(' · ')}. Range: ${fmt(Math.min(...readings), 0)}–${fmt(Math.max(...readings), 0)}. Flow deviation: ${fmt(deviation, 1)}%.</p><ul class="result-list">${checks.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul><p><strong>Important:</strong> use calibrated instruments and physically inspect the installation. These comparisons only flag patterns; they cannot confirm a leak or faulty component.</p>`);
  });

  $('#rotationForm').addEventListener('submit', event => {
    event.preventDefault();
    const previous = value('previousFamily'), goal = value('rotationGoal'), constraints = value('rotationConstraints').trim();
    const familyAdvice = {
      cereal: 'Consider a different botanical family for the next phase. A legume, oilseed or suitable vegetable may broaden the sequence where climate, water, market and rotation history allow.',
      legume: 'Consider a non-legume family next, such as a cereal or oilseed, if suitable locally. Check disease carry-over, volunteer plants and the actual nutrient plan.',
      oilseed: 'Consider a different family rather than repeating the same crop group. Compare cereal, legume or vegetable options against the local planting window.',
      vegetable: 'Consider a crop from a different family and review specific pest and disease host relationships; “vegetable” contains many botanical families.',
      fibre: 'Consider a different botanical family and check local rotation guidance, residue management and market contracts.',
      unknown: 'First identify the previous crop and its botanical family. Rotation planning is weak when the preceding crop is unknown.'
    };
    const goalAdvice = {
      diversity: 'Write down the botanical family of the previous and proposed crop. Avoid assuming two crops are different families just because their common names differ.',
      soil: 'Check whether a cover crop, residue-retaining phase or organic-matter practice is feasible. Select a species only after checking local rainfall, termination method and water competition.',
      market: 'Compare likely buyer demand, storage, labour, seed availability and harvest timing before finalising a crop sequence.',
      water: 'Estimate seasonal water availability and irrigation access first. A biologically attractive rotation may not be practical under a water constraint.'
    };
    setOutput('rotationOutput', 'ROTATION WORKSHEET', `<span class="result-pill">DIVERSITY PLANNING PROMPT</span><h3>Previous family: ${escapeHTML(previous)}</h3><p>${escapeHTML(familyAdvice[previous])}</p><h3>Planning focus</h3><p>${escapeHTML(goalAdvice[goal])}</p><h3>Before choosing the next crop</h3><ol><li>Check local sowing and harvest windows and water availability.</li><li>Review soil test, salinity / drainage conditions and previous pest or disease history.</li><li>Confirm seed, machinery, labour, storage and market access.</li><li>Ask a local extension specialist to verify the proposed sequence.</li></ol>${constraints ? `<p><strong>Your local constraints:</strong> ${escapeHTML(constraints)}</p>` : ''}<p class="report-disclaimer">This is a crop-family worksheet, not a district-specific crop recommendation.</p>`);
  });

  const taskTemplates = {
    irrigation: ['Walk the field and compare wet and dry zones at a consistent root depth.', 'Check tank level, filters, visible leaks, valve positions and pipe condition.', 'Review recent rainfall and check the soil before scheduling irrigation.', 'Record pump start/stop times, measured flow and water volume.', 'Confirm dry-run protection, maximum runtime and safe shutdown procedures.'],
    scouting: ['Walk a repeatable W-shaped or locally accepted sample route.', 'Inspect both healthy-looking and affected plants from each zone.', 'Photograph symptoms with date, field and plant part recorded.', 'Count inspected and affected plants using the same sampling method.', 'Ask a local extension worker to verify suspected pest or disease causes.'],
    soil: ['Review the date, depth and location of the latest soil sample.', 'Record soil moisture and note the method and sensor calibration.', 'Check the current soil-test report before planning nutrient inputs.', 'Record any product name, label grade, amount and application date.', 'Keep a follow-up observation to compare the response.'],
    harvest: ['Confirm maturity indicators used for this crop and variety with local guidance.', 'Check weather, labour, machinery and transport availability.', 'Prepare clean, dry and suitable storage space.', 'Record harvested quantity, moisture test method and quality observations.', 'Separate damaged or suspect produce and follow safe storage guidance.'],
    general: ['Walk each field zone and note unusual changes.', 'Check water availability, drainage and visible irrigation equipment.', 'Inspect crop stand and record any symptoms or gaps.', 'Review field tasks due and any input or labour records.', 'Write down one item that needs follow-up or expert advice.']
  };
  $('#taskForm').addEventListener('submit', event => {
    event.preventDefault();
    const crop = value('taskCrop').trim() || 'Crop';
    const stage = value('taskStage');
    const focus = value('taskFocus');
    const reminder = value('taskReminder').trim();
    const tasks = [...taskTemplates[focus]];
    if (reminder) tasks.unshift(`Local reminder: ${reminder}`);
    setOutput('taskOutput', 'GENERATED FIELD CHECKLIST', `<span class="result-pill">EDIT BEFORE USE</span><h3>${escapeHTML(crop)} · ${escapeHTML(stage)}</h3><p>Use the checklist as a starting point. Mark each item only after you have completed it.</p><ul class="result-list">${tasks.map((task, index) => `<li><label style="display:flex;gap:9px;align-items:flex-start;color:var(--muted);"><input type="checkbox" style="margin-top:3px;accent-color:var(--leaf)"><span>${escapeHTML(task)}</span></label></li>`).join('')}</ul><button class="button button-secondary button-small" type="button" id="copyTaskList">Copy checklist</button>`);
    $('#copyTaskList').addEventListener('click', () => copyText(`${crop} · ${stage}\n${tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}`));
  });

  function copyText(text) {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard')).catch(() => fallbackCopy(text));
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select();
    try { document.execCommand('copy'); toast('Copied to clipboard'); } catch { toast('Copy is unavailable in this browser'); }
    area.remove();
  }
  const voicePhrases = {
    en: { moisture: f => `Please read the soil moisture index for ${f}.`, pump: f => `Please show the pump status for ${f}.`, rain: f => `Check whether the rain hold is active for ${f}.`, water: f => `Estimate the water requirement for ${f} using the saved field inputs.`, record: f => `Open a new field note for ${f}.`, help: f => `Explain the latest irrigation decision for ${f} and show the safety checks.` },
    hi: { moisture: f => `${f} के लिए मिट्टी की नमी का सूचकांक बताइए।`, pump: f => `${f} के पंप की स्थिति दिखाइए।`, rain: f => `${f} के लिए बारिश के कारण सिंचाई रोकने की स्थिति जाँचिए।`, water: f => `${f} के लिए दर्ज जानकारी के आधार पर पानी की आवश्यकता का अनुमान बताइए।`, record: f => `${f} के लिए नया खेत रिकॉर्ड खोलिए।`, help: f => `${f} के सिंचाई निर्णय और सुरक्षा जाँच को सरल भाषा में समझाइए।` },
    pa: { moisture: f => `${f} ਲਈ ਮਿੱਟੀ ਦੀ ਨਮੀ ਦਾ ਸੂਚਕ ਦੱਸੋ।`, pump: f => `${f} ਦੇ ਪੰਪ ਦੀ ਸਥਿਤੀ ਦਿਖਾਓ।`, rain: f => `${f} ਲਈ ਮੀਂਹ ਕਰਕੇ ਸਿੰਚਾਈ ਰੋਕਣ ਦੀ ਸਥਿਤੀ ਜਾਂਚੋ।`, water: f => `${f} ਲਈ ਦਰਜ ਕੀਤੀ ਜਾਣਕਾਰੀ ਤੋਂ ਪਾਣੀ ਦੀ ਲੋੜ ਦਾ ਅੰਦਾਜ਼ਾ ਦੱਸੋ।`, record: f => `${f} ਲਈ ਨਵਾਂ ਖੇਤ ਰਿਕਾਰਡ ਖੋਲ੍ਹੋ।`, help: f => `${f} ਦਾ ਸਿੰਚਾਈ ਫੈਸਲਾ ਅਤੇ ਸੁਰੱਖਿਆ ਜਾਂਚ ਸੌਖੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਸਮਝਾਓ।` }
  };
  $('#voiceForm').addEventListener('submit', event => {
    event.preventDefault();
    const lang = value('voiceLanguage'), action = value('voiceAction'), field = value('voiceField').trim() || 'this field';
    const phrase = voicePhrases[lang][action](field);
    const langName = { en: 'ENGLISH', hi: 'HINDI', pa: 'PUNJABI' }[lang];
    setOutput('voiceOutput', 'VOICE-READY PHRASE', `<span class="result-pill">${langName}</span><h3 style="font-size:23px;line-height:1.55">${escapeHTML(phrase)}</h3><p>Example phrase only. No microphone is active and no instruction is sent to equipment.</p><button class="button button-secondary button-small" id="copyVoice">Copy phrase</button>`);
    $('#copyVoice').addEventListener('click', () => copyText(phrase));
  });

  const resiliencePlaybooks = {
    heat: {
      prepare: ['Check a trusted local heat advisory and identify who will communicate changes to the farm team.', 'Inspect irrigation lines, storage, shade structures and equipment before the event.', 'Identify safe drinking-water access and safe work/rest arrangements for people and animals.', 'Record the crop stage and note the field zones most exposed to heat.'],
      during: ['Follow official local heat and worker-safety guidance; do not rely on this website as a forecast.', 'Inspect crop condition and soil moisture at representative locations; do not irrigate from air temperature alone.', 'Keep people away from unsafe machinery and electrical equipment during extreme conditions.'],
      after: ['Record observed crop stress, soil moisture, water use and any action taken.', 'Review which field zones and resources were most vulnerable before the next heat period.']
    },
    'heavy-rain': {
      prepare: ['Check official local rainfall and flood advisories.', 'Inspect field drains and safe water outlets without entering unsafe or flooded areas.', 'Move movable equipment, records and inputs away from known water-entry points where safe.', 'Identify safe access routes and keep electrical equipment protected from water.'],
      during: ['Keep people away from floodwater, unstable ground and submerged electrical equipment.', 'Follow local emergency instructions and do not operate electrical equipment in wet or flooded conditions.', 'Record affected plots and waterlogging only when it is safe to do so.'],
      after: ['Inspect drainage, erosion, sediment movement and equipment after conditions are safe.', 'Document crop damage, standing water duration and any soil or water tests that may be needed.', 'Ask local extension staff before making nutrient or crop-protection decisions after flooding.']
    },
    drought: {
      prepare: ['Review measured water availability, storage, field area and expected crop stage.', 'Inspect and repair visible leaks, blocked filters and damaged irrigation components.', 'Ask local extension staff about lawful and agronomically appropriate water-priority options.', 'Set up a record of water volume, field zone and irrigation timing.'],
      during: ['Check root-zone conditions and crop condition using a consistent field method.', 'Keep pump dry-run and electrical protection active; do not operate equipment without adequate water.', 'Record water use and manual interventions so allocation can be reviewed.'],
      after: ['Compare the water plan with actual use and observed crop response.', 'Review field zones, soil test information and future contingency options with local advisers.']
    },
    power: {
      prepare: ['List which activities depend on electricity and identify safe shutdown steps.', 'Check the condition of approved electrical equipment and arrange a qualified person for any electrical work.', 'Identify a safe communication plan and the contact for utility or equipment support.'],
      during: ['Keep equipment in its safe state and never improvise live electrical connections.', 'Do not use a generator or backup supply unless it is properly rated, installed and operated according to safety requirements.', 'Record interruption time and any affected field operations.'],
      after: ['Have equipment checked before restarting if there was water ingress, electrical damage or unusual behaviour.', 'Record missed irrigation or operation windows and review the plan with a qualified local adviser.']
    },
    water: {
      prepare: ['Measure available stored water and list the field zones that depend on it.', 'Check the tank or source-level sensor and verify the displayed reading manually.', 'Inspect for visible leaks and confirm that dry-run protection is operational.', 'Discuss local water allocation and crop priorities with the relevant adviser or authority.'],
      during: ['Do not allow a pump to run dry or bypass a low-water interlock.', 'Record water issued by field zone and keep the measured amounts traceable.', 'Review the plan when supply changes rather than relying on a fixed calendar alone.'],
      after: ['Compare planned and actual water availability.', 'Record any crop or field observations and update the contingency plan with local guidance.']
    }
  };
  $('#resilienceForm').addEventListener('submit', event => {
    event.preventDefault();
    const hazard = value('resilienceHazard'), stage = value('resilienceStage'), vulnerability = value('resilienceVulnerability'), note = value('resilienceNote').trim();
    const play = resiliencePlaybooks[hazard];
    const extra = {
      drainage: 'Additional focus: drainage capacity is marked limited. Identify safe overflow routes and seek local advice on erosion and waterlogging risks.',
      backup: 'Additional focus: no backup power is recorded. Plan safe shutdown and communication; do not improvise electrical backup arrangements.',
      storage: 'Additional focus: water storage is limited. Verify physical stock and source constraints rather than assuming the level sensor is correct.',
      access: 'Additional focus: field access may be disrupted. Identify safe routes and keep people away from flooded or unstable areas.',
      unknown: 'Additional focus: complete a simple vulnerability walk-through and note drainage, access, water storage, power and communication constraints.'
    }[vulnerability];
    const sections = [['Prepare', play.prepare], ['During the event', play.during], ['After conditions improve', play.after]];
    setOutput('resilienceOutput', 'FIELD RESILIENCE PLAYBOOK', `<span class="result-pill result-warning">SCENARIO: ${escapeHTML(hazard.replace('-', ' ').toUpperCase())}</span><h3>${escapeHTML(stage)}</h3><p>${escapeHTML(extra)}</p>${sections.map(([title, tasks]) => `<h3>${escapeHTML(title)}</h3><ol>${tasks.map(task => `<li>${escapeHTML(task)}</li>`).join('')}</ol>`).join('')}${note ? `<p><strong>Local contact / resource:</strong> ${escapeHTML(note)}</p>` : ''}<p class="report-disclaimer">This is a preparedness checklist, not a forecast or emergency warning. Follow official local alerts and safety instructions.</p>`);
  });

  $('#harvestForm').addEventListener('submit', event => {
    event.preventDefault();
    const crop = value('harvestCrop').trim() || 'Produce', stage = value('harvestStage'), storage = value('harvestStorage'), transport = value('harvestTransport'), note = value('harvestNote').trim();
    const list = [
      'Confirm maturity using crop- and variety-specific signs from local extension guidance; do not rely on a calendar date alone.',
      'Agree on the harvest window, labour, tools, protective equipment and a clean handling area.',
      'Keep produce from different fields or quality groups identifiable where traceability matters.',
      'Record harvested mass, field / lot identity, date and any visible damage.'
    ];
    if (storage === 'clean') list.push('Clean and inspect the storage area, containers and handling equipment before produce arrives.');
    if (storage === 'damp') list.push('Do not place damp or wet produce into unsuitable storage. Check the crop-specific safe moisture / quality standard and arrange appropriate drying or expert guidance.');
    if (storage === 'unknown') list.push('Inspect the storage area, ventilation, cleanliness, pest exclusion and suitability before filling it.');
    if (storage === 'ready') list.push('Re-check cleanliness, ventilation, pest exclusion and the storage capacity before filling.');
    if (transport === 'Not arranged') list.push('Confirm a safe, clean transport option and handover time before harvesting at scale.');
    else list.push(`Confirm the ${transport.toLowerCase()} is clean, available and appropriate for this produce.`);
    list.push('Keep lots clearly labelled and separate damaged or suspect produce for review.');
    list.push('Record storage conditions and follow the crop-specific standard for moisture, temperature, aeration and inspection frequency.');
    setOutput('harvestOutput', 'HARVEST HANDOVER CHECKLIST', `<span class="result-pill">${escapeHTML(stage.toUpperCase())}</span><h3>${escapeHTML(crop)} preparation</h3><ul class="result-list">${list.map((task, i) => `<li><label style="display:flex;gap:9px;align-items:flex-start;color:var(--muted);"><input type="checkbox" style="margin-top:3px;accent-color:var(--leaf)"><span>${escapeHTML(task)}</span></label></li>`).join('')}</ul>${note ? `<p><strong>Special note:</strong> ${escapeHTML(note)}</p>` : ''}<p class="report-disclaimer">The planner does not determine maturity, safe moisture limits or storage suitability. Follow crop-specific standards and local advice.</p><button class="button button-secondary button-small" type="button" id="copyHarvestPlan">Copy checklist</button>`);
    $('#copyHarvestPlan').addEventListener('click', () => copyText(`${crop} harvest checklist\n${list.map((task, i) => `${i + 1}. ${task}`).join('\n')}`));
  });

  // ---------------------------------------------------------------------------
  // Calculator library: calculations use only the values entered by the user.
  // ---------------------------------------------------------------------------
  $('#calculateWater').addEventListener('click', () => {
    const area = number('waterArea'), depth = number('waterDepth'), eff = number('waterEfficiency'), events = number('waterEvents');
    if (!finitePositive(area, depth, eff, events) || eff > 1 || !Number.isInteger(events) || events > 14) return setResult('waterResult', 'INPUT CHECK', 'Check the entries', 'Area, depth and efficiency must be positive; efficiency cannot exceed 100%; weekly events must be a whole number from 1 to 14.', 'warning');
    const net = area * 10000 * depth;
    const gross = net / eff;
    setResult('waterResult', 'GROSS WATER ESTIMATE', `${fmtLitres(gross)} / event`, `Net target volume: ${fmtLitres(net)}. At the entered ${fmt(eff * 100, 0)}% application efficiency, weekly gross volume is about ${fmtLitres(gross * events)} over ${events} events.`, 'success');
  });
  $('#calculatePump').addEventListener('click', () => {
    const volume = number('pumpVolume'), flow = number('pumpFlow'), watts = number('pumpPower'), tariff = number('powerTariff');
    if (!finitePositive(volume, flow, watts) || !Number.isFinite(tariff) || tariff < 0) return setResult('pumpResult', 'INPUT CHECK', 'Check the entries', 'Volume, flow and power must be positive; tariff cannot be negative.', 'warning');
    const minutes = volume / flow, hours = minutes / 60, kwh = watts / 1000 * hours, cost = kwh * tariff;
    setResult('pumpResult', 'ESTIMATED PUMP SESSION', `${fmt(minutes, 1)} minutes`, `${fmt(hours, 2)} hours · ${fmt(kwh, 3)} kWh · ₹${fmt(cost, 2)} indicative energy cost for one session.`, 'success');
  });
  $('#calibrateSensor').addEventListener('click', () => {
    const dry = number('adcDry'), wet = number('adcWet'), raw = number('adcCurrent');
    if (![dry, wet, raw].every(Number.isFinite) || dry === wet) return setResult('sensorResult', 'CALIBRATION ERROR', 'Reference points must differ', 'Enter numeric dry, wet and current readings. Dry and wet references cannot be equal.', 'warning');
    const mapped = (raw - dry) / (wet - dry) * 100, normalized = Math.max(0, Math.min(100, mapped));
    const outside = mapped < 0 || mapped > 100;
    setResult('sensorResult', 'NORMALIZED SENSOR INDEX', `${fmt(normalized, 1)}%`, `${outside ? 'The raw reading lies outside your calibration endpoints and has been clamped. ' : ''}Raw mapped result: ${fmt(mapped, 1)}%. This is not a verified volumetric water-content measurement.`, outside ? 'warning' : 'success');
    $('#sensorMeter').style.width = `${normalized}%`;
  });
  $('#buildSchedule').addEventListener('click', () => {
    const count = number('zoneCount'), minutes = number('zoneMinutes'), flow = number('zoneFlow'), events = number('zoneEvents');
    if (!finitePositive(count, minutes, flow, events) || !Number.isInteger(count) || !Number.isInteger(events) || count > 40 || events > 14) {
      setResult('scheduleResult', 'INPUT CHECK', 'Check zone settings', 'Use 1–40 whole zones and 1–14 whole weekly cycles, with positive duration and flow.', 'warning'); $('#scheduleOutput').replaceChildren(); return;
    }
    const cycleMinutes = count * minutes, weekMinutes = cycleMinutes * events, cycleVolume = count * minutes * flow;
    setResult('scheduleResult', 'SEQUENTIAL ZONE PLAN', `${fmt(weekMinutes / 60, 1)} pump-hours / week`, `${fmtLitres(cycleVolume)} per full cycle and ${fmtLitres(cycleVolume * events)} per week at the entered flow, assuming zones run sequentially.`, 'success');
    $('#scheduleOutput').innerHTML = `<div class="schedule-summary"><span>${count} zones</span><span>${fmt(minutes, 0)} min / zone</span><span>${events} cycles / week</span></div><ol>${Array.from({ length: count }, (_, i) => `<li><span class="zone-badge">Z${i + 1}</span><span>Run for ${fmt(minutes, 0)} min</span><strong>${fmtLitres(minutes * flow)}</strong></li>`).join('')}</ol><p class="schedule-caption">One cycle is approximately ${fmt(cycleMinutes, 0)} minutes, excluding switching delays and soak-in time.</p>`;
  });
  $('#calculateInterval').addEventListener('click', () => {
    const fc = number('intervalFC'), wp = number('intervalWP'), rootCm = number('intervalRoot'), depletion = number('intervalDepletion'), et = number('intervalET');
    if (![fc, wp, rootCm, depletion, et].every(Number.isFinite) || fc <= wp || wp < 0 || fc > 100 || rootCm <= 0 || depletion <= 0 || depletion > 1 || et <= 0) return setResult('intervalResult', 'INPUT CHECK', 'Review soil inputs', 'Field capacity must be greater than wilting point; percentages must be 0–100, depth and daily use positive, and depletion between 0 and 1.', 'warning');
    const taw = (fc - wp) / 100 * rootCm * 10;
    const raw = taw * depletion;
    const days = raw / et;
    setResult('intervalResult', 'THEORETICAL ROOT-ZONE BUFFER', `${fmt(days, 1)} days`, `Total available water ≈ ${fmt(taw, 1)} mm; readily available portion ≈ ${fmt(raw, 1)} mm; entered daily use = ${fmt(et, 1)} mm/day. This is a simplified estimate, not an irrigation schedule.`, 'success');
  });
  $('#calculateRain').addEventListener('click', () => {
    const rain = number('rainDepth'), area = number('catchmentArea'), coefficient = number('runoffCoeff'), capacity = number('storageCapacity');
    if (![rain, area, coefficient, capacity].every(Number.isFinite) || rain < 0 || area <= 0 || coefficient < 0 || coefficient > 1 || capacity < 0) return setResult('rainResult', 'INPUT CHECK', 'Review entries', 'Rain and capacity cannot be negative; area must be positive; runoff coefficient must be from 0 to 1.', 'warning');
    const gross = rain * area * coefficient;
    const stored = Math.min(gross, capacity);
    setResult('rainResult', 'RAINWATER COLLECTION ESTIMATE', `${fmtLitres(gross)} gross`, `With ${fmt(coefficient, 2)} runoff coefficient, the theoretical amount is ${fmtLitres(gross)}. At most ${fmtLitres(stored)} fits the entered storage capacity; actual usable water may be lower.`, 'success');
  });
  $('#calculateSeed').addEventListener('click', () => {
    const area = number('seedArea'), rate = number('seedRate'), germ = number('seedGerm'), purity = number('seedPurity');
    if (!finitePositive(area, rate, germ, purity) || germ > 100 || purity > 100) return setResult('seedResult', 'INPUT CHECK', 'Review seed values', 'Area and target rate must be positive; germination and purity must each be greater than 0 and no more than 100%.', 'warning');
    const adjusted = rate * area / ((germ / 100) * (purity / 100));
    setResult('seedResult', 'ADJUSTED SEED LOT QUANTITY', `${fmt(adjusted, 2)} kg`, `At ${fmt(germ, 1)}% germination and ${fmt(purity, 1)}% purity, the adjusted amount is about ${fmt(adjusted / area, 2)} kg/ha for ${fmt(area, 2)} ha. Enter a target rate recommended for your crop and seed lot.`, 'success');
  });
  $('#calculateFert').addEventListener('click', () => {
    const area = number('fertArea'), target = number('fertTarget'), grade = number('fertGrade'), bag = number('fertBag');
    if (!finitePositive(area, target, grade, bag) || grade > 100) return setResult('fertResult', 'INPUT CHECK', 'Review fertilizer inputs', 'Area, target nutrient and bag size must be positive; grade must be from 0 to 100%.', 'warning');
    const product = target * area / (grade / 100), bags = product / bag;
    setResult('fertResult', 'FERTILIZER PRODUCT CONVERSION', `${fmt(product, 2)} kg product`, `Equivalent to about ${fmt(bags, 2)} bags of ${fmt(bag, 1)} kg. This converts an entered nutrient plan into product mass; it does not recommend the rate.`, 'success');
  });
  $('#calculateHyd').addEventListener('click', () => {
    const flow = number('hydFlow'), head = number('hydHead'), eff = number('hydEfficiency'), hours = number('hydHours');
    if (!finitePositive(flow, head, eff, hours) || eff > 100) return setResult('hydResult', 'INPUT CHECK', 'Review hydraulic values', 'Flow, head and duration must be positive; efficiency must be from 1 to 100%.', 'warning');
    const q = flow / 3600;
    const hydraulicKw = 1000 * 9.81 * q * head / 1000;
    const estimatedInputKw = hydraulicKw / (eff / 100);
    const energy = estimatedInputKw * hours;
    setResult('hydResult', 'IDEALISED POWER ESTIMATE', `${fmt(estimatedInputKw, 2)} kW`, `Hydraulic power ≈ ${fmt(hydraulicKw, 2)} kW before the entered efficiency adjustment. Energy for ${fmt(hours, 1)} h ≈ ${fmt(energy, 2)} kWh. This excludes detailed motor and pipe-loss design.`, 'success');
  });
  $('#calculateSpray').addEventListener('click', () => {
    const rate = number('sprayRate'), tank = number('sprayTank'), tanks = number('sprayTanks'), unit = value('sprayUnit');
    if (![rate, tank, tanks].every(Number.isFinite) || rate < 0 || tank <= 0 || !Number.isInteger(tanks) || tanks < 1) return setResult('sprayResult', 'INPUT CHECK', 'Review label arithmetic', 'Rate must be non-negative, tank volume positive and number of tanks a positive whole number.', 'warning');
    setResult('sprayResult', 'LABEL-BASED QUANTITY ONLY', `${fmt(rate * tank, 2)} ${unit} / tank`, `For ${tanks} tank(s), the entered label rate gives ${fmt(rate * tank * tanks, 2)} ${unit} total. Use only the exact product label and local rules; this tool does not recommend a spray rate.`, 'success');
  });
  $('#calculateScouting').addEventListener('click', () => {
    const total = number('scoutTotal'), affected = number('scoutCount'), date = value('scoutDate'), name = value('scoutName').trim() || 'Unspecified symptom';
    if (!Number.isInteger(total) || !Number.isInteger(affected) || total < 1 || affected < 0 || affected > total) return setResult('scoutCalcResult', 'INPUT CHECK', 'Review plant counts', 'Inspected plants must be a positive whole number and affected plants must be between zero and that total.', 'warning');
    const incidence = affected / total * 100;
    setResult('scoutCalcResult', 'OBSERVATION INCIDENCE', `${fmt(incidence, 1)}% affected`, `${affected} of ${total} plants showed “${name}”${date ? ` on ${date}` : ''}. Repeat the same sample method to compare dates. This is not a treatment threshold.`, 'success');
  });
  $('#calculateRoi').addEventListener('click', () => {
    const initial = number('roiInitial'), benefit = number('roiBenefit'), running = number('roiRunning'), years = number('roiYears');
    if (![initial, benefit, running, years].every(Number.isFinite) || initial < 0 || benefit < 0 || running < 0 || !Number.isInteger(years) || years < 1 || years > 50) return setResult('roiResult', 'INPUT CHECK', 'Review financial values', 'Costs and benefit cannot be negative; planning horizon must be a whole number from 1 to 50 years.', 'warning');
    const net = benefit - running;
    if (net <= 0) return setResult('roiResult', 'NO SIMPLE PAYBACK', 'Annual net benefit is not positive', `Entered annual benefit less running cost is ₹${fmt(net, 2)}. Payback cannot be calculated from a non-positive annual net benefit.`, 'warning');
    const payback = initial / net;
    const cumulative = net * years - initial;
    setResult('roiResult', 'SIMPLE PAYBACK SCENARIO', `${fmt(payback, 1)} years`, `Annual net benefit ≈ ₹${fmt(net, 0)}. Net cumulative balance after ${years} years, before financing and discounting, ≈ ₹${fmt(cumulative, 0)}. Treat this as a scenario, not a guaranteed return.`, 'success');
  });
  $('#calculateBalance').addEventListener('click', () => {
    const area = number('balanceArea'), etc = number('balanceET'), rain = number('balanceRain'), soil = number('balanceSoil'), efficiency = number('balanceEfficiency');
    if (!finitePositive(area, efficiency) || ![etc, rain, soil].every(Number.isFinite) || etc < 0 || rain < 0 || soil < 0 || efficiency > 1) return setResult('balanceResult', 'INPUT CHECK', 'Review water-balance inputs', 'Area and efficiency must be positive, efficiency cannot exceed 100%, and daily depths cannot be negative.', 'warning');
    const net = Math.max(0, etc - rain - soil);
    const gross = net / efficiency;
    const litres = gross * area * 10000;
    setResult('balanceResult', 'DAILY IRRIGATION DEFICIT', `${fmt(net, 2)} mm net`, `Gross planning depth ≈ ${fmt(gross, 2)} mm/day, equivalent to about ${fmtLitres(litres)} across ${fmt(area, 2)} ha at the entered efficiency. This simplified balance omits several soil and weather processes.`, 'success');
  });
  $('#calculateUniformity').addEventListener('click', () => {
    const samples = [1, 2, 3, 4].map(i => number(`catch${i}`));
    if (samples.some(n => !Number.isFinite(n) || n < 0) || samples.reduce((a, b) => a + b, 0) <= 0) return setResult('uniformityResult', 'INPUT CHECK', 'Enter usable catch values', 'Enter four non-negative measurements with a combined volume greater than zero.', 'warning');
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const lowerQuarter = Math.min(...samples);
    const du = lowerQuarter / mean * 100;
    setResult('uniformityResult', 'LOWER-QUARTER DISTRIBUTION UNIFORMITY', `${fmt(du, 1)}%`, `Average catch = ${fmt(mean, 1)} ml; lowest quarter value = ${fmt(lowerQuarter, 1)} ml. This four-point demonstration is only a screening calculation; use an accepted field test with enough sample points for evaluation.`, 'success');
  });
  $('#calculateStorage').addEventListener('click', () => {
    const mass = number('storeMass'), density = number('storeDensity'), fill = number('storeFill'), available = number('storeAvailable');
    if (!finitePositive(mass, density, fill) || !Number.isFinite(available) || available < 0 || fill > 1) return setResult('storageResult', 'INPUT CHECK', 'Review storage inputs', 'Mass, density and fill fraction must be positive; fill fraction cannot exceed 1; available space cannot be negative.', 'warning');
    const volume = mass * 1000 / density / fill;
    const fits = available === 0 ? null : volume <= available;
    setResult('storageResult', 'ESTIMATED STORAGE VOLUME', `${fmt(volume, 2)} m³`, `At ${fmt(density, 0)} kg/m³ bulk density and ${fmt(fill * 100, 0)}% planned fill, estimated volume is ${fmt(volume, 2)} m³.${fits === null ? '' : fits ? ' The result is within the entered available space.' : ` This exceeds the entered ${fmt(available, 2)} m³ available space.`} Confirm actual crop density and storage specifications.`, fits === false ? 'warning' : 'success');
  });
  // Results remain in their explanatory empty state until the user runs a tool.

  // Search tool index: search can open pages and jump to the exact calculator or AI helper.
  const searchCatalog = [
    ['Overview dashboard', 'workspace home feature navigation', 'dashboard'],
    ['Irrigation simulator', 'soil moisture temperature crop threshold rain tank safety pump event log', 'irrigation', 'simulatorControls'],
    ['Farm Copilot', 'AI assistant field notes crop stage moisture rain water availability action brief', 'ai-studio', 'copilotForm'],
    ['Crop Symptom Scout', 'AI crop problem pest disease leaves yellowing spots wilting chewing powder symptoms', 'ai-studio', 'scoutForm'],
    ['Sensor & Pump Detective', 'sensor anomalies probe spread flow meter leak blockage pump', 'ai-studio', 'sensorForm'],
    ['Crop Rotation Planner', 'rotation crop families cereals legumes oilseed sustainability', 'ai-studio', 'rotationForm'],
    ['Farm Task Generator', 'work checklist irrigation scouting soil harvest tasks', 'ai-studio', 'taskForm'],
    ['Multilingual Voice Helper', 'English Hindi Punjabi agriculture voice commands', 'ai-studio', 'voiceForm'],
    ['Field Resilience Playbook', 'heatwave heavy rain drought flood power outage water shortage preparedness checklist', 'ai-studio', 'resilienceForm'],
    ['Harvest & Post-harvest Planner', 'harvest maturity labour transport drying storage traceability checklist', 'ai-studio', 'harvestForm'],
    ['Water Requirement Estimator', 'water depth hectares litres irrigation efficiency', 'tools', 'waterArea'],
    ['Pump Runtime & Energy Cost', 'pump flow power watts electricity tariff kwh runtime', 'tools', 'pumpVolume'],
    ['Soil Sensor Calibration', 'ADC analog dry wet reference normalize soil moisture', 'tools', 'adcDry'],
    ['Multi-Zone Planner', 'irrigation zone schedule sequential runtime volume', 'tools', 'zoneCount'],
    ['Root-Zone Irrigation Interval', 'field capacity wilting point root depth available water depletion evapotranspiration', 'tools', 'intervalFC'],
    ['Rainwater Harvest Potential', 'rainfall roof catchment area storage runoff coefficient', 'tools', 'rainDepth'],
    ['Seed Quantity Planner', 'seed kg hectares germination purity seed rate', 'tools', 'seedArea'],
    ['Fertilizer Product Calculator', 'nutrient grade bag size product conversion nitrogen phosphorus potassium', 'tools', 'fertArea'],
    ['Pump Hydraulic Power', 'total head m3 hour efficiency hydraulic energy', 'tools', 'hydFlow'],
    ['Label-Based Spray Mix', 'product label ml litre grams tank pesticide application rate arithmetic only', 'tools', 'sprayRate'],
    ['Crop Scouting Incidence', 'affected plants inspected sample percentage symptoms monitoring', 'tools', 'scoutTotal'],
    ['Farm Investment Payback', 'investment annual benefit cost payback ROI', 'tools', 'roiInitial'],
    ['Daily Crop Water Balance', 'crop evapotranspiration effective rainfall soil water daily deficit', 'tools', 'balanceArea'],
    ['Irrigation Uniformity Checker', 'distribution uniformity catch can lower quarter sprinkler drip samples', 'tools', 'catch1'],
    ['Harvest Storage Space Estimator', 'grain storage volume bulk density silo space capacity tonnes', 'tools', 'storeMass'],
    ['Field Notebook', 'save local observations search notes export CSV JSON browser', 'records', 'recordForm'],
    ['Performance Report Builder', 'baseline prototype water energy compare days metrics txt csv print PDF', 'reports', 'reportForm'],
    ['Illustrated User Guide', 'website explanation basics feature images diagram PDF download', 'reports', 'guide-download-card'],
    ['System Architecture Guide', 'sensor controller decision logic relay pump safety diagram', 'learn', 'architecture-line'],
    ['Phoenix Coders Team', 'Aryan Das Asmi Jha project contributors team members', 'team']
  ];
  function openSearch() {
    $('#searchOverlay').classList.add('open');
    $('#searchOverlay').setAttribute('aria-hidden', 'false');
    $('#globalSearch').value = '';
    renderSearch('');
    setTimeout(() => $('#globalSearch').focus(), 50);
  }
  function closeOverlay(id) {
    const overlay = $(`#${id}`);
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
  function renderSearch(query) {
    const node = $('#globalSearchResults');
    node.replaceChildren();
    const term = query.trim().toLowerCase();
    if (!term) { const p = document.createElement('p'); p.textContent = 'Search pages, tools and feature explanations. Try “seed rate”, “sensor”, “Punjabi” or “crop scout”.'; node.append(p); return; }
    const matches = searchCatalog.filter(item => item.slice(0, 2).join(' ').toLowerCase().includes(term)).slice(0, 12);
    if (!matches.length) { const p = document.createElement('p'); p.textContent = 'No matching item found. Try a broader word such as water, soil, crop, pump or report.'; node.append(p); return; }
    matches.forEach(item => {
      const button = document.createElement('button'); button.className = 'search-result'; button.type = 'button';
      const label = document.createElement('span'); label.textContent = item[0];
      const hint = document.createElement('small'); hint.textContent = item[2].replace('-', ' ');
      button.append(label, hint);
      button.addEventListener('click', () => {
        closeOverlay('searchOverlay');
        showPage(item[2]);
        if (item[3]) setTimeout(() => {
          if (item[2] === 'ai-studio') {
            const tabKey = ({ scoutForm: 'scout', sensorForm: 'sensor', rotationForm: 'rotation', taskForm: 'tasks', voiceForm: 'voice', copilotForm: 'copilot', resilienceForm: 'resilience', harvestForm: 'harvest' })[item[3]];
            if (tabKey) $(`[data-ai-tab="${tabKey}"]`).click();
          }
          const target = $(`#${CSS.escape(item[3])}`) || $(`[data-view="${item[2]}"] .${CSS.escape(item[3])}`);
          if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.classList.add('tour-highlight'); setTimeout(() => target.classList.remove('tour-highlight'), 1400); }
        }, 180);
      });
      node.append(button);
    });
  }
  $('#searchButton').addEventListener('click', openSearch);
  $('#globalSearch').addEventListener('input', event => renderSearch(event.target.value));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => closeOverlay(button.dataset.close)));
  ['searchOverlay', 'shortcutsOverlay'].forEach(id => $(`#${id}`).addEventListener('click', event => { if (event.target.id === id) closeOverlay(id); }));
  $('#shortcutsButton').addEventListener('click', () => { $('#shortcutsOverlay').classList.add('open'); $('#shortcutsOverlay').setAttribute('aria-hidden', 'false'); });

  // Tool library filtering.
  let activeFilter = 'all';
  function filterTools() {
    const query = $('#toolFilter').value.trim().toLowerCase();
    $$('.calculator-card').forEach(card => {
      const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
      const textMatch = !query || `${card.dataset.keywords} ${card.textContent}`.toLowerCase().includes(query);
      card.classList.toggle('filtered-out', !(categoryMatch && textMatch));
    });
  }
  $('#toolFilter').addEventListener('input', filterTools);
  $$('.filter-chip').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    $$('.filter-chip').forEach(chip => chip.classList.toggle('active', chip === button));
    filterTools();
  }));

  // ---------------------------------------------------------------------------
  // Field notebook: browser-only persistence with CSV / JSON backups.
  // ---------------------------------------------------------------------------
  const recordKey = 'fieldpulse-field-records-v2';
  function readRecords() {
    try { const rows = JSON.parse(storage.get(recordKey, '[]')); return Array.isArray(rows) ? rows : []; }
    catch { return []; }
  }
  let records = readRecords();
  function saveRecords() { storage.set(recordKey, JSON.stringify(records)); }
  function renderRecords() {
    const query = value('recordSearch').trim().toLowerCase();
    const type = value('recordTypeFilter');
    const filtered = records.filter(record => (type === 'all' || record.type === type) && `${record.field} ${record.note} ${record.type}`.toLowerCase().includes(query));
    $('#recordCount').textContent = `${records.length} saved ${records.length === 1 ? 'entry' : 'entries'} · stored on this device`;
    const list = $('#recordList');
    list.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('div'); empty.className = 'empty-state';
      const icon = document.createElement('span'); icon.textContent = '▤';
      const strong = document.createElement('strong'); strong.textContent = records.length ? 'No record matches those filters.' : 'Your field notebook is ready.';
      const p = document.createElement('p'); p.textContent = records.length ? 'Try another search or record type.' : 'Add your first observation using the form.';
      empty.append(icon, strong, p); list.append(empty); return;
    }
    filtered.sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`));
    filtered.forEach(record => {
      const article = document.createElement('article'); article.className = 'record-item';
      article.innerHTML = `<div class="record-item-top"><span class="record-type">${escapeHTML(record.type)}</span><time>${escapeHTML(record.date)}</time></div><h3>${escapeHTML(record.field)}</h3><p>${escapeHTML(record.note)}</p><div class="record-item-bottom"><small>Saved in this browser</small><button class="delete-record" type="button" data-delete-record="${escapeHTML(record.id)}">Delete</button></div>`;
      list.append(article);
    });
  }
  $('#recordForm').addEventListener('submit', event => {
    event.preventDefault();
    const date = value('recordDate'), field = value('recordField').trim(), type = value('recordType'), note = value('recordNote').trim();
    if (!date || !field || !note) return toast('Please enter a date, field name and observation');
    records.unshift({ id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`, date, field, type, note });
    saveRecords(); renderRecords();
    $('#recordNote').value = '';
    toast('Field entry saved on this device');
  });
  $('#recordList').addEventListener('click', event => {
    const button = event.target.closest('[data-delete-record]');
    if (!button) return;
    records = records.filter(record => record.id !== button.dataset.deleteRecord);
    saveRecords(); renderRecords(); toast('Record deleted');
  });
  $('#recordSearch').addEventListener('input', renderRecords);
  $('#recordTypeFilter').addEventListener('change', renderRecords);
  $('#exportRecords').addEventListener('click', () => {
    if (!records.length) return toast('There are no field records to export');
    const rows = [['date', 'field', 'type', 'note'], ...records.map(r => [r.date, r.field, r.type, r.note])];
    downloadText('fieldpulse-field-records.csv', rows.map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
  });
  $('#exportRecordsJson').addEventListener('click', () => {
    if (!records.length) return toast('There are no field records to export');
    downloadText('fieldpulse-field-records.json', JSON.stringify(records, null, 2), 'application/json;charset=utf-8');
  });
  renderRecords();

  // ---------------------------------------------------------------------------
  // Performance report builder.
  // ---------------------------------------------------------------------------
  let latestReportText = '';
  let latestReportCsv = '';
  $('#reportForm').addEventListener('submit', event => {
    event.preventDefault();
    const bw = number('baselineWater'), pw = number('prototypeWater'), be = number('baselineEnergy'), pe = number('prototypeEnergy'), days = number('trialDays'), overrides = number('manualInterventions');
    const notes = value('reportNotes').trim() || 'No additional field notes supplied.';
    if (![bw, pw, be, pe, days, overrides].every(Number.isFinite) || [bw, pw, be, pe, overrides].some(n => n < 0) || days <= 0 || !Number.isInteger(days) || !Number.isInteger(overrides)) return toast('Check the report values: non-negative totals and whole-number days / interventions are required');
    const waterChange = bw > 0 ? (pw - bw) / bw * 100 : null;
    const energyChange = be > 0 ? (pe - be) / be * 100 : null;
    const waterDiff = bw - pw, energyDiff = be - pe;
    const pctText = (change, unit, delta) => change === null ? `Percentage change unavailable because the baseline is zero (${fmt(delta, 2)} ${unit} difference).` : `${delta >= 0 ? 'Lower by' : 'Higher by'} ${fmt(Math.abs(delta), 2)} ${unit} (${fmt(Math.abs(change), 1)}%).`;
    const waterText = pctText(waterChange, 'L/week', waterDiff);
    const energyText = pctText(energyChange, 'kWh/week', energyDiff);
    const generated = new Date().toLocaleString();
    const csvRows = [
      ['Metric', 'Baseline', 'Prototype', 'Baseline minus prototype', 'Prototype change percent'],
      ['Water use (L/week)', bw, pw, waterDiff, waterChange === null ? 'N/A' : waterChange],
      ['Energy use (kWh/week)', be, pe, energyDiff, energyChange === null ? 'N/A' : energyChange],
      ['Trial duration (days)', days, days, 0, 0],
      ['Manual interventions (count)', overrides, overrides, 0, 0]
    ];
    latestReportCsv = csvRows.map(row => row.map(csvCell).join(',')).join('\n');
    latestReportText = `FIELDPULSE — FIELD PERFORMANCE COMPARISON\nGenerated: ${generated}\n\n1. REPORT SCOPE\nThis report compares user-entered baseline and prototype water and energy figures. The figures are not independently verified measurements.\n\n2. ENTERED VALUES\nBaseline water use: ${fmtLitres(bw)} per week\nPrototype water use: ${fmtLitres(pw)} per week\nBaseline energy: ${fmt(be, 2)} kWh per week\nPrototype energy: ${fmt(pe, 2)} kWh per week\nTrial duration: ${days} days\nManual interventions: ${overrides}\n\n3. COMPARATIVE METRICS\nWater: ${waterText}\nEnergy: ${energyText}\n\n4. FIELD NOTES\n${notes}\n\n5. VALIDATION CHECKLIST\n- Compare similar crop, crop stage, area, weather and irrigation methods.\n- Measure water volume and energy with documented methods and meter accuracy.\n- Record sensor calibration, probe placement/depth and missing or faulty readings.\n- Log pump runtime, flow, rain, manual overrides and alerts.\n- Document trial dates, exclusions and abnormal conditions.\n\n6. LIMITATIONS AND SAFETY\nFieldPulse is an educational browser simulation. It does not read live sensors or control a pump. Calculations reflect entered assumptions and do not prove a cause or guarantee savings. Real hardware requires electrical design review, pump-rated isolated switching, dry-run and overcurrent protections, a safe default-off state and supervised testing.\n`;
    const metric = (change, zeroBase) => change === null ? 'N/A' : `${change > 0 ? '+' : ''}${fmt(change, 1)}%`;
    $('#reportMetrics').innerHTML = `<div><small>WATER CHANGE</small><strong class="${waterDiff >= 0 ? 'metric-good' : 'metric-bad'}">${metric(waterChange)}</strong><span>${waterDiff >= 0 ? 'Lower entered water' : 'Higher entered water'}</span></div><div><small>ENERGY CHANGE</small><strong class="${energyDiff >= 0 ? 'metric-good' : 'metric-bad'}">${metric(energyChange)}</strong><span>${energyDiff >= 0 ? 'Lower entered energy' : 'Higher entered energy'}</span></div><div><small>TRIAL PERIOD</small><strong>${days} days</strong><span>${overrides} interventions</span></div>`;
    $('#reportPreview').innerHTML = `<div class="report-section"><span class="panel-eyebrow">GENERATED ${escapeHTML(generated)}</span><h3>Field performance comparison</h3><p><strong>Water:</strong> ${escapeHTML(waterText)}</p><p><strong>Energy:</strong> ${escapeHTML(energyText)}</p></div><div class="report-section"><h3>Entered field notes</h3><p>${escapeHTML(notes)}</p></div><div class="report-validation"><strong>Validation checklist</strong><ul><li>Compare like-for-like periods, crop stages, area and weather.</li><li>Use metered water and energy data with a documented method.</li><li>Record calibration, probe placement, runtime, flow and overrides.</li><li>Keep trial dates, exclusions and abnormal conditions.</li></ul></div><p class="report-disclaimer">Descriptive comparison only. These entered values do not establish causality, guaranteed savings or agronomic outcomes.</p>`;
    ['downloadReport', 'downloadReportCsv', 'printReport'].forEach(id => $(`#${id}`).disabled = false);
    toast('Report generated from the current inputs');
  });
  $('#downloadReport').addEventListener('click', () => { if (latestReportText) downloadText('fieldpulse-field-performance-report.txt', latestReportText); });
  $('#downloadReportCsv').addEventListener('click', () => { if (latestReportCsv) downloadText('fieldpulse-report-metrics.csv', latestReportCsv, 'text/csv;charset=utf-8'); });
  $('#printReport').addEventListener('click', () => {
    if (!latestReportText) return;
    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) return toast('Allow pop-ups to print the report, or download the TXT version');
    const safe = escapeHTML(latestReportText);
    win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FieldPulse Field Report</title><style>body{font:14px/1.65 Arial,sans-serif;color:#18221b;padding:34px;max-width:850px;margin:auto}h1{font-size:23px;color:#315a31}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}.print{padding:9px 13px;background:#315a31;color:white;border:0;border-radius:6px;cursor:pointer}@media print{.print{display:none}body{padding:0}}</style></head><body><button class="print" onclick="window.print()">Print / Save as PDF</button><h1>FieldPulse field performance comparison</h1><pre>${safe}</pre></body></html>`);
    win.document.close();
  });

  // ---------------------------------------------------------------------------
  // Step-by-step guided tour: each step switches to the relevant workspace.
  // ---------------------------------------------------------------------------
  const tourSteps = [
    { page: 'dashboard', area: 'OVERVIEW', title: 'Start at the dashboard', text: 'This is the home screen for the FieldPulse workspaces.', tip: 'Each card opens a separate area. The full website is not one long page.', how: 'Use the top navigation or choose a workspace card.', target: '.hero-grid' },
    { page: 'irrigation', area: 'IRRIGATION LAB', title: 'Test a field scenario', text: 'The simulator lets you change moisture, temperature, crop demo profile and safety inputs.', tip: 'Try low moisture, then switch on rain or set water unavailable to see the interlocks.', how: 'Change inputs and press Recalculate decision. Read the reason and event log.', target: '#simulatorControls' },
    { page: 'ai-studio', area: 'AI STUDIO', title: 'Explore explainable helpers', text: 'The Farm Copilot, Crop Scout and Sensor Detective create checklists from information you enter.', tip: 'These are local rule-based tools, not connected trained AI systems or crop diagnosis services.', how: 'Choose a tab, enter observations and generate a review brief.', target: '.tool-tabs' },
    { page: 'tools', area: 'FARM TOOLS', title: 'Use the calculators', text: 'The calculator library converts your own assumptions into water, seed, energy and planning estimates.', tip: 'Read “What this tool means” before using a result. Several values require local soil or equipment data.', how: 'Open a calculator, change its inputs and run the calculation.', target: '#calculatorGrid' },
    { page: 'records', area: 'FIELD NOTEBOOK', title: 'Save your field observations', text: 'The notebook stores field notes in browser storage on this device.', tip: 'There is no cloud sync. Export CSV or JSON backups regularly.', how: 'Add a date, field, record type and note, then save.', target: '#recordForm' },
    { page: 'reports', area: 'REPORTS CENTRE', title: 'Build a comparison report', text: 'Compare measured baseline and prototype totals and download a structured report.', tip: 'Use comparable periods and verified measurements. A comparison does not prove what caused a difference.', how: 'Enter totals, trial duration and notes, then generate the report.', target: '#reportForm' },
    { page: 'learn', area: 'LEARN', title: 'Understand the system and safety', text: 'Read the simple feature explanations, architecture path and staged build plan.', tip: 'A real pump installation needs engineering review and independent safety protections.', how: 'Review the diagram and FAQ before planning hardware.', target: '.architecture-line' },
    { page: 'team', area: 'TEAM', title: 'Meet the project team', text: 'The team page shows the project identity and contributor links.', tip: 'Keep public profile details current and verified before publishing.', how: 'Use the navigation to return to any workspace.', target: '.team-grid' }
  ];
  let tourIndex = 0;
  let tourTarget = null;
  function renderTour() {
    const step = tourSteps[tourIndex];
    $('#tourCount').textContent = `${String(tourIndex + 1).padStart(2, '0')} / ${String(tourSteps.length).padStart(2, '0')}`;
    $('#tourArea').textContent = step.area;
    $('#tourTitle').textContent = step.title;
    $('#tourText').textContent = step.text;
    $('#tourTip').textContent = step.tip;
    $('#tourHow').textContent = step.how;
    $('#tourProgress').style.width = `${(tourIndex + 1) / tourSteps.length * 100}%`;
    $('#tourPrev').disabled = tourIndex === 0;
    $('#tourNext').textContent = tourIndex === tourSteps.length - 1 ? 'Finish ✓' : 'Next →';
    if (tourTarget) tourTarget.classList.remove('tour-highlight');
    tourTarget = $(step.target, $(`.page[data-view="${step.page}"]`));
    if (tourTarget) {
      tourTarget.classList.add('tour-highlight');
      tourTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  function startTour() {
    tourIndex = 0;
    $('#tourOverlay').classList.add('open');
    $('#tourOverlay').setAttribute('aria-hidden', 'false');
    showPage(tourSteps[tourIndex].page);
    setTimeout(renderTour, 160);
  }
  function finishTour(completed = false) {
    $('#tourOverlay').classList.remove('open');
    $('#tourOverlay').setAttribute('aria-hidden', 'true');
    if (tourTarget) tourTarget.classList.remove('tour-highlight');
    tourTarget = null;
    if (completed) { storage.set('fieldpulse-tour-completed', '1'); toast('Guided tour completed'); }
  }
  function goTour(index) {
    tourIndex = Math.max(0, Math.min(tourSteps.length - 1, index));
    const page = tourSteps[tourIndex].page;
    if (currentRoute() !== page) showPage(page);
    setTimeout(renderTour, 120);
  }
  $('#tourButton').addEventListener('click', startTour);
  $('#tourNext').addEventListener('click', () => tourIndex === tourSteps.length - 1 ? finishTour(true) : goTour(tourIndex + 1));
  $('#tourPrev').addEventListener('click', () => goTour(tourIndex - 1));
  $('#tourSkip').addEventListener('click', () => finishTour(false));
  $('#tourClose').addEventListener('click', () => finishTour(false));

  // Keyboard shortcuts: never intercept keystrokes while a user is typing.
  addEventListener('keydown', event => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (event.key === 'Escape') {
      closeOverlay('searchOverlay'); closeOverlay('shortcutsOverlay'); finishTour(false);
      $('#mainNav').classList.remove('open'); $('#mobileMenu').setAttribute('aria-expanded', 'false');
    }
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '/') { event.preventDefault(); openSearch(); }
    if (event.key.toLowerCase() === 'd') applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true);
    if (event.key.toLowerCase() === 'g') startTour();
  });

  // Friendly first-visit hint without forcing a blocking tour.
  if (!storage.get('fieldpulse-tour-completed')) setTimeout(() => toast('Tip: press G for the guided tour or / to search'), 1400);
})();
