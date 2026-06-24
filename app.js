(() => {
  "use strict";

  const DATA = window.ROUTINE_DATA;
  const STORAGE_KEY = "recomp-studio-v1";
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const calendarDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const shortDate = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long" });
  const dateTime = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const monthTitle = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  const fullDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const defaultState = {
    history: [],
    currentSession: null,
    settings: {
      travelMode: false,
      sound: true,
      vibration: true,
      schedule: { ...DATA.defaultSchedule }
    }
  };

  let state = normalizeState(loadState());
  let currentView = "today";
  let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedCalendarDate = todayKey();
  let timer = {
    remaining: 0,
    duration: 0,
    running: false,
    interval: null,
    endAt: null
  };

  const main = document.getElementById("main-content");
  const title = document.getElementById("page-title");
  const travelPill = document.getElementById("travel-pill");
  const timerPanel = document.getElementById("timer-panel");
  const timerValue = document.getElementById("timer-value");
  const timerPause = document.getElementById("timer-pause");
  const importInput = document.getElementById("import-input");

  saveState();

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return parsed || structuredClone(defaultState);
    } catch {
      return structuredClone(defaultState);
    }
  }

  function normalizeState(raw) {
    const normalized = {
      ...structuredClone(defaultState),
      ...(raw || {}),
      settings: {
        ...structuredClone(defaultState.settings),
        ...((raw && raw.settings) || {}),
        schedule: {
          ...DATA.defaultSchedule,
          ...((raw && raw.settings && raw.settings.schedule) || {})
        }
      }
    };

    Object.keys(DATA.defaultSchedule).forEach(day => {
      const savedId = normalized.settings.schedule[day];
      if (savedId !== "rest" && !DATA.routines[savedId]) {
        normalized.settings.schedule[day] = DATA.defaultSchedule[day];
      }
    });

    normalized.history = Array.isArray(normalized.history)
      ? normalized.history.map(normalizeSession)
      : [];

    if (normalized.currentSession) {
      if (!DATA.routines[normalized.currentSession.routineId]) {
        normalized.currentSession = null;
      } else {
        normalized.currentSession = normalizeSession(normalized.currentSession);
      }
    }

    return normalized;
  }

  function normalizeSession(session) {
    const normalized = {
      ...session,
      notes: session?.notes || "",
      exercises: { ...(session?.exercises || {}) }
    };

    Object.entries(normalized.exercises).forEach(([exerciseId, exerciseState]) => {
      normalized.exercises[exerciseId] = {
        ...exerciseState,
        notes: exerciseState?.notes || "",
        sets: Array.isArray(exerciseState?.sets)
          ? exerciseState.sets.map(set => ({
              weight: set?.weight ?? "",
              reps: set?.reps ?? "",
              rir: set?.rir ?? "",
              done: Boolean(set?.done)
            }))
          : []
      };
    });

    return normalized;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function dateFromKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getScheduledItem() {
    return state.settings.schedule[String(new Date().getDay())] || "rest";
  }

  function nextRoutineId() {
    if (!state.history.length) return DATA.cycle[0];
    const latest = [...state.history].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];
    const index = DATA.cycle.indexOf(latest.routineId);
    return DATA.cycle[(index + 1 + DATA.cycle.length) % DATA.cycle.length];
  }

  function completedToday(routineId) {
    return state.history.some(item => item.date === todayKey() && item.routineId === routineId);
  }

  function setView(view) {
    currentView = view;
    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.view === view || (view === "workout" && button.dataset.view === "today")
      );
    });
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    travelPill.classList.toggle("active", state.settings.travelMode);
    if (currentView === "today") renderToday();
    if (currentView === "routines") renderRoutines();
    if (currentView === "calendar") renderCalendar();
    if (currentView === "history") renderHistory();
    if (currentView === "settings") renderSettings();
    if (currentView === "workout") renderWorkout();
  }

  function renderToday() {
    title.textContent = "Today";
    const scheduled = getScheduledItem();
    const nextId = nextRoutineId();
    const inProgress = state.currentSession;

    if (inProgress) {
      const routine = DATA.routines[inProgress.routineId];
      main.innerHTML = `
        <section class="hero-card">
          <p class="kicker">Workout in progress</p>
          <h2 class="hero-title">${escapeHtml(routine.name)}</h2>
          <p class="hero-subtitle">Your progress is saved. You can close the app and return later.</p>
          <div class="hero-meta">
            <span class="chip">${countCompletedSets(inProgress)} of ${countTotalSets(routine)} sets</span>
            <span class="chip">${escapeHtml(routine.focus)}</span>
          </div>
          <button class="primary-btn" id="resume-workout" type="button">Continue workout</button>
        </section>
        ${renderNextRoutineBlock(nextId, "Up next")}
      `;
      document.getElementById("resume-workout").onclick = () => setView("workout");
      wireStartButtons();
      return;
    }

    if (scheduled === "rest") {
      main.innerHTML = `
        <section class="recovery-card">
          <p class="kicker">${escapeHtml(shortDate.format(new Date()))}</p>
          <h2>${escapeHtml(DATA.recovery.title)}</h2>
          <p class="muted">No strength session is scheduled for today.</p>
          <div class="recovery-list">
            ${DATA.recovery.items.map(item => `<div class="recovery-item"><span>✓</span><span>${escapeHtml(item)}</span></div>`).join("")}
          </div>
        </section>
        <div class="section-heading"><h2>Next workout</h2><span>Flexible cycle</span></div>
        ${routinePreview(nextId)}
      `;
      wireStartButtons();
      return;
    }

    const routine = DATA.routines[scheduled];
    const isDone = completedToday(scheduled);
    main.innerHTML = `
      <section class="hero-card">
        <p class="kicker">${escapeHtml(shortDate.format(new Date()))}</p>
        <h2 class="hero-title">${isDone ? "Workout complete" : escapeHtml(routine.name)}</h2>
        <p class="hero-subtitle">${isDone ? `You already logged ${escapeHtml(routine.name)} today.` : escapeHtml(routine.focus)}</p>
        <div class="hero-meta">
          <span class="chip">${routine.exercises.length} exercises</span>
          <span class="chip">≈ ${routine.estimatedMinutes} min</span>
          <span class="chip">${state.settings.travelMode ? "Travel mode" : "Gym mode"}</span>
        </div>
        <button class="primary-btn" data-start="${isDone ? nextId : scheduled}" type="button">
          ${isDone ? `Start ${escapeHtml(DATA.routines[nextId].name)}` : "Start workout"}
        </button>
      </section>
      ${scheduled !== nextId ? renderNextRoutineBlock(nextId, "Next in your cycle") : ""}
    `;
    wireStartButtons();
  }

  function renderNextRoutineBlock(routineId, label) {
    return `
      <div class="section-heading"><h2>${escapeHtml(label)}</h2><span>You can change it</span></div>
      ${routinePreview(routineId)}
    `;
  }

  function routinePreview(id) {
    const routine = DATA.routines[id];
    return `
      <article class="routine-card">
        <div class="routine-card-top">
          <div>
            <p class="kicker">${escapeHtml(routine.focus)}</p>
            <h3>${escapeHtml(routine.name)}</h3>
            <p class="muted small">${routine.exercises.length} exercises · about ${routine.estimatedMinutes} min</p>
          </div>
          <div class="routine-number">${DATA.cycle.indexOf(id) + 1}</div>
        </div>
        <button class="secondary-btn" data-start="${id}" type="button">Choose this workout</button>
      </article>
    `;
  }

  function renderRoutines() {
    title.textContent = "Routines";
    main.innerHTML = `
      <section class="panel">
        <p class="kicker">Current program</p>
        <h2>4 strength sessions</h2>
        <p class="muted">The cycle follows your last completed workout, even when your training days change.</p>
      </section>
      <div class="section-heading"><h2>All workouts</h2><span>${state.settings.travelMode ? "Alternatives on" : "Main program"}</span></div>
      <div class="routine-list">
        ${DATA.cycle.map(id => {
          const routine = DATA.routines[id];
          return `
            <article class="routine-card">
              <div class="routine-card-top">
                <div>
                  <p class="kicker">${escapeHtml(routine.focus)}</p>
                  <h3>${escapeHtml(routine.name)}</h3>
                  <p class="muted small">${routine.exercises.length} exercises · ${routine.estimatedMinutes} min</p>
                </div>
                <div class="routine-number">${DATA.cycle.indexOf(id) + 1}</div>
              </div>
              <div class="routine-meta">
                ${routine.exercises.slice(0, 3).map(exercise => `<span class="chip">${escapeHtml(exercise.name)}</span>`).join("")}
              </div>
              <button class="secondary-btn" data-start="${id}" type="button">Open workout</button>
            </article>
          `;
        }).join("")}
      </div>
    `;
    wireStartButtons();
  }

  function startRoutine(routineId) {
    if (state.currentSession && state.currentSession.routineId !== routineId) {
      const replace = confirm("Another workout is already in progress. Replace it?");
      if (!replace) return;
    }

    if (!state.currentSession || state.currentSession.routineId !== routineId) {
      const routine = DATA.routines[routineId];
      const exercises = {};

      routine.exercises.forEach(exercise => {
        const latest = getLastExercisePerformance(exercise.id);
        exercises[exercise.id] = {
          notes: "",
          sets: Array.from({ length: exercise.sets }, (_, index) => ({
            weight: latest?.sets?.[index]?.weight ?? "",
            reps: "",
            rir: "",
            done: false
          }))
        };
      });

      state.currentSession = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        routineId,
        date: todayKey(),
        startedAt: Date.now(),
        notes: "",
        exercises
      };
      saveState();
    }

    setView("workout");
  }

  function renderWorkout() {
    if (!state.currentSession) {
      setView("today");
      return;
    }

    const session = state.currentSession;
    const routine = DATA.routines[session.routineId];
    const done = countCompletedSets(session);
    const total = countTotalSets(routine);
    const percentage = total ? Math.round((done / total) * 100) : 0;
    title.textContent = routine.name;

    main.innerHTML = `
      <section class="workout-header">
        <button class="back-btn" id="back-today" type="button">← Back to Today</button>
        <p class="kicker">${escapeHtml(routine.focus)}</p>
        <div class="progress-wrap">
          <div class="progress-info"><span>${done} of ${total} sets</span><span>${percentage}%</span></div>
          <div class="progress-track"><div class="progress-bar" style="width:${percentage}%"></div></div>
        </div>
      </section>

      <div class="exercise-list">
        ${routine.exercises.map((exercise, index) => exerciseCard(exercise, index, session)).join("")}
      </div>

      <section class="panel finish-wrap">
        <label for="session-notes"><strong>Workout notes</strong></label>
        <textarea id="session-notes" class="note-input" placeholder="Energy, overall performance, discomfort, or anything to remember…">${escapeHtml(session.notes || "")}</textarea>
        <div class="divider"></div>
        <button class="primary-btn" id="finish-workout" type="button">Finish and save</button>
        <button class="danger-btn" id="cancel-workout" type="button" style="margin-top:10px">Discard workout</button>
      </section>
    `;

    document.getElementById("back-today").onclick = () => setView("today");
    document.getElementById("session-notes").oninput = event => {
      state.currentSession.notes = event.target.value;
      saveState();
    };
    document.getElementById("finish-workout").onclick = finishWorkout;
    document.getElementById("cancel-workout").onclick = cancelWorkout;
    wireSetControls();
  }

  function exerciseCard(exercise, index, session) {
    const exerciseState = session.exercises[exercise.id];
    const complete = exerciseState.sets.every(set => set.done);
    const last = getLastExercisePerformance(exercise.id);
    const chosenName = state.settings.travelMode
      ? exercise.travel
      : `${exercise.name} (${exercise.equipment})`;
    const suggestion = progressionSuggestion(exercise, last);

    return `
      <article class="exercise-card ${complete ? "complete" : ""}" data-exercise="${exercise.id}">
        <div class="exercise-top">
          <div class="exercise-index">${index + 1}</div>
          <div class="exercise-heading">
            <h3>${escapeHtml(chosenName)}</h3>
            <p class="exercise-detail">${exercise.sets} sets · ${escapeHtml(exercise.reps)} reps · rest ${formatTime(exercise.rest)}</p>
            ${exercise.group ? `<span class="superset-badge">${escapeHtml(exercise.group)}</span>` : ""}
            ${state.settings.travelMode ? `<span class="travel-badge">Replaces: ${escapeHtml(exercise.name)}</span>` : ""}
          </div>
        </div>

        ${lastPerformanceBlock(last)}
        ${suggestion ? `<p class="suggestion">↗ ${escapeHtml(suggestion)}</p>` : ""}

        <div class="set-table">
          <div class="set-table-header" aria-hidden="true">
            <span>Set</span><span>Kg</span><span>Reps</span><span>RIR</span><span></span>
          </div>
          ${exerciseState.sets.map((set, setIndex) => `
            <div class="set-row">
              <span class="set-number">${setIndex + 1}</span>

              <label class="field-wrap">
                <input inputmode="decimal" type="number" min="0" step="0.5"
                  aria-label="Weight for set ${setIndex + 1}"
                  value="${escapeHtml(set.weight)}"
                  placeholder="—"
                  data-field="weight" data-exercise="${exercise.id}" data-set="${setIndex}">
              </label>

              <label class="field-wrap">
                <input inputmode="numeric" type="number" min="0" step="1"
                  aria-label="Repetitions for set ${setIndex + 1}"
                  value="${escapeHtml(set.reps)}"
                  placeholder="—"
                  data-field="reps" data-exercise="${exercise.id}" data-set="${setIndex}">
              </label>

              <label class="field-wrap">
                <input inputmode="numeric" type="number" min="0" max="10" step="1"
                  aria-label="RIR for set ${setIndex + 1}"
                  value="${escapeHtml(set.rir)}"
                  placeholder="—"
                  data-field="rir" data-exercise="${exercise.id}" data-set="${setIndex}">
              </label>

              <button class="set-toggle ${set.done ? "done" : ""}"
                data-toggle-set data-exercise="${exercise.id}" data-set="${setIndex}" data-rest="${exercise.rest}"
                type="button" aria-label="Mark set ${setIndex + 1} complete">
                ${set.done ? "✓" : "○"}
              </button>
            </div>
          `).join("")}
        </div>

        <label class="exercise-note-label" for="note-${exercise.id}">Exercise note</label>
        <textarea
          id="note-${exercise.id}"
          class="exercise-note-input"
          data-exercise-note="${exercise.id}"
          placeholder="Setup, technique cue, discomfort, machine setting, or anything to remember next time…"
        >${escapeHtml(exerciseState.notes || "")}</textarea>
      </article>
    `;
  }

  function lastPerformanceBlock(last) {
    if (!last) {
      return `<div class="last-performance"><strong>Last time:</strong> No previous record.</div>`;
    }

    const dateLabel = last.completedAt
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(last.completedAt))
      : "";

    return `
      <div class="last-performance">
        <div class="last-performance-title">
          <strong>Last time${dateLabel ? ` · ${escapeHtml(dateLabel)}` : ""}</strong>
        </div>
        <div class="last-set-list">${formatPreviousSets(last.sets)}</div>
        ${last.notes ? `<div class="last-exercise-note"><strong>Note:</strong> ${escapeHtml(last.notes)}</div>` : ""}
      </div>
    `;
  }

  function formatPreviousSets(sets) {
    const completed = (sets || []).filter(set => set.done || set.weight || set.reps || set.rir);
    if (!completed.length) return `<span class="muted">No set details.</span>`;

    return completed.map((set, index) => `
      <span class="last-set-pill">
        ${index + 1}: ${escapeHtml(set.weight || "—")} kg · ${escapeHtml(set.reps || "—")} reps · RIR ${escapeHtml(set.rir === "" || set.rir == null ? "—" : set.rir)}
      </span>
    `).join("");
  }

  function wireSetControls() {
    main.querySelectorAll("input[data-field]").forEach(input => {
      input.addEventListener("input", event => {
        const { exercise, set, field } = event.target.dataset;
        state.currentSession.exercises[exercise].sets[Number(set)][field] = event.target.value;
        saveState();
      });
    });

    main.querySelectorAll("[data-exercise-note]").forEach(textarea => {
      textarea.addEventListener("input", event => {
        const exerciseId = event.target.dataset.exerciseNote;
        state.currentSession.exercises[exerciseId].notes = event.target.value;
        saveState();
      });
    });

    main.querySelectorAll("[data-toggle-set]").forEach(button => {
      button.addEventListener("click", event => {
        const { exercise, set, rest } = event.currentTarget.dataset;
        const item = state.currentSession.exercises[exercise].sets[Number(set)];
        item.done = !item.done;
        saveState();
        if (item.done) startTimer(Number(rest));
        renderWorkout();
      });
    });
  }

  function countCompletedSets(session) {
    return Object.values(session.exercises || {}).reduce(
      (total, exercise) => total + (exercise.sets || []).filter(set => set.done).length,
      0
    );
  }

  function countTotalSets(routine) {
    return routine.exercises.reduce((total, exercise) => total + exercise.sets, 0);
  }

  function finishWorkout() {
    const session = state.currentSession;
    const routine = DATA.routines[session.routineId];
    const done = countCompletedSets(session);
    const total = countTotalSets(routine);

    if (done < total && !confirm(`You completed ${done} of ${total} sets. Save the workout anyway?`)) return;

    state.history.push({
      ...session,
      completedAt: Date.now(),
      durationSeconds: Math.max(60, Math.round((Date.now() - session.startedAt) / 1000))
    });
    state.currentSession = null;
    saveState();
    stopTimer();
    showToast("Workout saved");
    selectedCalendarDate = session.date;
    setView("calendar");
  }

  function cancelWorkout() {
    if (!confirm("Discard this workout and all of its progress?")) return;
    state.currentSession = null;
    saveState();
    stopTimer();
    setView("today");
  }

  function getLastExercisePerformance(exerciseId) {
    const sessions = [...state.history].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

    for (const session of sessions) {
      if (session.exercises?.[exerciseId]) {
        return {
          ...session.exercises[exerciseId],
          completedAt: session.completedAt,
          date: session.date,
          routineId: session.routineId
        };
      }
    }

    return null;
  }

  function progressionSuggestion(exercise, last) {
    if (!last?.sets?.length) return "";

    const valid = last.sets.filter(set => set.done && Number(set.reps) > 0);
    if (valid.length !== exercise.sets) return "";

    const reachedTop = valid.every(set => Number(set.reps) >= exercise.targetMax);
    const recordedRir = valid.filter(set => set.rir !== "" && set.rir != null);
    const effortAllowsProgression = !recordedRir.length || recordedRir.every(set => Number(set.rir) >= 1);

    if (!reachedTop || !effortAllowsProgression) return "";

    return "You reached the top of the rep range on every set. If your technique was solid, consider a small weight increase.";
  }

  function renderCalendar() {
    title.textContent = "Calendar";

    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const monthSessions = state.history.filter(item => {
      const date = dateFromKey(item.date || dateKey(new Date(item.completedAt)));
      return date.getFullYear() === year && date.getMonth() === month;
    });
    const totalMinutes = Math.round(monthSessions.reduce((sum, item) => sum + (item.durationSeconds || 0), 0) / 60);
    const selectedSessions = sessionsForDate(selectedCalendarDate);

    main.innerHTML = `
      <section class="calendar-card">
        <div class="calendar-toolbar">
          <button class="calendar-arrow" id="calendar-prev" type="button" aria-label="Previous month">←</button>
          <div>
            <p class="kicker">Training calendar</p>
            <h2>${escapeHtml(monthTitle.format(calendarCursor))}</h2>
          </div>
          <button class="calendar-arrow" id="calendar-next" type="button" aria-label="Next month">→</button>
        </div>

        <div class="calendar-summary">
          <span class="chip">${monthSessions.length} workouts</span>
          <span class="chip">${totalMinutes} minutes</span>
        </div>

        <div class="calendar-weekdays">
          ${calendarDayNames.map(day => `<span>${day}</span>`).join("")}
        </div>

        <div class="calendar-grid">
          ${calendarDaysHtml(year, month)}
        </div>
      </section>

      <div class="section-heading">
        <h2>${escapeHtml(fullDate.format(dateFromKey(selectedCalendarDate)))}</h2>
        <span>${selectedSessions.length ? `${selectedSessions.length} logged` : "No workout"}</span>
      </div>

      <div class="calendar-detail-list">
        ${selectedSessions.length
          ? selectedSessions
              .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
              .map(calendarSessionCard)
              .join("")
          : `<div class="empty-state">No workout was logged on this day.</div>`}
      </div>
    `;

    document.getElementById("calendar-prev").onclick = () => moveCalendar(-1);
    document.getElementById("calendar-next").onclick = () => moveCalendar(1);

    main.querySelectorAll("[data-calendar-date]").forEach(button => {
      button.addEventListener("click", () => {
        selectedCalendarDate = button.dataset.calendarDate;
        renderCalendar();
      });
    });
  }

  function moveCalendar(direction) {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + direction, 1);
    const today = new Date();
    const isCurrentMonth =
      calendarCursor.getFullYear() === today.getFullYear() &&
      calendarCursor.getMonth() === today.getMonth();

    selectedCalendarDate = isCurrentMonth
      ? todayKey()
      : dateKey(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1));

    renderCalendar();
  }

  function calendarDaysHtml(year, month) {
    const firstDay = new Date(year, month, 1);
    const numberOfDays = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const cells = [];

    for (let index = 0; index < mondayOffset; index += 1) {
      cells.push(`<span class="calendar-day calendar-day-empty" aria-hidden="true"></span>`);
    }

    for (let day = 1; day <= numberOfDays; day += 1) {
      const key = dateKey(new Date(year, month, day));
      const sessions = sessionsForDate(key);
      const selected = key === selectedCalendarDate;
      const today = key === todayKey();
      const firstRoutine = sessions.length ? DATA.routines[sessions[0].routineId] : null;

      cells.push(`
        <button
          class="calendar-day ${sessions.length ? "has-workout" : ""} ${selected ? "selected" : ""} ${today ? "today" : ""}"
          data-calendar-date="${key}"
          type="button"
          aria-label="${escapeHtml(fullDate.format(dateFromKey(key)))}${sessions.length ? `, ${sessions.length} workout` : ""}"
        >
          <span class="calendar-date-number">${day}</span>
          ${firstRoutine ? `<span class="calendar-workout-label">${escapeHtml(firstRoutine.shortName || firstRoutine.name)}</span>` : ""}
          ${sessions.length > 1 ? `<span class="calendar-more">+${sessions.length - 1}</span>` : ""}
        </button>
      `);
    }

    return cells.join("");
  }

  function sessionsForDate(key) {
    return state.history.filter(item => item.date === key);
  }

  function calendarSessionCard(item) {
    const routine = DATA.routines[item.routineId];
    const minutes = Math.max(1, Math.round((item.durationSeconds || 0) / 60));

    return `
      <article class="calendar-session-card">
        <div class="calendar-session-head">
          <div>
            <p class="kicker">${escapeHtml(routine?.focus || "Workout")}</p>
            <h3>${escapeHtml(routine?.name || "Workout")}</h3>
          </div>
          <span class="chip">${minutes} min</span>
        </div>

        <div class="calendar-exercise-list">
          ${(routine?.exercises || []).map(exercise => {
            const exerciseState = item.exercises?.[exercise.id];
            if (!exerciseState) return "";
            return `
              <div class="calendar-exercise">
                <strong>${escapeHtml(exercise.name)}</strong>
                <div class="calendar-set-summary">${formatPreviousSets(exerciseState.sets)}</div>
                ${exerciseState.notes ? `<p class="calendar-note"><strong>Note:</strong> ${escapeHtml(exerciseState.notes)}</p>` : ""}
              </div>
            `;
          }).join("")}
        </div>

        ${item.notes ? `<p class="session-note"><strong>Workout note:</strong> ${escapeHtml(item.notes)}</p>` : ""}
      </article>
    `;
  }

  function renderHistory() {
    title.textContent = "History";
    const sorted = [...state.history].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    const completedThisWeek = getThisWeekCount();
    const totalMinutes = Math.round(state.history.reduce((sum, item) => sum + (item.durationSeconds || 0), 0) / 60);

    main.innerHTML = `
      <section class="hero-card">
        <p class="kicker">Your progress</p>
        <h2 class="hero-title">${state.history.length} sessions</h2>
        <div class="hero-meta">
          <span class="chip">${completedThisWeek} this week</span>
          <span class="chip">${totalMinutes} minutes logged</span>
        </div>
      </section>

      <div class="section-heading"><h2>Recent workouts</h2><span>Newest first</span></div>
      <div class="history-list">
        ${sorted.length
          ? sorted.map(historyCard).join("")
          : `<div class="empty-state">You have not saved any workouts yet.</div>`}
      </div>
    `;
  }

  function historyCard(item) {
    const routine = DATA.routines[item.routineId];
    const totalSets = Object.values(item.exercises || {}).reduce(
      (sum, exercise) => sum + (exercise.sets || []).filter(set => set.done).length,
      0
    );
    const minutes = Math.max(1, Math.round((item.durationSeconds || 0) / 60));
    const maxWeight = getSessionMaxWeight(item);

    return `
      <article class="history-card">
        <div class="history-card-top">
          <div>
            <p class="kicker">${escapeHtml(dateTime.format(new Date(item.completedAt || dateFromKey(item.date))))}</p>
            <h3>${escapeHtml(routine?.name || "Workout")}</h3>
            <p class="muted small">${escapeHtml(routine?.focus || "")}</p>
          </div>
          <div class="routine-number">✓</div>
        </div>

        <div class="history-meta">
          <span class="chip">${totalSets} sets</span>
          <span class="chip">${minutes} min</span>
          ${maxWeight ? `<span class="chip">Max ${maxWeight} kg</span>` : ""}
        </div>

        ${item.notes ? `<p class="last-performance">${escapeHtml(item.notes)}</p>` : ""}
      </article>
    `;
  }

  function getSessionMaxWeight(item) {
    let max = 0;
    Object.values(item.exercises || {}).forEach(exercise => {
      (exercise.sets || []).forEach(set => {
        max = Math.max(max, Number(set.weight) || 0);
      });
    });
    return max;
  }

  function getThisWeekCount() {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - day + 1);
    return state.history.filter(item => (item.completedAt || 0) >= monday.getTime()).length;
  }

  function renderSettings() {
    title.textContent = "Settings";
    const routineOptions = [
      `<option value="rest">Rest</option>`,
      ...DATA.cycle.map(id => `<option value="${id}">${escapeHtml(DATA.routines[id].name)}</option>`)
    ].join("");

    main.innerHTML = `
      <section class="panel">
        <p class="kicker">Experience</p>
        ${settingToggle("travel-setting", "Travel mode", "Show dumbbell, band, or bodyweight alternatives.", state.settings.travelMode)}
        ${settingToggle("sound-setting", "Timer sound", "Play a short sound when your rest period ends.", state.settings.sound)}
        ${settingToggle("vibration-setting", "Vibration", "Vibrate when the browser and device allow it.", state.settings.vibration)}
      </section>

      <div class="section-heading"><h2>Weekly schedule</h2><span>Editable</span></div>
      <section class="panel">
        <p class="muted small">This controls the suggestion on Today. “Next workout” always follows your actual completed cycle.</p>
        <div class="schedule-grid">
          ${dayNames.map((day, index) => `
            <label class="schedule-row">
              <span>${day}</span>
              <select data-schedule-day="${index}">
                ${routineOptions}
              </select>
            </label>
          `).join("")}
        </div>
      </section>

      <div class="section-heading"><h2>Data</h2><span>Stored on this device</span></div>
      <section class="panel">
        <div class="inline-actions">
          <button class="secondary-btn" id="export-data" type="button">Export JSON</button>
          <button class="secondary-btn" id="import-data" type="button">Import</button>
        </div>
        <button class="danger-btn" id="clear-data" type="button" style="margin-top:10px">Delete all workout data</button>
      </section>

      <section class="panel" style="margin-top:14px">
        <p class="kicker">Version 2.0</p>
        <p class="muted small">English interface · calendar · RIR tracking · exercise notes carried into “Last time”.</p>
      </section>
    `;

    document.getElementById("travel-setting").onchange = event => updateSetting("travelMode", event.target.checked);
    document.getElementById("sound-setting").onchange = event => updateSetting("sound", event.target.checked);
    document.getElementById("vibration-setting").onchange = event => updateSetting("vibration", event.target.checked);

    main.querySelectorAll("[data-schedule-day]").forEach(select => {
      const day = select.dataset.scheduleDay;
      select.value = state.settings.schedule[day] || "rest";
      select.onchange = event => {
        state.settings.schedule[day] = event.target.value;
        saveState();
        showToast("Schedule updated");
      };
    });

    document.getElementById("export-data").onclick = exportData;
    document.getElementById("import-data").onclick = () => importInput.click();
    document.getElementById("clear-data").onclick = clearData;
  }

  function settingToggle(id, label, detail, checked) {
    return `
      <div class="setting-row">
        <div>
          <strong>${escapeHtml(label)}</strong>
          <p class="muted small" style="margin:4px 0 0">${escapeHtml(detail)}</p>
        </div>
        <label class="switch">
          <input id="${id}" type="checkbox" ${checked ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>
    `;
  }

  function updateSetting(key, value) {
    state.settings[key] = value;
    saveState();
    render();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recomp-studio-backup-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importInput.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.history) || !parsed.settings) throw new Error("Invalid format");
      state = normalizeState(parsed);
      saveState();
      showToast("Data imported");
      render();
    } catch {
      alert("The file could not be imported. Make sure it is a backup created by this app.");
    } finally {
      event.target.value = "";
    }
  });

  function clearData() {
    if (!confirm("Delete your history and current workout? This cannot be undone.")) return;
    const keepSettings = structuredClone(state.settings);
    state = structuredClone(defaultState);
    state.settings = keepSettings;
    saveState();
    stopTimer();
    showToast("Workout data deleted");
    render();
  }

  function wireStartButtons() {
    main.querySelectorAll("[data-start]").forEach(button => {
      button.addEventListener("click", () => startRoutine(button.dataset.start));
    });
  }

  function startTimer(seconds) {
    clearInterval(timer.interval);
    timer.duration = seconds;
    timer.remaining = seconds;
    timer.running = true;
    timer.endAt = Date.now() + seconds * 1000;
    timerPanel.classList.remove("hidden");
    timerPause.textContent = "Pause";
    updateTimerUI();
    timer.interval = setInterval(tickTimer, 250);
  }

  function tickTimer() {
    if (!timer.running) return;
    timer.remaining = Math.max(0, (timer.endAt - Date.now()) / 1000);
    updateTimerUI();
    if (timer.remaining <= 0) completeTimer();
  }

  function updateTimerUI() {
    timerValue.textContent = formatTime(timer.remaining);
    timerPanel.classList.toggle("urgent", timer.remaining <= 10 && timer.remaining > 0);
  }

  function completeTimer() {
    clearInterval(timer.interval);
    timer.running = false;
    timer.remaining = 0;
    updateTimerUI();

    if (state.settings.vibration && navigator.vibrate) {
      navigator.vibrate([180, 90, 180]);
    }
    if (state.settings.sound) playBeep();

    setTimeout(() => timerPanel.classList.add("hidden"), 2200);
  }

  function stopTimer() {
    clearInterval(timer.interval);
    timer = { remaining: 0, duration: 0, running: false, interval: null, endAt: null };
    timerPanel.classList.add("hidden");
  }

  function playBeep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.26);
    } catch {}
  }

  timerPause.onclick = () => {
    if (timer.running) {
      timer.remaining = Math.max(0, (timer.endAt - Date.now()) / 1000);
      timer.running = false;
      timerPause.textContent = "Resume";
    } else {
      timer.running = true;
      timer.endAt = Date.now() + timer.remaining * 1000;
      timerPause.textContent = "Pause";
    }
  };

  document.getElementById("timer-add").onclick = () => {
    timer.remaining += 15;
    if (timer.running) timer.endAt = Date.now() + timer.remaining * 1000;
    updateTimerUI();
  };

  document.getElementById("timer-skip").onclick = stopTimer;

  travelPill.onclick = () => {
    state.settings.travelMode = !state.settings.travelMode;
    saveState();
    render();
  };

  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  function showToast(message) {
    document.querySelector(".toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  render();
})();
