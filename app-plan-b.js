const DATA = window.DINGADING_DATA;
const STORAGE_KEY = "dingading-local-prelim-evaluation-v1";
const AUTH_STORAGE_KEY = "dingading-local-prelim-auth-v1";
const AUTH_PASSWORD = "PEARLSEED";

let store = loadStore();
let appStarted = false;
let ui = {
  screen: "regions",
  regionId: null,
  roleFilter: "all",
  query: "",
  openQuestion: "",
  collapsedAreas: {},
  viewMode: "questions",
  participantId: null,
  manualTarget: null,
  pendingExport: null
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.prototype.slice.call(parent.querySelectorAll(selector));

installSafariCompat();
installLocalIconRuntime();

function installSafariCompat() {
  if (!Element.prototype.matches) {
    Element.prototype.matches =
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      function matches(selector) {
        const nodes = (this.document || this.ownerDocument).querySelectorAll(selector);
        let index = nodes.length;
        while (--index >= 0 && nodes.item(index) !== this) {}
        return index > -1;
      };
  }

  if (!Element.prototype.closest) {
    Element.prototype.closest = function closest(selector) {
      let node = this;
      while (node && node.nodeType === 1) {
        if (node.matches(selector)) return node;
        node = node.parentElement || node.parentNode;
      }
      return null;
    };
  }

  if (!String.prototype.includes) {
    String.prototype.includes = function includes(search, start) {
      return this.indexOf(search, start || 0) !== -1;
    };
  }

  if (!Array.prototype.includes) {
    Array.prototype.includes = function includes(search, start) {
      return this.indexOf(search, start || 0) !== -1;
    };
  }

  if (!Array.prototype.find) {
    Array.prototype.find = function find(predicate, thisArg) {
      if (this == null) throw new TypeError("Array.prototype.find called on null or undefined");
      if (typeof predicate !== "function") throw new TypeError("predicate must be a function");
      const list = Object(this);
      const length = list.length >>> 0;
      for (let index = 0; index < length; index += 1) {
        const value = list[index];
        if (predicate.call(thisArg, value, index, list)) return value;
      }
      return undefined;
    };
  }

  if (typeof Object.assign !== "function") {
    Object.assign = function assign(target) {
      if (target == null) throw new TypeError("Cannot convert undefined or null to object");
      const output = Object(target);
      for (let sourceIndex = 1; sourceIndex < arguments.length; sourceIndex += 1) {
        const source = arguments[sourceIndex];
        if (source == null) continue;
        Object.keys(Object(source)).forEach((key) => {
          output[key] = source[key];
        });
      }
      return output;
    };
  }
}

function installLocalIconRuntime() {
  if (window.lucide) return;

  const icons = {
    table: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    "chevron-left": '<path d="M15 18l-6-6 6-6"/>',
    "chevron-down": '<path d="M6 9l6 6 6-6"/>',
    "chevron-up": '<path d="M18 15l-6-6-6 6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    "check-check": '<path d="M18 6L7 17l-5-5"/><path d="M22 10l-7.5 7.5L13 16"/>'
  };

  window.lucide = {
    createIcons() {
      $$("[data-lucide]").forEach((node) => {
        const body = icons[node.getAttribute("data-lucide")];
        if (!body) return;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML = body;
        if (node.parentNode) node.parentNode.replaceChild(svg, node);
      });
    }
  };
}

function init() {
  installAuthGate();
}

function installAuthGate() {
  const gate = $("#auth-gate");
  const form = $("#auth-form");
  const input = $("#auth-password");
  if (!gate || !form || !input) {
    startApp();
    return;
  }

  if (hasAuthPass()) {
    unlockApp();
    return;
  }

  document.body.classList.add("is-auth-locked");
  form.addEventListener("submit", handleAuthSubmit);
  window.setTimeout(() => input.focus(), 120);
}

function hasAuthPass() {
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === "passed";
  } catch (error) {
    return false;
  }
}

function rememberAuthPass() {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, "passed");
  } catch (error) {
    // Private browsing can block storage. The current page session still opens.
  }
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const input = $("#auth-password");
  const feedback = $("#auth-feedback");
  const password = String(input.value || "").trim();

  if (password.toUpperCase() === AUTH_PASSWORD) {
    rememberAuthPass();
    unlockApp();
    return;
  }

  if (feedback) feedback.textContent = "비밀번호를 다시 확인해주세요.";
  input.value = "";
  input.focus();
}

function unlockApp() {
  const gate = $("#auth-gate");
  document.body.classList.remove("is-auth-locked");
  if (gate) gate.hidden = true;
  startApp();
}

function startApp() {
  if (appStarted) return;
  appStarted = true;
  $("#region-grid").addEventListener("click", handleRegionClick);
  $("#back-to-regions").addEventListener("click", showRegions);
  $("#question-search").addEventListener("input", (event) => {
    ui.query = event.target.value;
    renderQuestionScreen();
  });
  $$(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      ui.roleFilter = button.dataset.questionRoleFilter;
      ui.openQuestion = "";
      $$(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
      renderQuestionScreen();
    });
  });
  $("#question-list").addEventListener("click", handleQuestionClick);
  $("#question-list").addEventListener("input", handleQuestionInput);
  $("#team-manager").addEventListener("click", handleTeamClick);
  $("#team-manager").addEventListener("keydown", handleTeamKeydown);
  $("#show-participants").addEventListener("click", handleParticipantViewToggle);
  $("#participant-browser").addEventListener("click", handleParticipantBrowserClick);
  $("#participant-report").addEventListener("click", handleParticipantReportClick);
  $("#manual-score-form").addEventListener("submit", handleManualScoreSubmit);
  $("#manual-score-form").addEventListener("click", handleManualScoreClick);
  $("#manual-score-input").addEventListener("input", updateManualScorePresetState);
  $("#manual-score-cancel").addEventListener("click", closeManualScoreModal);
  $("#manual-score-modal").addEventListener("click", (event) => {
    if (event.target.id === "manual-score-modal") closeManualScoreModal();
  });
  $("#export-json").addEventListener("click", () => openEvaluatorModal("json"));
  $("#export-xlsx").addEventListener("click", () => openEvaluatorModal("xlsx"));
  $("#import-json").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", importJson);
  $("#evaluator-form").addEventListener("submit", handleEvaluatorSubmit);
  $("#evaluator-cancel").addEventListener("click", closeEvaluatorModal);
  $("#evaluator-modal").addEventListener("click", (event) => {
    if (event.target.id === "evaluator-modal") closeEvaluatorModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#manual-score-modal").hidden) {
      closeManualScoreModal();
      return;
    }
    if (event.key === "Escape" && !$("#evaluator-modal").hidden) closeEvaluatorModal();
  });

  renderRegions();
  hydrateIcons();
}

function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      evaluations: parsed.evaluations || {},
      teams: parsed.teams || {},
      importedAt: parsed.importedAt || ""
    };
  } catch (error) {
    return { evaluations: {}, teams: {}, importedAt: "" };
  }
}

function saveStore(options = {}) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(Object.assign({}, store, { savedAt: new Date().toISOString() }))
  );
  if (!options.silent) showToast("저장되었습니다");
}

function getRegion(regionId) {
  return DATA.regions.find((region) => region.id === regionId);
}

function getProfile(participantId) {
  return DATA.people[participantId] || { name: participantId, school: "", major: "" };
}

function getParticipantEntries(region) {
  return region.participants.map(([participantId, role]) => {
    return Object.assign(
      {
        participantId,
        role
      },
      getProfile(participantId)
    );
  });
}

function getEntriesByRole(region, role) {
  return getParticipantEntries(region).filter((entry) => entry.role === role);
}

function getEvalKey(regionId, participantId) {
  return `${regionId}::${participantId}`;
}

function ensureEvaluation(regionId, participantId) {
  const key = getEvalKey(regionId, participantId);
  const current = store.evaluations[key] || {};
  store.evaluations[key] = {
    items: current.items || {},
    notes: current.notes || {},
    overallScore: current.overallScore || 0,
    overallNote: current.overallNote || "",
    complete: Boolean(current.complete),
    updatedAt: current.updatedAt || ""
  };
  return store.evaluations[key];
}

function getEvaluation(regionId, participantId) {
  return store.evaluations[getEvalKey(regionId, participantId)] || {};
}

function getTeams(regionId, participantId) {
  return store.teams[getEvalKey(regionId, participantId)] || [];
}

function setTeams(regionId, participantId, teams) {
  const key = getEvalKey(regionId, participantId);
  const unique = [];
  teams.map(normalizeTeam).filter(Boolean).forEach((team) => {
    if (unique.indexOf(team) === -1) unique.push(team);
  });
  store.teams[key] = unique;
  saveStore({ silent: true });
}

function normalizeTeam(value) {
  const cleaned = String(value || "").trim().replace(/\s+/g, "");
  if (!cleaned) return "";
  if (/^\d+$/.test(cleaned)) return `${cleaned}조`;
  return cleaned;
}

function showScreen(screenId) {
  $$(".screen").forEach((screen) => screen.classList.toggle("is-active", screen.id === screenId));
  hydrateIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showRegions() {
  ui.screen = "regions";
  ui.regionId = null;
  ui.query = "";
  ui.openQuestion = "";
  ui.viewMode = "questions";
  ui.participantId = null;
  $("#question-search").value = "";
  renderRegions();
  showScreen("region-screen");
}

function showQuestions(regionId) {
  ui.screen = "questions";
  ui.regionId = regionId;
  ui.query = "";
  ui.roleFilter = "all";
  ui.openQuestion = "";
  ui.viewMode = "questions";
  ui.participantId = null;
  $("#question-search").value = "";
  $$(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.questionRoleFilter === "all"));
  renderQuestionScreen();
  showScreen("question-screen");
}

function renderRegions() {
  const grid = $("#region-grid");
  grid.textContent = "";

  DATA.regions.forEach((region) => {
    const entries = getParticipantEntries(region);
    const progress = getRegionProgress(region);
    const supporters = entries.filter((entry) => entry.role === "supporter").length;
    const facilitators = entries.filter((entry) => entry.role === "facilitator").length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `region-card${region.pending ? " is-empty" : ""}`;
    button.dataset.regionId = region.id;
    button.innerHTML = `
      <div class="region-card-head">
        <h3>${escapeHtml(region.name)}</h3>
        <span class="status-badge ${progress.completed ? "is-complete" : ""}">
          ${region.pending ? "미확정" : `${progress.completed}/${progress.total} 완료`}
        </span>
      </div>
      <div class="region-meta">
        <span>${region.date ? formatDate(region.date) : "일정 미정"}</span>
        <span>${escapeHtml(region.venue || "장소 미정")}</span>
      </div>
      <div class="count-grid">
        <div class="count-box"><span>전체</span><strong>${entries.length}</strong></div>
        <div class="count-box"><span>서포터즈</span><strong>${supporters}</strong></div>
        <div class="count-box"><span>퍼실</span><strong>${facilitators}</strong></div>
      </div>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-fill" style="width:${progress.percent}%"></div>
      </div>
    `;
    grid.appendChild(button);
  });
}

function renderQuestionScreen() {
  const region = getRegion(ui.regionId);
  if (!region) {
    showRegions();
    return;
  }

  $("#question-title").textContent = `${region.name} 문항별 평가`;
  $("#question-eyebrow").textContent = region.date ? formatDate(region.date) : "지역예선";
  const participantButton = $("#show-participants");
  participantButton.textContent = ui.viewMode === "questions" ? "참가자 보기" : "문항 보기";
  participantButton.classList.toggle("is-active", ui.viewMode !== "questions");
  renderPlanSummary(region);

  $("#question-list").hidden = true;
  $("#team-manager").hidden = true;
  $("#participant-browser").hidden = true;
  $("#participant-report").hidden = true;
  $("#question-toolbar").hidden = ui.viewMode !== "questions";

  if (ui.viewMode === "participants") {
    $("#participant-browser").hidden = false;
    renderParticipantBrowser(region);
  } else if (ui.viewMode === "participant-detail") {
    $("#participant-report").hidden = false;
    renderParticipantReport(region);
  } else if (ui.roleFilter === "team") {
    $("#team-manager").hidden = false;
    renderTeamManager(region);
  } else {
    $("#question-list").hidden = false;
    renderQuestionList(region);
  }
  hydrateIcons();
}

function renderPlanSummary(region) {
  const entries = getParticipantEntries(region);
  const progress = getRegionProgress(region);
  const scores = entries.map((entry) => scoreParticipant(region.id, entry).total);
  const average = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  $("#plan-region-summary").innerHTML = `
    <div class="summary-main">
      <strong>${escapeHtml(region.venue || "장소 미정")}</strong>
      <span class="region-meta">${region.sourceFile ? escapeHtml(region.sourceFile) : "명단 업데이트 대기"}</span>
    </div>
    <div class="metric-grid">
      <div class="metric"><span>전체</span><strong>${entries.length}</strong></div>
      <div class="metric"><span>완료</span><strong>${progress.completed}</strong></div>
      <div class="metric"><span>팀 입력</span><strong>${getTeamAssignedCount(region)}</strong></div>
      <div class="metric"><span>평균</span><strong>${average}</strong></div>
    </div>
  `;
}

function renderQuestionList(region) {
  const list = $("#question-list");
  const groups = getQuestionGroups(region);
  list.textContent = "";

  if (!groups.length) {
    list.innerHTML = `<div class="empty-state">표시할 문항이 없습니다.</div>`;
    return;
  }

  groups.forEach((group) => {
    const collapsed = ui.query ? false : isAreaCollapsed(group.id);
    const directBody =
      group.questions.length === 1 && group.questions[0].type === "manual"
        ? renderQuestionBody(region, group.questions[0])
        : group.questions.map((question) => renderQuestionCard(region, question)).join("");
    const section = document.createElement("section");
    section.className = `question-section ${collapsed ? "is-collapsed" : ""}`;
    section.innerHTML = `
      <header class="question-section-head">
        <button class="question-section-toggle" type="button" data-toggle-area="${group.id}" aria-expanded="${String(!collapsed)}">
          <span class="question-section-copy">
            <strong>${escapeHtml(group.title)}</strong>
            <small>${escapeHtml(group.meta)}</small>
          </span>
          <span class="question-section-count">${escapeHtml(group.countLabel || `${group.questions.length}문항`)}</span>
          <i data-lucide="${collapsed ? "chevron-down" : "chevron-up"}"></i>
        </button>
      </header>
      <div class="question-section-body" ${collapsed ? "hidden" : ""}>
        ${directBody}
      </div>
    `;
    list.appendChild(section);
  });
}

function renderParticipantBrowser(region) {
  const browser = $("#participant-browser");
  const collator = new Intl.Collator("ko-KR");
  const entries = getParticipantEntries(region).sort((a, b) => {
    const roleDiff = (a.role === "supporter" ? 0 : 1) - (b.role === "supporter" ? 0 : 1);
    if (roleDiff !== 0) return roleDiff;
    return collator.compare(a.name, b.name);
  });

  if (!entries.length) {
    browser.innerHTML = `<div class="empty-state">참가자 명단이 아직 없습니다.</div>`;
    return;
  }

  browser.innerHTML = `
    <div class="participant-browser-head">
      <div>
        <p class="eyebrow">참가자 보기</p>
        <h3>${escapeHtml(region.name)} 참가자 명단</h3>
      </div>
      <button class="ghost-button compact-action" type="button" data-back-questions>문항 보기</button>
    </div>
    <div class="participant-card-grid">
      ${entries.map((entry) => renderParticipantBrowserCard(region, entry)).join("")}
    </div>
  `;
}

function renderParticipantBrowserCard(region, entry) {
  const score = scoreParticipant(region.id, entry);
  const evaluation = getEvaluation(region.id, entry.participantId);
  const teams = entry.role === "supporter" ? getTeamSummary(region.id, entry.participantId) : entry.school;
  return `
    <button class="participant-browser-card" type="button" data-open-participant-report="${entry.participantId}">
      <span class="participant-card-main">
        <b>${escapeHtml(entry.name)}</b>
        <small>${escapeHtml(teams || entry.school || "")}</small>
      </span>
      <span class="participant-card-side">
        <span class="role-badge ${entry.role}">${escapeHtml(DATA.roles[entry.role])}</span>
        <strong>${score.total}</strong>
        <small>${evaluation.complete ? "완료" : "진행"}</small>
      </span>
    </button>
  `;
}

function renderParticipantReport(region) {
  const report = $("#participant-report");
  const entry = getParticipantEntries(region).find((item) => item.participantId === ui.participantId);
  if (!entry) {
    ui.viewMode = "participants";
    renderParticipantBrowser(region);
    return;
  }

  const evaluation = ensureEvaluation(region.id, entry.participantId);
  const score = scoreParticipant(region.id, entry);
  const rubric = DATA.rubrics[entry.role];
  report.innerHTML = `
    <div class="participant-report-head">
      <button class="back-button compact-action" type="button" data-back-participant-list>
        <i data-lucide="chevron-left"></i>
        <span>명단</span>
      </button>
      <div class="participant-report-title">
        <p class="eyebrow">${escapeHtml(region.name)} · ${escapeHtml(DATA.roles[entry.role])}</p>
        <h3>${escapeHtml(entry.name)}</h3>
        <p class="person-meta">${escapeHtml(entry.school)} · ${escapeHtml(entry.major)}</p>
      </div>
      <strong class="participant-total">${score.total}</strong>
    </div>
    <div class="participant-report-sections">
      ${rubric.sections.map((section) => renderParticipantReportSection(section, evaluation, score.sections[section.id])).join("")}
    </div>
  `;
}

function renderParticipantReportSection(section, evaluation, sectionScore = { score: 0, raw: 0, cap: section.cap }) {
  if (section.manual) {
    return `
      <section class="participant-report-section">
        <header>
          <strong>${escapeHtml(section.title)}</strong>
          <span>${sectionScore.score}/${section.cap}</span>
        </header>
        <div class="report-row">
          <span class="report-question">${escapeHtml(section.label)}</span>
          <span class="report-state is-score">${clampNumber(evaluation.overallScore || 0, 0, section.cap)}점</span>
        </div>
        ${evaluation.overallNote ? `<p class="report-note">${escapeHtml(evaluation.overallNote)}</p>` : ""}
      </section>
    `;
  }

  return `
    <section class="participant-report-section">
      <header>
        <strong>${escapeHtml(section.title)}</strong>
        <span>${sectionScore.score}/${section.cap}</span>
      </header>
      ${(section.items || [])
        .map((item) => {
          const state = (evaluation.items && evaluation.items[item.code]) || "";
          const stateText = getStateText(item, state);
          const earned = scoreItem(item, state);
          const isPositive = item.type === "deduct" ? stateText === "Y" : stateText === "Y";
          return `
            <div class="report-row">
              <span class="report-code">${escapeHtml(item.code)}</span>
              <span class="report-question">${escapeHtml(item.label)}</span>
              <span class="report-state ${isPositive ? "is-y" : stateText === "N" ? "is-n" : ""}">${escapeHtml(stateText)}</span>
              <span class="report-score">${earned}/${item.points}</span>
            </div>
          `;
        })
        .join("")}
    </section>
  `;
}

function getQuestionGroups(region) {
  const roles = ui.roleFilter === "all" ? ["supporter", "facilitator"] : [ui.roleFilter];
  const query = normalizeSearch(ui.query);
  const groups = [];

  roles.forEach((role) => {
    const entries = getEntriesByRole(region, role);
    if (!entries.length) return;
    const rubric = DATA.rubrics[role];

    rubric.sections.forEach((section) => {
      const sectionQuestions = section.manual
        ? [createManualQuestion(role, section)]
        : section.items.map((item) => createItemQuestion(role, section, item));
      const visible = sectionQuestions.filter((question) => questionMatches(region, question, query));
      if (!visible.length) return;
      groups.push({
        id: `${role}-${section.id}`,
        title: `${DATA.roles[role]} · ${section.title}`,
        meta: `영역 상한 ${section.cap}점`,
        countLabel: section.manual ? `${entries.length}명` : "",
        questions: visible
      });
    });

    const completion = createCompletionQuestion(role);
    if (questionMatches(region, completion, query)) {
      groups.push({
        id: `${role}-completion`,
        title: `${DATA.roles[role]} · 완료 처리`,
        meta: `${entries.length}명`,
        questions: [completion]
      });
    }
  });

  return groups;
}

function createItemQuestion(role, section, item) {
  return {
    id: `${role}-${item.code}`,
    type: "item",
    role,
    sectionId: section.id,
    sectionTitle: section.title,
    cap: section.cap,
    item
  };
}

function createManualQuestion(role, section) {
  return {
    id: `${role}-${section.id}`,
    type: "manual",
    role,
    sectionId: section.id,
    sectionTitle: section.title,
    cap: section.cap,
    label: section.label
  };
}

function createCompletionQuestion(role) {
  return {
    id: `${role}-complete`,
    type: "complete",
    role,
    sectionTitle: "평가 완료",
    cap: 0
  };
}

function questionMatches(region, question, query) {
  if (!query) return true;
  if (normalizeSearch(questionText(question)).includes(query)) return true;
  return getEntriesByRole(region, question.role).some((entry) => participantMatches(region, entry, query));
}

function questionText(question) {
  if (question.type === "item") {
    return `${DATA.roles[question.role]} ${question.sectionTitle} ${question.item.code} ${question.item.label} ${question.item.method}`;
  }
  if (question.type === "manual") {
    return `${DATA.roles[question.role]} ${question.sectionTitle} ${question.label}`;
  }
  return `${DATA.roles[question.role]} 평가 완료`;
}

function renderQuestionCard(region, question) {
  const open = ui.openQuestion === question.id;
  const title = questionTitle(question);
  const meta = questionMeta(question);
  const stats = renderQuestionStats(region, question);
  const body = open ? renderQuestionBody(region, question) : "";

  return `
    <article class="question-card ${open ? "is-open" : ""}" data-question-card="${question.id}">
      <button class="question-card-head" type="button" data-toggle-question="${question.id}" aria-expanded="${String(open)}">
        <div class="question-title">
          ${question.type === "item" ? `<span class="question-code">${escapeHtml(question.item.code)}</span>` : ""}
          <h4>${escapeHtml(title)}</h4>
          <div class="question-meta">${meta}</div>
        </div>
        <div class="question-status">
          <div class="question-stats">${stats}</div>
          <span class="question-chevron"><i data-lucide="${open ? "chevron-up" : "chevron-down"}"></i></span>
        </div>
      </button>
      <div class="question-body" ${open ? "" : "hidden"}>${body}</div>
    </article>
  `;
}

function getAreaCollapseKey(areaId) {
  return `${ui.regionId || "region"}::${areaId}`;
}

function isAreaCollapsed(areaId) {
  return ui.collapsedAreas[getAreaCollapseKey(areaId)] !== false;
}

function toggleArea(areaId) {
  const key = getAreaCollapseKey(areaId);
  ui.collapsedAreas[key] = !isAreaCollapsed(areaId);
}

function questionTitle(question) {
  if (question.type === "item") return question.item.label;
  if (question.type === "manual") return question.label;
  return "평가 완료";
}

function questionMeta(question) {
  if (question.type === "item") {
    return `
      <span>${escapeHtml(DATA.roles[question.role])}</span>
      <span>${question.item.points}점</span>
      <span>${escapeHtml(question.item.method)}</span>
    `;
  }
  if (question.type === "manual") {
    return `
      <span>${escapeHtml(DATA.roles[question.role])}</span>
      <span>${question.cap}점</span>
      <span>종합 의견</span>
    `;
  }
  return `
    <span>${escapeHtml(DATA.roles[question.role])}</span>
    <span>완료 표시</span>
  `;
}

function renderQuestionStats(region, question) {
  const entries = getEntriesByRole(region, question.role);
  if (question.type === "item") {
    const counts = getItemCounts(region, entries, question.item);
    if (question.item.type === "deduct") {
      return `
        <span class="stat-pill is-y">Y ${counts.y}</span>
        <span class="stat-pill is-n">N ${counts.n}</span>
      `;
    }
    return `
      <span class="stat-pill is-y">Y ${counts.y}</span>
      <span class="stat-pill is-n">N ${counts.n}</span>
      <span class="stat-pill">- ${counts.blank}</span>
    `;
  }
  if (question.type === "manual") {
    const values = entries.map((entry) => Number(getEvaluation(region.id, entry.participantId).overallScore || 0));
    const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    return `<span class="stat-pill is-score">평균 ${average}</span>`;
  }
  const completed = entries.filter((entry) => getEvaluation(region.id, entry.participantId).complete).length;
  return `<span class="stat-pill is-y">${completed}/${entries.length}</span>`;
}

function getItemCounts(region, entries, item) {
  return entries.reduce(
    (counts, entry) => {
      const storedEvaluation = getEvaluation(region.id, entry.participantId);
      const state = (storedEvaluation.items && storedEvaluation.items[item.code]) || "";
      if (item.type === "deduct") {
        if (state === "n") counts.n += 1;
        else counts.y += 1;
      } else if (state === "y") {
        counts.y += 1;
      } else if (state === "n") {
        counts.n += 1;
      } else {
        counts.blank += 1;
      }
      return counts;
    },
    { y: 0, n: 0, blank: 0 }
  );
}

function renderQuestionBody(region, question) {
  const entries = getVisibleEntriesForQuestion(region, question);
  if (!entries.length) return `<div class="empty-state">표시할 참가자가 없습니다.</div>`;

  if (question.type === "manual") return renderManualBody(region, question, entries);
  if (question.type === "complete") return renderCompletionBody(region, entries);

  return `
    <div class="participant-pill-grid">
      ${entries.map((entry) => renderJudgePill(region, entry, question.item)).join("")}
    </div>
  `;
}

function getVisibleEntriesForQuestion(region, question) {
  const entries = getEntriesByRole(region, question.role);
  const query = normalizeSearch(ui.query);
  if (!query || normalizeSearch(questionText(question)).includes(query)) return entries;
  return entries.filter((entry) => participantMatches(region, entry, query));
}

function participantMatches(region, entry, query) {
  const teams = getTeams(region.id, entry.participantId).join(" ");
  const haystack = normalizeSearch(`${entry.name} ${entry.school} ${entry.major} ${teams}`);
  return haystack.includes(query);
}

function renderJudgePill(region, entry, item) {
  const evaluation = ensureEvaluation(region.id, entry.participantId);
  const state = (evaluation.items && evaluation.items[item.code]) || "";
  const stateClass = getStateClass(item, state);
  const stateText = getStateText(item, state);
  const sub = entry.role === "supporter" ? getTeamSummary(region.id, entry.participantId) : entry.school;
  return `
    <button
      class="judge-pill ${stateClass}"
      type="button"
      data-toggle-item
      data-role="${entry.role}"
      data-participant-id="${entry.participantId}"
      data-item-code="${item.code}"
    >
      <span class="judge-pill-name">
        <b>${escapeHtml(entry.name)}</b>
        <small>${escapeHtml(sub || entry.school || "")}</small>
      </span>
      <strong>${escapeHtml(stateText)}</strong>
    </button>
  `;
}

function getTeamSummary(regionId, participantId) {
  const teams = getTeams(regionId, participantId);
  return teams.length ? teams.join(" ") : "팀 미입력";
}

function getStateClass(item, state) {
  if (item.type === "deduct") return state === "n" ? "is-n" : "is-y";
  if (state === "y") return "is-y";
  if (state === "n") return "is-n";
  return "";
}

function getStateText(item, state) {
  if (item.type === "deduct") return state === "n" ? "N" : "Y";
  if (state === "y") return "Y";
  if (state === "n") return "N";
  return "-";
}

function renderManualBody(region, question, entries) {
  return `
    <div class="participant-pill-grid">
      ${entries.map((entry) => renderManualScorePill(region, entry, question.cap)).join("")}
    </div>
  `;
}

function renderManualScorePill(region, entry, cap) {
  const evaluation = ensureEvaluation(region.id, entry.participantId);
  const value = clampNumber(evaluation.overallScore || 0, 0, cap);
  const sub = evaluation.overallNote ? "의견 있음" : entry.role === "supporter" ? getTeamSummary(region.id, entry.participantId) : entry.school;
  return `
    <button
      class="judge-pill manual-score-pill ${value > 0 ? "is-y" : ""}"
      type="button"
      data-open-manual-score
      data-role="${entry.role}"
      data-participant-id="${entry.participantId}"
    >
      <span class="judge-pill-name">
        <b>${escapeHtml(entry.name)}</b>
        <small>${escapeHtml(sub || "")}</small>
      </span>
      <strong>${value}/${cap}</strong>
    </button>
  `;
}

function renderCompletionBody(region, entries) {
  return `
    <div class="participant-pill-grid">
      ${entries
        .map((entry) => {
          const evaluation = ensureEvaluation(region.id, entry.participantId);
          return `
            <button
              class="judge-pill ${evaluation.complete ? "is-complete is-y" : ""}"
              type="button"
              data-toggle-complete
              data-role="${entry.role}"
              data-participant-id="${entry.participantId}"
            >
              <span class="judge-pill-name">
                <b>${escapeHtml(entry.name)}</b>
                <small>${scoreParticipant(region.id, entry).total}/100점</small>
              </span>
              <strong>${evaluation.complete ? "완료" : "-"}</strong>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTeamManager(region) {
  const manager = $("#team-manager");
  const query = normalizeSearch(ui.query);
  const supporters = getEntriesByRole(region, "supporter").filter((entry) => !query || participantMatches(region, entry, query));
  manager.textContent = "";

  if (!supporters.length) {
    manager.innerHTML = `<div class="empty-state">표시할 서포터즈가 없습니다.</div>`;
    return;
  }

  supporters.forEach((entry) => {
    const teams = getTeams(region.id, entry.participantId);
    const card = document.createElement("article");
    card.className = "team-person-card";
    card.dataset.participantId = entry.participantId;
    card.innerHTML = `
      <div class="team-person-head">
        <div>
          <h3>${escapeHtml(entry.name)}</h3>
          <p class="person-meta">${escapeHtml(entry.school)} · ${escapeHtml(entry.major)}</p>
        </div>
        <span class="score-pill">${scoreParticipant(region.id, entry).total}점</span>
      </div>
      <div class="team-tags">
        ${teams.length ? teams.map((team) => renderTeamTag(team, true)).join("") : '<span class="person-meta">담당 팀 미입력</span>'}
      </div>
      <div class="team-mini-form">
        <input data-team-input type="text" inputmode="text" autocomplete="off" placeholder="1조" aria-label="${escapeHtml(entry.name)} 담당 팀" />
        <button type="button" data-add-team aria-label="담당 팀 추가"><i data-lucide="plus"></i></button>
      </div>
    `;
    manager.appendChild(card);
  });
}

function renderTeamTag(team, removable) {
  return `
    <span class="team-tag">
      ${escapeHtml(team)}
      ${removable ? `<button type="button" data-remove-team="${escapeHtml(team)}" aria-label="${escapeHtml(team)} 제거"><i data-lucide="x"></i></button>` : ""}
    </span>
  `;
}

function scoreParticipant(regionId, entry) {
  return scoreEvaluation(entry.role, getEvaluation(regionId, entry.participantId));
}

function scoreEvaluation(role, evaluation = {}) {
  const rubric = DATA.rubrics[role];
  const sections = {};
  let total = 0;

  rubric.sections.forEach((section) => {
    let raw = 0;
    if (section.manual) {
      raw = clampNumber(evaluation.overallScore || 0, 0, section.cap);
    } else {
      section.items.forEach((item) => {
        raw += scoreItem(item, (evaluation.items && evaluation.items[item.code]) || "");
      });
    }
    const capped = Math.min(raw, section.cap);
    sections[section.id] = { raw, score: capped, cap: section.cap };
    total += capped;
  });

  return { total: Math.round(total), sections };
}

function scoreItem(item, state) {
  if (item.type === "deduct") {
    return state === "n" ? 0 : item.points;
  }
  return state === "y" ? item.points : 0;
}

function handleRegionClick(event) {
  const button = event.target.closest("[data-region-id]");
  if (!button) return;
  showQuestions(button.dataset.regionId);
}

function handleParticipantViewToggle() {
  if (ui.viewMode === "questions") {
    ui.viewMode = "participants";
    ui.participantId = null;
  } else {
    ui.viewMode = "questions";
    ui.participantId = null;
    ui.roleFilter = "all";
    $$(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.questionRoleFilter === "all"));
  }
  renderQuestionScreen();
}

function handleParticipantBrowserClick(event) {
  if (event.target.closest("[data-back-questions]")) {
    ui.viewMode = "questions";
    ui.participantId = null;
    ui.roleFilter = "all";
    $$(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.questionRoleFilter === "all"));
    renderQuestionScreen();
    return;
  }

  const button = event.target.closest("[data-open-participant-report]");
  if (!button) return;
  ui.viewMode = "participant-detail";
  ui.participantId = button.dataset.openParticipantReport;
  renderQuestionScreen();
}

function handleParticipantReportClick(event) {
  if (!event.target.closest("[data-back-participant-list]")) return;
  ui.viewMode = "participants";
  ui.participantId = null;
  renderQuestionScreen();
}

function handleQuestionClick(event) {
  const region = getRegion(ui.regionId);
  const areaToggle = event.target.closest("[data-toggle-area]");
  if (areaToggle) {
    toggleArea(areaToggle.dataset.toggleArea);
    renderQuestionScreen();
    return;
  }

  const manualButton = event.target.closest("[data-open-manual-score]");
  if (manualButton) {
    openManualScoreModal(region, manualButton);
    return;
  }

  const itemButton = event.target.closest("[data-toggle-item]");
  if (itemButton) {
    toggleItemState(region, itemButton);
    renderQuestionScreen();
    return;
  }

  const completeButton = event.target.closest("[data-toggle-complete]");
  if (completeButton) {
    toggleComplete(region, completeButton);
    renderQuestionScreen();
    return;
  }

  const presetButton = event.target.closest("[data-score-preset]");
  if (presetButton) {
    setManualScore(region, presetButton, Number(presetButton.dataset.scorePreset));
    renderQuestionScreen();
    return;
  }

  const stepButton = event.target.closest("[data-score-step]");
  if (stepButton) {
    const evaluation = ensureEvaluation(region.id, stepButton.dataset.participantId);
    const role = stepButton.dataset.role;
    const cap = getManualCap(role);
    const next = clampNumber(Number(evaluation.overallScore || 0) + Number(stepButton.dataset.scoreStep), 0, cap);
    setManualScore(region, stepButton, next);
    renderQuestionScreen();
    return;
  }

  const toggle = event.target.closest("[data-toggle-question]");
  if (toggle) {
    ui.openQuestion = ui.openQuestion === toggle.dataset.toggleQuestion ? "" : toggle.dataset.toggleQuestion;
    renderQuestionScreen();
  }
}

function openManualScoreModal(region, button) {
  const participantId = button.dataset.participantId;
  const role = button.dataset.role;
  const entry = getParticipantEntries(region).find((item) => item.participantId === participantId);
  if (!entry) return;

  const cap = getManualCap(role);
  const evaluation = ensureEvaluation(region.id, participantId);
  ui.manualTarget = { regionId: region.id, participantId, role };
  $("#manual-score-title").textContent = entry.name;
  $("#manual-score-eyebrow").textContent = `${region.name} · ${DATA.roles[role]} · 기타 종합 평가`;
  $("#manual-score-copy").textContent = `${entry.school} · ${entry.major}`;
  $("#manual-score-input").max = String(cap);
  $("#manual-score-note").value = evaluation.overallNote || "";
  renderManualModalPresets(cap);
  setManualModalDraft(clampNumber(evaluation.overallScore || 0, 0, cap));
  $("#manual-score-modal").hidden = false;
  window.setTimeout(() => $("#manual-score-input").focus(), 0);
}

function closeManualScoreModal() {
  ui.manualTarget = null;
  $("#manual-score-modal").hidden = true;
}

function renderManualModalPresets(cap) {
  const presetCandidates = [0, Math.round(cap / 2), Math.max(0, cap - 2), cap];
  const presets = [];
  presetCandidates.forEach((score) => {
    if (presets.indexOf(score) === -1) presets.push(score);
  });
  $("#manual-score-presets").innerHTML = presets
    .map((score) => `<button class="manual-preset" type="button" data-manual-preset="${score}">${score}</button>`)
    .join("");
}

function setManualModalDraft(value) {
  const cap = Number($("#manual-score-input").max || 10);
  $("#manual-score-input").value = String(clampNumber(value, 0, cap));
  updateManualScorePresetState();
}

function updateManualScorePresetState() {
  const value = Number($("#manual-score-input").value || 0);
  $$("#manual-score-presets [data-manual-preset]").forEach((button) => {
    button.classList.toggle("is-selected", Number(button.dataset.manualPreset) === value);
  });
}

function handleManualScoreClick(event) {
  const step = event.target.closest("[data-modal-score-step]");
  if (step) {
    setManualModalDraft(Number($("#manual-score-input").value || 0) + Number(step.dataset.modalScoreStep));
    return;
  }

  const preset = event.target.closest("[data-manual-preset]");
  if (preset) {
    setManualModalDraft(Number(preset.dataset.manualPreset));
  }
}

function handleManualScoreSubmit(event) {
  event.preventDefault();
  if (!ui.manualTarget) return;

  const region = getRegion(ui.manualTarget.regionId);
  const evaluation = ensureEvaluation(region.id, ui.manualTarget.participantId);
  evaluation.overallScore = clampNumber($("#manual-score-input").value, 0, getManualCap(ui.manualTarget.role));
  evaluation.overallNote = $("#manual-score-note").value.trim();
  touchEvaluation(evaluation);
  saveStore({ silent: true });
  closeManualScoreModal();
  renderQuestionScreen();
  showToast("종합 평가 점수를 저장했습니다");
}

function toggleItemState(region, button) {
  const role = button.dataset.role;
  const participantId = button.dataset.participantId;
  const code = button.dataset.itemCode;
  const item = findRubricItem(role, code);
  const evaluation = ensureEvaluation(region.id, participantId);
  const current = evaluation.items[code] || "";
  let next = "";

  if (item.type === "deduct") {
    next = current === "n" ? "" : "n";
  } else if (!current) {
    next = "y";
  } else if (current === "y") {
    next = "n";
  }

  if (next) evaluation.items[code] = next;
  else delete evaluation.items[code];
  touchEvaluation(evaluation);
  saveStore({ silent: true });
}

function toggleComplete(region, button) {
  const evaluation = ensureEvaluation(region.id, button.dataset.participantId);
  evaluation.complete = !evaluation.complete;
  touchEvaluation(evaluation);
  saveStore({ silent: true });
}

function setManualScore(region, control, value) {
  const role = control.dataset.role;
  const participantId = control.dataset.participantId;
  const evaluation = ensureEvaluation(region.id, participantId);
  evaluation.overallScore = clampNumber(value, 0, getManualCap(role));
  touchEvaluation(evaluation);
  saveStore({ silent: true });
}

function handleQuestionInput(event) {
  const region = getRegion(ui.regionId);
  const scoreInput = event.target.closest("[data-overall-score]");
  if (scoreInput) {
    setManualScore(region, scoreInput, scoreInput.value);
    renderPlanSummary(region);
    return;
  }

  const note = event.target.closest("[data-overall-note]");
  if (note) {
    const evaluation = ensureEvaluation(region.id, note.dataset.participantId);
    evaluation.overallNote = note.value;
    touchEvaluation(evaluation);
    saveStore({ silent: true });
  }
}

function handleTeamClick(event) {
  const region = getRegion(ui.regionId);
  const card = event.target.closest("[data-participant-id]");
  if (!card) return;

  const remove = event.target.closest("[data-remove-team]");
  if (remove) {
    const teams = getTeams(region.id, card.dataset.participantId).filter((team) => team !== remove.dataset.removeTeam);
    setTeams(region.id, card.dataset.participantId, teams);
    renderQuestionScreen();
    return;
  }

  if (event.target.closest("[data-add-team]")) {
    addTeam(region, card);
  }
}

function handleTeamKeydown(event) {
  if (event.key !== "Enter" || !event.target.matches("[data-team-input]")) return;
  event.preventDefault();
  const region = getRegion(ui.regionId);
  const card = event.target.closest("[data-participant-id]");
  if (card) addTeam(region, card);
}

function addTeam(region, card) {
  const input = $("[data-team-input]", card);
  const team = normalizeTeam(input.value);
  if (!team) {
    input.focus();
    return;
  }
  const teams = getTeams(region.id, card.dataset.participantId);
  setTeams(region.id, card.dataset.participantId, teams.concat([team]));
  input.value = "";
  renderQuestionScreen();
}

function getManualCap(role) {
  const manualSection = DATA.rubrics[role].sections.find((section) => section.manual);
  return manualSection ? manualSection.cap : 10;
}

function touchEvaluation(evaluation) {
  evaluation.updatedAt = new Date().toISOString();
}

function getRegionProgress(region) {
  const entries = getParticipantEntries(region);
  const completed = entries.filter((entry) => getEvaluation(region.id, entry.participantId).complete).length;
  return {
    total: entries.length,
    completed,
    percent: entries.length ? Math.round((completed / entries.length) * 100) : 0
  };
}

function getTeamAssignedCount(region) {
  return getParticipantEntries(region).filter((entry) => entry.role === "supporter" && getTeams(region.id, entry.participantId).length).length;
}

function openEvaluatorModal(kind) {
  ui.pendingExport = kind;
  const modal = $("#evaluator-modal");
  const input = $("#evaluator-name");
  input.value = localStorage.getItem("dingading-evaluator-name") || "";
  modal.hidden = false;
  window.setTimeout(() => input.focus(), 0);
}

function closeEvaluatorModal() {
  ui.pendingExport = null;
  $("#evaluator-modal").hidden = true;
}

function handleEvaluatorSubmit(event) {
  event.preventDefault();
  const input = $("#evaluator-name");
  const evaluatorName = input.value.trim();
  if (!evaluatorName) {
    input.focus();
    return;
  }
  localStorage.setItem("dingading-evaluator-name", evaluatorName);
  const kind = ui.pendingExport;
  closeEvaluatorModal();
  if (kind === "xlsx") exportXlsx(evaluatorName);
  if (kind === "json") exportJson(evaluatorName);
}

function exportJson(evaluatorName = "") {
  const evaluatorPart = sanitizeFilenamePart(evaluatorName) || "evaluator";
  const payload = {
    app: "dingading-region-prelim-evaluation-plan-b",
    appVersion: DATA.version,
    exportedAt: new Date().toISOString(),
    evaluatorName,
    store
  };
  downloadFile(`dingading-evaluation-plan-b-backup-${evaluatorPart}-${dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  showToast("백업 파일을 내보냈습니다");
}

function exportXlsx(evaluatorName = "") {
  const evaluatorPart = sanitizeFilenamePart(evaluatorName) || "evaluator";
  const sheets = buildWorkbookSheets(evaluatorName);
  const workbook = createXlsxWorkbook(sheets);
  downloadFile(
    `dingading-evaluation-plan-b-${evaluatorPart}-${dateStamp()}.xlsx`,
    new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  showToast("Excel 파일을 내보냈습니다");
}

function buildWorkbookSheets(evaluatorName) {
  const itemCodes = getAllItemCodes();
  const headers = [
    "지역",
    "일정",
    "평가자",
    "이름",
    "역할",
    "학교",
    "전공",
    "담당팀",
    "총점",
    "완료",
    "업데이트",
    "종합의견",
  ].concat(itemCodes);

  return DATA.regions.map((region) => {
    const rows = [headers];
    getParticipantEntries(region).forEach((entry) => {
      const evaluation = getEvaluation(region.id, entry.participantId);
      const score = scoreParticipant(region.id, entry).total;
      rows.push([
        region.name,
        region.date || "",
        evaluatorName,
        entry.name,
        DATA.roles[entry.role],
        entry.school,
        entry.major,
        getTeams(region.id, entry.participantId).join(" "),
        score,
        evaluation.complete ? "Y" : "",
        evaluation.updatedAt || "",
        evaluation.overallNote || "",
      ].concat(itemCodes.map((code) => exportItemState(entry.role, code, (evaluation.items && evaluation.items[code]) || ""))));
    });
    return { name: region.name, rows };
  });
}

function exportItemState(role, code, state) {
  const item = findRubricItem(role, code);
  if (!item) return "";
  if (item.type === "deduct") return state === "n" ? "N" : "Y";
  if (state === "y") return "Y";
  if (state === "n") return "N";
  return "";
}

function findRubricItem(role, code) {
  for (const section of DATA.rubrics[role].sections) {
    const item = (section.items || []).find((candidate) => candidate.code === code);
    if (item) return item;
  }
  return null;
}

function createXlsxWorkbook(sheets) {
  const uniqueSheets = makeUniqueSheetNames(sheets);
  const files = [
    { path: "[Content_Types].xml", content: buildContentTypes(uniqueSheets.length) },
    { path: "_rels/.rels", content: buildRootRels() },
    { path: "xl/workbook.xml", content: buildWorkbookXml(uniqueSheets) },
    { path: "xl/_rels/workbook.xml.rels", content: buildWorkbookRels(uniqueSheets.length) },
    { path: "xl/styles.xml", content: buildStylesXml() }
  ].concat(
    uniqueSheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: buildWorksheetXml(sheet.rows)
    }))
  );
  return createZip(files);
}

function makeUniqueSheetNames(sheets) {
  const used = new Set();
  return sheets.map((sheet, index) => {
    let base = sanitizeSheetName(sheet.name || `지역${index + 1}`) || `지역${index + 1}`;
    let name = base;
    let suffix = 2;
    while (used.has(name)) {
      const tail = ` ${suffix}`;
      name = `${base.slice(0, 31 - tail.length)}${tail}`;
      suffix += 1;
    }
    used.add(name);
    return Object.assign({}, sheet, { name });
  });
}

function sanitizeSheetName(name) {
  return String(name || "")
    .replace(/[\\/?*:[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
}

function buildContentTypes(sheetCount) {
  const sheetOverrides = [];
  for (let index = 0; index < sheetCount; index += 1) {
    const sheetNumber = index + 1;
    sheetOverrides.push(`<Override PartName="/xl/worksheets/sheet${sheetNumber}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
  }
  const sheetOverrideXml = sheetOverrides.join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrideXml}
</Types>`;
}

function buildRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookXml(sheets) {
  const sheetXml = sheets
    .map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`;
}

function buildWorkbookRels(sheetCount) {
  const sheetRels = [];
  for (let index = 0; index < sheetCount; index += 1) {
    const sheetNumber = index + 1;
    sheetRels.push(`<Relationship Id="rId${sheetNumber}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNumber}.xml"/>`);
  }
  const sheetRelXml = sheetRels.join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRelXml}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="NanumSquare"/></font><font><b/><sz val="11"/><name val="NanumSquare"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function buildWorksheetXml(rows) {
  const sheetData = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row.map((value, colIndex) => buildCellXml(value, rowNumber, colIndex + 1, rowIndex === 0)).join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="12" width="16" customWidth="1"/>
    <col min="13" max="80" width="9" customWidth="1"/>
  </cols>
  <sheetData>${sheetData}</sheetData>
</worksheet>`;
}

function buildCellXml(value, rowNumber, colNumber, isHeader) {
  const ref = `${columnName(colNumber)}${rowNumber}`;
  const style = isHeader ? ' s="1"' : "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${style}><is><t>${xmlEscape(value)}</t></is></c>`;
}

function columnName(number) {
  let name = "";
  let current = number;
  while (current > 0) {
    const mod = (current - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    current = Math.floor((current - mod) / 26);
  }
  return name;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const prepared = files.map((file) => {
    const nameBytes = encoder.encode(file.path);
    const data = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    return Object.assign({}, file, {
      nameBytes,
      data,
      crc: crc32(data)
    });
  });

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  prepared.forEach((file) => {
    const localHeader = zipLocalHeader(file);
    localParts.push(localHeader, file.nameBytes, file.data);
    centralParts.push(zipCentralHeader(file, offset), file.nameBytes);
    offset += localHeader.length + file.nameBytes.length + file.data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = zipEndRecord(prepared.length, centralSize, offset);
  return concatUint8(localParts.concat(centralParts, [end]));
}

function zipLocalHeader(file) {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 0, true);
  view.setUint32(14, file.crc, true);
  view.setUint32(18, file.data.length, true);
  view.setUint32(22, file.data.length, true);
  view.setUint16(26, file.nameBytes.length, true);
  view.setUint16(28, 0, true);
  return bytes;
}

function zipCentralHeader(file, offset) {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint32(12, 0, true);
  view.setUint32(16, file.crc, true);
  view.setUint32(20, file.data.length, true);
  view.setUint32(24, file.data.length, true);
  view.setUint16(28, file.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  return bytes;
}

function zipEndRecord(entryCount, centralSize, centralOffset) {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return bytes;
}

function concatUint8(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function xmlEscape(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function importJson(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const nextStore = parsed.store || parsed;
      if (!nextStore.evaluations || !nextStore.teams) throw new Error("invalid backup");
      if (!window.confirm("가져온 백업으로 현재 저장 내용을 바꿀까요?")) return;
      store = {
        evaluations: nextStore.evaluations || {},
        teams: nextStore.teams || {},
        importedAt: new Date().toISOString()
      };
      saveStore({ silent: true });
      rerenderCurrentScreen();
      showToast("백업을 가져왔습니다");
    } catch (error) {
      showToast("백업 파일을 읽지 못했습니다");
    }
  };
  reader.readAsText(file);
}

function rerenderCurrentScreen() {
  if (ui.screen === "regions") renderRegions();
  if (ui.screen === "questions") renderQuestionScreen();
}

function getAllItemCodes() {
  const codes = [];
  Object.keys(DATA.rubrics).forEach((role) => {
    const rubric = DATA.rubrics[role];
    rubric.sections.forEach((section) => {
      (section.items || []).forEach((item) => {
        if (!codes.includes(item.code)) codes.push(item.code);
      });
    });
  });
  return codes;
}

function downloadFile(filename, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  if (link.parentNode) link.parentNode.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function normalizeSearch(value) {
  return String(value || "").trim().replace(/\s+/g, "").toLocaleLowerCase("ko-KR");
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function hydrateIcons() {
  if (window.lucide) window.lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", init);
