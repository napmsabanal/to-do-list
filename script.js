/* =========================================================
   ELEMENTS
   ========================================================= */
const $ = (id) => document.getElementById(id);

const taskForm = $("taskForm");
const taskInput = $("taskInput");
const statusInput = $("statusInput");
const priorityInput = $("priorityInput");
const categoryInput = $("categoryInput");
const dueDateInput = $("dueDateInput");
const formError = $("formError");
const charCount = $("charCount");
const taskList = $("taskList");
const emptyState = $("emptyState");
const emptyIcon = $("emptyIcon");
const emptyTitle = $("emptyTitle");
const emptyText = $("emptyText");
const clearCompletedBtn = $("clearCompletedBtn");
const toggleAllBtn = $("toggleAllBtn");
const searchInput = $("searchInput");
const sortInput = $("sortInput");
const categoryFilter = $("categoryFilter");
const progressLabel = $("progressLabel");
const progressPercent = $("progressPercent");
const progressRing = $("progressRing");
const statusSummary = $("statusSummary");
const allDoneMsg = $("allDoneMsg");
const todayDateEl = $("todayDate");
const quoteEl = $("quote");
const streakEl = $("streak");
const trashToggleBtn = $("trashToggleBtn");
const trashPanel = $("trashPanel");
const trashList = $("trashList");
const restoreAllBtn = $("restoreAllBtn");
const emptyTrashBtn = $("emptyTrashBtn");
const bgSelect = $("bgSelect");
const appearance = $("appearance");
const toastEl = $("toast");
const toastMessage = $("toastMessage");
const toastAction = $("toastAction");
const filterButtons = document.querySelectorAll(".filter-btn");
const themeButtons = document.querySelectorAll(".theme-btn");

/* =========================================================
   CONSTANTS
   ========================================================= */
const STORAGE_KEY = "taskflow.tasks";
const THEME_KEY = "taskflow.theme";
const TRASH_KEY = "taskflow.trash";
const STREAK_KEY = "taskflow.streakDays";
const BG_KEY = "taskflow.background";
const QUOTE_API = "https://dummyjson.com/quotes/random";
const RING_LENGTH = 113.1;

const icon = (paths, size = 16, sw = 2) =>
    '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size +
    '" fill="none" stroke="currentColor" stroke-width="' + sw +
    '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";

const ICON = {
    trash: icon('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/>'),
    edit: icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    check: icon('<path d="M5 13l4 4L19 7"/>', 14, 3.5),
    note: icon('<path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5"/><path d="M8 9h8"/><path d="M8 13h4"/>')
};

const QUOTES = [
    "Start where you are. Use what you have. Do what you can.",
    "Small steps every day add up to big results.",
    "Done is better than perfect.",
    "Focus on progress, not perfection.",
    "The secret of getting ahead is getting started.",
    "One task at a time. You've got this.",
    "Discipline is choosing what you want most over what you want now.",
    "Don't wait for motivation. Start, and motivation will follow.",
    "Every finished task is a win. Celebrate it.",
    "Your future self will thank you for what you do today."
];

const STATUS_OPTIONS = [
    ["pending", "Pending"],
    ["progress", "In Progress"],
    ["hold", "On Hold"],
    ["done", "Done"]
];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS);
const STATUS_IDS = STATUS_OPTIONS.map(([id]) => id);
const STATUS_STEPS = { pending: 1, progress: 2, hold: 3, done: 4 };
// Icons so status never relies on color alone
const STATUS_ICON = { pending: "○", progress: "◐", hold: "‖", done: "✓" };
// Clicking a status badge moves the task to the next step
const NEXT_STATUS = { pending: "progress", progress: "done", hold: "progress", done: "pending" };

const PRIORITY_OPTIONS = [["low", "Low"], ["medium", "Medium"], ["high", "High"]];
const PRIORITY_ICON = { high: "▲", medium: "●", low: "▼" };

const CATEGORY_OPTIONS = [
    ["", "No category"],
    ["School", "School"],
    ["Home", "Home"],
    ["Work", "Work"],
    ["Personal", "Personal"]
];

/* =========================================================
   STATE
   ========================================================= */
let tasks = [];
let nextId = 1;
let activeFilter = "all";
let searchQuery = "";
let sortBy = "priority";
let trash = [];
let trashOpen = false;
let activeCategory = "all";
let streakDays = [];
let dragId = null;
let toastTimer = null;
let wasAllDone = null;
let justCompletedId = null;
let allowConfetti = false;

showTodaysDate();
showRandomQuote();
loadTheme();
loadTasks();
loadTrash();
loadStreak();
loadBackground();
updateMinDueDate();
render();
startMidnightWatcher();

/* =========================================================
   STORAGE HELPERS
   ========================================================= */
function readJSON(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch (err) {
        console.error("Could not read " + key + ":", err);
        return null;
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.error("Could not save " + key + ":", err);
    }
}

/* =========================================================
   DATES
   ========================================================= */
function getDateStr(date) {
    return (
        date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0")
    );
}

function updateMinDueDate() {
    dueDateInput.min = getDateStr(new Date());
}

function showTodaysDate() {
    todayDateEl.textContent = new Date().toLocaleDateString(undefined, {
        weekday: "long", month: "long", day: "numeric"
    });
}

function startMidnightWatcher() {
    let lastDay = getDateStr(new Date());

    function check() {
        const today = getDateStr(new Date());
        if (today === lastDay) return;
        lastDay = today;
        showTodaysDate();
        updateMinDueDate();
        if (!document.querySelector(".edit-form")) render();
    }

    setInterval(check, 60000);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) check();
    });
}

function formatDueDate(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getDueText(task) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (task.dueDate === getDateStr(today)) return "Due today";
    if (task.dueDate === getDateStr(tomorrow)) return "Due tomorrow";
    return "Due " + formatDueDate(task.dueDate);
}

function isDone(task) {
    return task.status === "done";
}

function isOverdue(task) {
    if (!task.dueDate || isDone(task)) return false;
    return task.dueDate < getDateStr(new Date());
}

/* =========================================================
   QUOTE
   ========================================================= */
function showLocalQuote() {
    const index = Math.floor(Math.random() * QUOTES.length);
    quoteEl.textContent = "\u201C" + QUOTES[index] + "\u201D";
}

async function showRandomQuote() {
    try {
        const response = await fetch(QUOTE_API);
        if (!response.ok) throw new Error("Request failed: " + response.status);
        const data = await response.json();
        quoteEl.textContent = "\u201C" + data.quote + "\u201D \u2014 " + data.author;
    } catch (err) {
        console.error("Could not fetch quote, using a local one:", err);
        showLocalQuote();
    }
}

quoteEl.addEventListener("click", showRandomQuote);

/* =========================================================
   THEME, BACKGROUND, APPEARANCE MENU
   ========================================================= */
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeButtons.forEach((btn) => {
        const active = btn.dataset.theme === theme;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", String(active));
    });
}

function loadTheme() {
    let theme = "light";
    try {
        const saved = localStorage.getItem(THEME_KEY);
        theme = ["light", "dark", "yellow"].includes(saved) ? saved : "light";
    } catch (err) {
        console.error("Could not load saved theme:", err);
    }
    applyTheme(theme);
}

themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const theme = btn.dataset.theme;
        applyTheme(theme);
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (err) {
            console.error("Could not save theme:", err);
        }
    });
});

function applyBackground(name) {
    if (name === "default") document.body.removeAttribute("data-bg");
    else document.body.setAttribute("data-bg", name);
    bgSelect.value = name;
}

function loadBackground() {
    let name = "default";
    try {
        const saved = localStorage.getItem(BG_KEY);
        const allowed = ["default", "sunset", "ocean", "forest", "lavender", "sakura", "night"];
        name = allowed.includes(saved) ? saved : "default";
    } catch (err) {
        console.error("Could not load background:", err);
    }
    applyBackground(name);
}

bgSelect.addEventListener("change", () => {
    applyBackground(bgSelect.value);
    try {
        localStorage.setItem(BG_KEY, bgSelect.value);
    } catch (err) {
        console.error("Could not save background:", err);
    }
});

// Close the Appearance menu when clicking elsewhere or pressing Escape
document.addEventListener("click", (event) => {
    if (!appearance.contains(event.target)) appearance.open = false;
});

appearance.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        appearance.open = false;
        appearance.querySelector("summary").focus();
    }
});

/* =========================================================
   STATUS
   ========================================================= */
function normalizeTask(t) {
    const status = STATUS_IDS.includes(t.status) ? t.status : t.completed ? "done" : "pending";

    const normalized = {
        ...t,
        text: typeof t.text === "string" ? t.text.trim() : "",
        status,
        completedOn: status === "done" && typeof t.completedOn === "string" ? t.completedOn : undefined,
        category: typeof t.category === "string" ? t.category : "",
        priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
        dueDate: typeof t.dueDate === "string" && t.dueDate ? t.dueDate : null,
        note: typeof t.note === "string" ? t.note : ""
    };

    delete normalized.completed;
    return normalized;
}

function setStatus(task, status) {
    task.status = status;
    if (status === "done") {
        task.completedOn = getDateStr(new Date());
        recordCompletion();
    } else {
        delete task.completedOn;
        refreshTodayStreak();
    }
}

// focusSelector keeps keyboard focus on the same control after the list redraws
function changeStatus(id, status, focusSelector) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;

    setStatus(task, status);
    if (status === "done") justCompletedId = id;
    allowConfetti = true;

    saveTasks();
    render();

    justCompletedId = null;
    allowConfetti = false;

    if (focusSelector) {
        const li = taskList.querySelector('[data-id="' + id + '"]');
        const target = li && li.querySelector(focusSelector);
        if (target) target.focus();
    }
}

/* =========================================================
   SAVING AND LOADING
   ========================================================= */
function saveTasks() {
    writeJSON(STORAGE_KEY, tasks);
}

function loadTasks() {
    const saved = readJSON(STORAGE_KEY);

    if (!Array.isArray(saved)) {
        tasks = [];
        return;
    }

    let maxId = saved.reduce(
        (max, t) => (t && Number.isInteger(t.id) ? Math.max(max, t.id) : max),
        0
    );

    tasks = saved
        .filter((t) => t && typeof t.text === "string")
        .map((t) => ({ ...normalizeTask(t), id: Number.isInteger(t.id) ? t.id : ++maxId }))
        .filter((t) => t.text);

    nextId = maxId + 1;
}

function saveTrash() {
    writeJSON(TRASH_KEY, trash);
}

function loadTrash() {
    const saved = readJSON(TRASH_KEY);
    trash = Array.isArray(saved)
        ? saved.filter((t) => t && typeof t.text === "string" && t.text.trim()).map(normalizeTask)
        : [];
}

/* =========================================================
   TRASH
   ========================================================= */
function moveToTrash(list) {
    trash.push(...list);
    saveTrash();
}

function restoreTask(index) {
    const task = trash[index];
    if (!task) return;

    if (isDuplicateTask(task.text)) {
        showToast('"' + shorten(task.text) + '" is already on your list. Rename or delete it first, then restore.');
        return;
    }

    trash.splice(index, 1);
    tasks.push({ ...task, id: nextId++ });

    if (isDone(task) && task.completedOn === getDateStr(new Date())) recordCompletion();

    saveTasks();
    saveTrash();
    render();
}

function restoreAll() {
    const skipped = [];

    trash.forEach((task) => {
        if (isDuplicateTask(task.text)) {
            skipped.push(task);
        } else {
            tasks.push({ ...task, id: nextId++ });
            if (isDone(task) && task.completedOn === getDateStr(new Date())) recordCompletion();
        }
    });

    trash = skipped;
    saveTasks();
    saveTrash();
    render();

    if (skipped.length > 0) {
        showToast(skipped.length + " task(s) were not restored because they already exist on your list.");
    } else {
        showToast("All deleted tasks were restored.");
    }
}

function emptyTrash() {
    if (trash.length === 0) return;
    if (!confirm("Permanently delete " + trash.length + " task(s)? This cannot be undone.")) return;
    trash = [];
    saveTrash();
    render();
}

function renderTrash() {
    trashToggleBtn.innerHTML = ICON.trash + '<span class="trash-count">' + trash.length + "</span>";

    const label = "Open trash (" + trash.length + ")";
    trashToggleBtn.title = label;
    trashToggleBtn.setAttribute("aria-label", label);
    trashToggleBtn.setAttribute("aria-haspopup", "dialog");

    if (trashOpen && !trashPanel.open) trashPanel.showModal();
    if (!trashOpen && trashPanel.open) trashPanel.close();

    trashList.innerHTML = "";

    if (trash.length === 0) {
        const empty = document.createElement("li");
        empty.className = "trash-text";
        empty.textContent = "Trash is empty.";
        trashList.appendChild(empty);
    }

    trash.forEach((task, index) => {
        const li = document.createElement("li");
        li.className = "trash-item";

        const text = document.createElement("span");
        text.className = "trash-text";
        text.textContent = task.text;

        const restoreBtn = document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.className = "icon-btn";
        restoreBtn.textContent = "Restore";
        restoreBtn.addEventListener("click", () => restoreTask(index));

        li.appendChild(text);
        li.appendChild(restoreBtn);
        trashList.appendChild(li);
    });
}

trashToggleBtn.addEventListener("click", () => {
    trashOpen = true;
    renderTrash();
});

$("closeTrashBtn").addEventListener("click", () => {
    trashOpen = false;
    renderTrash();
});

trashPanel.addEventListener("close", () => {
    trashOpen = false;
});

trashPanel.addEventListener("click", (event) => {
    if (event.target === trashPanel) {
        trashOpen = false;
        renderTrash();
    }
});

restoreAllBtn.addEventListener("click", restoreAll);
emptyTrashBtn.addEventListener("click", emptyTrash);

/* =========================================================
   FORM, VALIDATION
   ========================================================= */
// Errors show under the input and keep what the user typed
function showFormError(message) {
    formError.textContent = message || "";
    formError.hidden = !message;
    taskInput.classList.toggle("invalid", Boolean(message));
    taskInput.setAttribute("aria-invalid", String(Boolean(message)));
}

function updateCharCount() {
    const length = taskInput.value.length;
    charCount.textContent = length + " / 120";
    charCount.classList.toggle("near-limit", length >= 100);
}

function isDuplicateTask(text, excludeId = null) {
    const normalized = text.trim().toLowerCase();
    return tasks.some((t) => t.id !== excludeId && t.text.trim().toLowerCase() === normalized);
}

taskInput.addEventListener("input", () => {
    showFormError(null);
    updateCharCount();
});

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask();
});

function addTask() {
    const text = taskInput.value.trim();

    if (text === "") {
        showFormError("Please describe the task before adding it.");
        taskInput.focus();
        return;
    }

    if (isDuplicateTask(text)) {
        showFormError("That task is already on your list. Try a different name.");
        taskInput.focus();
        return;
    }

    const task = {
        id: nextId++,
        text,
        status: "pending",
        category: categoryInput.value,
        priority: priorityInput.value,
        dueDate: dueDateInput.value || null
    };

    setStatus(task, statusInput.value);
    tasks.push(task);

    showFormError(null);
    taskInput.value = "";
    updateCharCount();
    statusInput.value = "pending";
    priorityInput.value = "medium";
    categoryInput.value = "";
    dueDateInput.value = "";
    taskInput.focus();

    saveTasks();
    render();
}

/* =========================================================
   STREAK
   ========================================================= */
function loadStreak() {
    const saved = readJSON(STREAK_KEY);
    streakDays = Array.isArray(saved)
        ? [...new Set(saved.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))]
        : [];
}

function recordCompletion() {
    const today = getDateStr(new Date());
    if (streakDays.includes(today)) return;
    streakDays.push(today);
    writeJSON(STREAK_KEY, streakDays);
}

function calculateStreak() {
    const day = new Date();
    if (!streakDays.includes(getDateStr(day))) day.setDate(day.getDate() - 1);

    let count = 0;
    while (streakDays.includes(getDateStr(day))) {
        count++;
        day.setDate(day.getDate() - 1);
    }
    return count;
}

function renderStreak() {
    const count = calculateStreak();
    streakEl.textContent = count > 0 ? "\uD83D\uDD25 " + count + "-day streak" : "Finish a task to start your streak";
}

function refreshTodayStreak() {
    const today = getDateStr(new Date());
    if (tasks.some((t) => t.completedOn === today)) return;
    if (!streakDays.includes(today)) return;
    streakDays = streakDays.filter((d) => d !== today);
    writeJSON(STREAK_KEY, streakDays);
}

/* =========================================================
   MOVING, DELETING, BULK ACTIONS, TOAST
   ========================================================= */
function moveTask(id, direction) {
    const from = tasks.findIndex((t) => t.id === id);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= tasks.length) return;

    const [moved] = tasks.splice(from, 1);
    tasks.splice(to, 0, moved);
    saveTasks();
    render();
}

function shorten(text) {
    return text.length > 30 ? text.slice(0, 30) + "\u2026" : text;
}

function hideToast() {
    toastEl.hidden = true;
}

function showToast(message, actionLabel, onAction) {
    clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toastAction.hidden = !actionLabel;
    toastAction.textContent = actionLabel || "";
    toastAction.onclick = () => {
        hideToast();
        if (onAction) onAction();
    };
    toastEl.hidden = false;
    toastTimer = setTimeout(hideToast, 6000);
}

function undoDelete(task, index) {
    if (isDuplicateTask(task.text)) {
        showToast('"' + shorten(task.text) + '" is already on your list, so it cannot be restored.');
        return;
    }

    const trashIndex = trash.indexOf(task);
    if (trashIndex !== -1) trash.splice(trashIndex, 1);

    tasks.splice(Math.min(index, tasks.length), 0, task);

    if (isDone(task) && task.completedOn === getDateStr(new Date())) recordCompletion();

    saveTasks();
    saveTrash();
    render();
}

function deleteTask(id, li) {
    if (li.classList.contains("removing")) return;

    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;

    const task = tasks[index];
    li.classList.add("removing");

    setTimeout(() => {
        moveToTrash([task]);
        tasks = tasks.filter((t) => t.id !== id);
        refreshTodayStreak();
        saveTasks();
        render();
        showToast('Deleted "' + shorten(task.text) + '"', "Undo", () => undoDelete(task, index));
    }, 180);
}

clearCompletedBtn.addEventListener("click", () => {
    const done = tasks.filter(isDone);

    if (done.length === 0) {
        showToast("There are no completed tasks to clear.");
        return;
    }

    if (!confirm("Move " + done.length + " completed task(s) to Trash?")) return;

    moveToTrash(done);
    tasks = tasks.filter((t) => !isDone(t));
    refreshTodayStreak();
    saveTasks();
    render();
    showToast(done.length + " completed task(s) moved to Trash.");
});

toggleAllBtn.addEventListener("click", () => {
    const allDone = tasks.every(isDone);
    tasks.forEach((t) => setStatus(t, allDone ? "pending" : "done"));
    refreshTodayStreak();
    allowConfetti = true;
    saveTasks();
    render();
    allowConfetti = false;
});

/* =========================================================
   EDITING
   ========================================================= */
function buildSelect(options, selected, label) {
    const select = document.createElement("select");
    select.setAttribute("aria-label", label);

    options.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    });

    select.value = selected;
    return select;
}

function startEditing(li, task) {
    if (li.querySelector(".edit-form")) return;

    li.draggable = false;

    const body = li.querySelector(".task-body");
    const actions = li.querySelector(".task-actions");
    const checkBtn = li.querySelector(".check-btn");

    body.innerHTML = "";
    actions.style.display = "none";
    if (checkBtn) checkBtn.style.display = "none";

    const form = document.createElement("div");
    form.className = "edit-form";

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "task-edit-input";
    textInput.value = task.text;
    textInput.maxLength = 120;
    textInput.setAttribute("aria-label", "Task text");

    const statusSelect = buildSelect(STATUS_OPTIONS, task.status, "Status");
    const prioritySelect = buildSelect(PRIORITY_OPTIONS, task.priority, "Priority");
    const categorySelect = buildSelect(CATEGORY_OPTIONS, task.category || "", "Category");

    const dateField = document.createElement("input");
    dateField.type = "date";
    dateField.value = task.dueDate || "";
    dateField.setAttribute("aria-label", "Due date");

    const buttons = document.createElement("div");
    buttons.className = "edit-buttons";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "save-btn";
    saveBtn.textContent = "Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "icon-btn";
    cancelBtn.textContent = "Cancel";

    function save() {
        const newText = textInput.value.trim();

        if (newText === "") {
            showToast("A task can't be empty.");
            textInput.focus();
            return;
        }

        if (isDuplicateTask(newText, task.id)) {
            showToast("That task is already on your list.");
            textInput.focus();
            return;
        }

        task.text = newText;
        task.priority = prioritySelect.value;
        task.category = categorySelect.value;
        task.dueDate = dateField.value || null;

        if (statusSelect.value !== task.status) setStatus(task, statusSelect.value);

        saveTasks();
        render();
    }

    saveBtn.addEventListener("click", save);
    cancelBtn.addEventListener("click", () => render());

    form.addEventListener("keydown", (event) => {
        const tag = event.target.tagName;
        if (event.key === "Enter" && tag !== "SELECT" && tag !== "BUTTON") {
            event.preventDefault();
            save();
        }
        if (event.key === "Escape") render();
    });

    buttons.appendChild(saveBtn);
    buttons.appendChild(cancelBtn);

    form.appendChild(textInput);
    form.appendChild(statusSelect);
    form.appendChild(prioritySelect);
    form.appendChild(categorySelect);
    form.appendChild(dateField);
    form.appendChild(buttons);

    body.appendChild(form);
    textInput.focus();
    textInput.select();
}

/* =========================================================
   FILTERS, SORTING, SEARCH
   ========================================================= */
filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        filterButtons.forEach((b) => {
            const isActive = b === btn;
            b.classList.toggle("active", isActive);
            b.setAttribute("aria-pressed", String(isActive));
        });
        render();
    });
});

function sortTasks(list) {
    const copy = [...list];
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    if (sortBy === "priority") {
        copy.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }
    if (sortBy === "due") {
        copy.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    }
    if (sortBy === "status") {
        copy.sort((a, b) => STATUS_IDS.indexOf(a.status) - STATUS_IDS.indexOf(b.status));
    }
    return copy;
}

sortInput.addEventListener("change", () => {
    sortBy = sortInput.value;
    render();
});

categoryFilter.addEventListener("change", () => {
    activeCategory = categoryFilter.value;
    render();
});

searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    render();
});

function getVisibleTasks() {
    let list = tasks;
    if (activeFilter !== "all") list = list.filter((t) => t.status === activeFilter);
    if (searchQuery) {
        list = list.filter(
            (t) =>
                t.text.toLowerCase().includes(searchQuery) ||
                (t.note || "").toLowerCase().includes(searchQuery)
        );
    }
    if (activeCategory !== "all") list = list.filter((t) => t.category === activeCategory);
    return sortTasks(list);
}

/* =========================================================
   RENDERING
   ========================================================= */
function launchConfetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const colors = ["#4f46e5", "#f59e0b", "#10b981", "#ef4444", "#0ea5e9", "#ec4899"];

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.background = colors[i % colors.length];
        piece.style.animationDelay = Math.random() * 0.5 + "s";
        piece.style.animationDuration = 2 + Math.random() * 1.5 + "s";
        piece.style.setProperty("--drift", Math.random() * 200 - 100 + "px");
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 4500);
    }
}

function countByStatus() {
    const counts = { all: tasks.length, pending: 0, progress: 0, hold: 0, done: 0 };
    tasks.forEach((t) => counts[t.status]++);
    return counts;
}

function updateFilterCounts() {
    const counts = countByStatus();
    filterButtons.forEach((btn) => {
        const name = btn.dataset.filter;
        btn.textContent = "";

        // Status tabs show icon + label + progress blocks + count, all in one place
        btn.append(name === "all" ? "All" : STATUS_ICON[name] + " " + STATUS_LABELS[name]);

        if (name !== "all") {
            const blocks = document.createElement("span");
            blocks.className = "chip-blocks";
            blocks.setAttribute("aria-hidden", "true");
            for (let i = 1; i <= 4; i++) {
                const seg = document.createElement("span");
                seg.className = "chip-seg" + (i <= STATUS_STEPS[name] ? " filled " + name : "");
                blocks.appendChild(seg);
            }
            btn.appendChild(blocks);
        }

        const count = document.createElement("span");
        count.className = "filter-count";
        count.textContent = counts[name];
        btn.appendChild(count);
    });
}

function makeChip(label, count, extraClass) {
    const chip = document.createElement("span");
    chip.className = "summary-chip" + (extraClass ? " " + extraClass : "");
    const name = document.createElement("span");
    name.textContent = label;
    const num = document.createElement("b");
    num.textContent = count;
    chip.appendChild(name);
    return { chip, num };
}

function renderStatusSummary() {
    // Status counts now live in the tabs above; only the overdue count stays here
    statusSummary.innerHTML = "";
    const overdueCount = tasks.filter(isOverdue).length;
    const { chip, num } = makeChip("⚠ Overdue", overdueCount, overdueCount > 0 ? "has-overdue" : "");
    chip.appendChild(num);
    statusSummary.appendChild(chip);
}

function updateEmptyState(visibleTasks) {
    if (visibleTasks.length > 0) {
        emptyState.hidden = true;
        return;
    }

    emptyState.hidden = false;

    const set = (i, t, p) => {
        emptyIcon.textContent = i;
        emptyTitle.textContent = t;
        emptyText.textContent = p;
    };

    if (searchQuery) return set("🔍", "No matching tasks", "Try a different search or check your spelling.");
    if (activeCategory !== "all") return set("📂", "No tasks in this category", "Try another category or add a new task.");
    if (activeFilter === "done") return set("✅", "No completed tasks", "Complete a task and it will appear here.");
    if (activeFilter === "pending") return set("⏳", "No pending tasks", "You're all caught up!");
    if (activeFilter === "progress") return set("🚀", "Nothing in progress", "Start a task to see it here.");
    if (activeFilter === "hold") return set("⏸️", "Nothing on hold", "Tasks placed on hold will appear here.");
    set("📝", "No tasks yet", "Add your first task and start being productive!");
}

function render() {
    const visibleTasks = getVisibleTasks();

    taskList.innerHTML = "";
    visibleTasks.forEach((task) => taskList.appendChild(buildTaskItem(task)));

    updateEmptyState(visibleTasks);

    clearCompletedBtn.hidden = !tasks.some(isDone);
    toggleAllBtn.hidden = tasks.length === 0;
    toggleAllBtn.textContent = tasks.every(isDone) ? "Reopen all" : "Mark all done";

    const allDone = tasks.length > 0 && tasks.every(isDone);
    allDoneMsg.hidden = !allDone;

    if (allDone && wasAllDone === false && allowConfetti) launchConfetti();
    wasAllDone = allDone;

    renderStreak();
    updateFilterCounts();
    renderStatusSummary();
    renderTrash();
    updateProgress();
}

function updateProgress() {
    const total = tasks.length;
    const done = tasks.filter(isDone).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    progressLabel.textContent = done + " of " + total + " tasks done";
    progressPercent.textContent = percent + "%";
    progressRing.style.strokeDashoffset = RING_LENGTH * (1 - percent / 100);
    progressPercent.closest(".progress-ring").setAttribute("aria-valuenow", percent);
}

/* =========================================================
   DRAG AND DROP
   ========================================================= */
function setupDrag(li, task) {
    li.draggable = true;
    li.classList.add("draggable");

    li.addEventListener("dragstart", (event) => {
        dragId = task.id;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(task.id));
        setTimeout(() => li.classList.add("dragging"), 0);
    });

    li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        dragId = null;
        document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    });

    li.addEventListener("dragover", (event) => {
        if (dragId === null) return;
        event.preventDefault();
        li.classList.add("drag-over");
    });

    li.addEventListener("dragleave", () => li.classList.remove("drag-over"));

    li.addEventListener("drop", (event) => {
        event.preventDefault();
        li.classList.remove("drag-over");

        if (dragId === null || dragId === task.id) return;

        const from = tasks.findIndex((t) => t.id === dragId);
        const to = tasks.findIndex((t) => t.id === task.id);
        dragId = null;

        if (from === -1 || to === -1) return;

        const [moved] = tasks.splice(from, 1);
        tasks.splice(to, 0, moved);
        saveTasks();
        render();
    });
}

/* =========================================================
   TASK CARD
   ========================================================= */
function iconButton(className, html, label, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn " + className;
    btn.innerHTML = html;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.addEventListener("click", onClick);
    return btn;
}

function buildTaskItem(task) {
    const canReorder = sortBy === "added" && activeFilter === "all" && !searchQuery && activeCategory === "all";
    const done = isDone(task);

    const li = document.createElement("li");
    li.dataset.id = task.id;
    li.className =
        "task-item priority-" + task.priority +
        " status-" + task.status +
        (task.id === justCompletedId ? " just-completed" : "");

    /* ---------- Quick-complete checkbox ---------- */
    const check = document.createElement("button");
    check.type = "button";
    check.className = "check-btn" + (done ? " checked" : "");
    check.innerHTML = ICON.check;
    check.setAttribute("role", "checkbox");
    check.setAttribute("aria-checked", String(done));
    check.setAttribute("aria-label", (done ? "Mark as pending: " : "Mark as done: ") + task.text);
    check.title = done ? "Mark as pending" : "Mark as done";
    check.addEventListener("click", () => changeStatus(task.id, done ? "pending" : "done", ".check-btn"));

    /* ---------- Body ---------- */
    const body = document.createElement("div");
    body.className = "task-body";

    // Title + priority + category
    const titleRow = document.createElement("div");
    titleRow.className = "task-title-row";

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;
    titleRow.appendChild(span);

    const priorityBadge = document.createElement("span");
    priorityBadge.className = "priority-badge " + task.priority;
    priorityBadge.textContent =
        PRIORITY_ICON[task.priority] + " " + task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    titleRow.appendChild(priorityBadge);

    if (task.category) {
        const categoryBadge = document.createElement("span");
        categoryBadge.className = "category-badge cat-" + task.category.toLowerCase();
        categoryBadge.textContent = task.category;
        titleRow.appendChild(categoryBadge);
    }

    body.appendChild(titleRow);

    // Status (click to advance) + 4 progress blocks
    const statusRow = document.createElement("div");
    statusRow.className = "task-status-row";

    const statusBtn = document.createElement("button");
    statusBtn.type = "button";
    statusBtn.className = "status-display " + task.status;
    statusBtn.textContent = STATUS_ICON[task.status] + " " + STATUS_LABELS[task.status];
    statusBtn.title = "Click to change status";
    statusBtn.setAttribute(
        "aria-label",
        "Status: " + STATUS_LABELS[task.status] + ". Click to change to " + STATUS_LABELS[NEXT_STATUS[task.status]]
    );
    statusBtn.addEventListener("click", () => changeStatus(task.id, NEXT_STATUS[task.status], ".status-display"));
    statusRow.appendChild(statusBtn);

    const steps = STATUS_STEPS[task.status];
    const progress = document.createElement("div");
    progress.className = "task-progress";
    progress.setAttribute("role", "img");
    progress.setAttribute("aria-label", STATUS_LABELS[task.status] + ": " + steps + " of 4");

    for (let i = 1; i <= 4; i++) {
        const seg = document.createElement("span");
        seg.className = "task-seg" + (i <= steps ? " filled " + task.status : "");
        progress.appendChild(seg);
    }

    statusRow.appendChild(progress);
    body.appendChild(statusRow);

    // Due date
    if (task.dueDate) {
        const detailsRow = document.createElement("div");
        detailsRow.className = "task-details-row";

        const overdue = isOverdue(task);
        const dueToday = !done && task.dueDate === getDateStr(new Date());

        const due = document.createElement("span");
        due.className = "task-due" + (overdue ? " overdue" : "") + (dueToday ? " due-today" : "");
        due.textContent = overdue ? "⚠ Overdue — " + formatDueDate(task.dueDate) : getDueText(task);
        detailsRow.appendChild(due);

        if (dueToday) li.classList.add("due-today");
        body.appendChild(detailsRow);
    }

    /* ---------- Actions ---------- */
    const actions = document.createElement("div");
    actions.className = "task-actions";

    if (canReorder) {
        const position = tasks.indexOf(task);

        const upBtn = iconButton("move-btn", "↑", "Move task up", () => moveTask(task.id, -1));
        upBtn.disabled = position === 0;

        const downBtn = iconButton("move-btn", "↓", "Move task down", () => moveTask(task.id, 1));
        downBtn.disabled = position === tasks.length - 1;

        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
    }

    const hasNote = Boolean((task.note || "").trim());
    actions.appendChild(
        iconButton("note-btn" + (hasNote ? " has-note" : ""), ICON.note, hasNote ? "Edit note" : "Add note", () => openNote(task.id))
    );
    actions.appendChild(iconButton("edit", ICON.edit, "Edit task", () => startEditing(li, task)));
    actions.appendChild(iconButton("delete", ICON.trash, "Delete task", () => deleteTask(task.id, li)));

    /* ---------- Layout ---------- */
    if (canReorder) {
        const handle = document.createElement("span");
        handle.className = "drag-handle";
        handle.textContent = "⋮⋮";
        handle.title = "Drag to reorder";
        handle.setAttribute("aria-hidden", "true");
        li.appendChild(handle);
    }

    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(actions);

    if (canReorder) setupDrag(li, task);

    return li;
}

/* =========================================================
   NOTE POP-UP CARD
   ========================================================= */
const notePanel = $("notePanel");
const noteTaskName = $("noteTaskName");
const noteText = $("noteText");
const noteCount = $("noteCount");
let noteTaskId = null;

function updateNoteCount() {
    noteCount.textContent = noteText.value.length + " / 500";
}

function openNote(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    noteTaskId = id;
    noteTaskName.textContent = task.text;
    noteText.value = task.note || "";
    updateNoteCount();
    notePanel.showModal();
    noteText.focus();
}

function finishNote(message) {
    const id = noteTaskId;
    notePanel.close();
    noteTaskId = null;

    const btn = taskList.querySelector('[data-id="' + id + '"] .note-btn');
    if (btn) btn.focus();
    if (message) showToast(message);
}

function saveNote(clear) {
    const task = tasks.find((t) => t.id === noteTaskId);
    if (!task) {
        notePanel.close();
        return;
    }

    task.note = clear ? "" : noteText.value.trim();
    saveTasks();
    render();
    finishNote(clear ? "Note cleared." : task.note ? "Note saved." : "");
}

noteText.addEventListener("input", updateNoteCount);

// Ctrl/Cmd + Enter saves
noteText.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        saveNote(false);
    }
});

$("saveNoteBtn").addEventListener("click", () => saveNote(false));
$("clearNoteBtn").addEventListener("click", () => saveNote(true));
$("cancelNoteBtn").addEventListener("click", () => notePanel.close());
$("closeNoteBtn").addEventListener("click", () => notePanel.close());