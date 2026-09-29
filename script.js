const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const dueDateInput = document.getElementById("dueDateInput");
const formError = document.getElementById("formError");
const charCount = document.getElementById("charCount");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyIcon = document.getElementById("emptyIcon");
const emptyText = document.getElementById("emptyText");
const filterButtons = document.querySelectorAll(".filter-btn");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const toggleAllBtn = document.getElementById("toggleAllBtn");
const searchInput = document.getElementById("searchInput");
const sortInput = document.getElementById("sortInput");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const progressRing = document.getElementById("progressRing");
const allDoneMsg = document.getElementById("allDoneMsg");
const todayDateEl = document.getElementById("todayDate");
const quoteEl = document.getElementById("quote");
const trashToggleBtn = document.getElementById("trashToggleBtn");
const trashPanel = document.getElementById("trashPanel");
const trashList = document.getElementById("trashList");
const restoreAllBtn = document.getElementById("restoreAllBtn");
const emptyTrashBtn = document.getElementById("emptyTrashBtn");
const streakEl = document.getElementById("streak");
const categoryInput = document.getElementById("categoryInput");
const categoryFilter = document.getElementById("categoryFilter");
const bgSelect = document.getElementById("bgSelect");
const themeButtons = document.querySelectorAll(".theme-btn");
const toastEl = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");
const toastAction = document.getElementById("toastAction");

const STORAGE_KEY = "taskflow.tasks";
const THEME_KEY = "taskflow.theme";
const TRASH_KEY = "taskflow.trash";
const STREAK_KEY = "taskflow.streakDays";
const BG_KEY = "taskflow.background";
const QUOTE_API = "https://dummyjson.com/quotes/random";
const RING_LENGTH = 113.1; // circle circumference (2 x pi x 18)

// Fallback quotes, used if the API can't be reached
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

const PRIORITY_OPTIONS = [["low", "Low"], ["medium", "Medium"], ["high", "High"]];
const CATEGORY_OPTIONS = [["", "No category"], ["School", "School"], ["Home", "Home"], ["Work", "Work"], ["Personal", "Personal"]];

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
render();

function showLocalQuote() {
    const index = Math.floor(Math.random() * QUOTES.length);
    quoteEl.textContent = "\u201C" + QUOTES[index] + "\u201D";
}

// Homework: fetch a random quote from an API and show it on the page
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

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.theme === theme);
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
    if (name === "default") {
        document.body.removeAttribute("data-bg");
    } else {
        document.body.setAttribute("data-bg", name);
    }
    bgSelect.value = name;
}

function loadBackground() {
    let name = "default";
    try {
        const saved = localStorage.getItem(BG_KEY);
        const allowed = ["default", "sunset", "ocean", "forest", "lavender", "dots"];
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

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
        console.error("Could not save tasks:", err);
    }
}

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(saved)) {
            tasks = [];
            return;
        }
        tasks = saved.map((t) => ({
            ...t,
            id: nextId++,
            text: typeof t.text === "string" ? t.text.trim() : "",
            completed: Boolean(t.completed),
            completedOn: typeof t.completedOn === "string" ? t.completedOn : undefined,
            category: typeof t.category === "string" ? t.category : "",
            priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
            dueDate: typeof t.dueDate === "string" && t.dueDate ? t.dueDate : null,
        })).filter((t) => t.text);
    } catch (err) {
        console.error("Could not load saved tasks:", err);
        tasks = [];
    }
}

function saveTrash() {
    try {
        localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
    } catch (err) {
        console.error("Could not save trash:", err);
    }
}

function loadTrash() {
    try {
        const saved = JSON.parse(localStorage.getItem(TRASH_KEY));
        trash = Array.isArray(saved) ? saved.filter((t) => t && typeof t.text === "string" && t.text.trim()) : [];
    } catch (err) {
        console.error("Could not load trash:", err);
        trash = [];
    }
}

function moveToTrash(list) {
    trash.push(...list);
    saveTrash();
}

function restoreTask(index) {
    const task = trash[index];
    if (!task) return;

    // Don't restore a task that already exists on the list
    if (isDuplicateTask(task.text)) {
        alert('"' + task.text + '" is already on your list. Rename or delete it first, then restore.');
        return;
    }

    trash.splice(index, 1);
    tasks.push({ ...task, id: nextId++ });
    if (task.completed && task.completedOn === getDateStr(new Date())) recordCompletion();
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
            if (task.completed && task.completedOn === getDateStr(new Date())) recordCompletion();
        }
    });

    trash = skipped; // duplicates stay in the trash
    saveTasks();
    saveTrash();
    render();

    if (skipped.length > 0) {
        alert(skipped.length + " task(s) were not restored because they already exist on your list.");
    }
}

function emptyTrash() {
    if (trash.length === 0) return; // nothing to delete
    if (!confirm("Permanently delete " + trash.length + " task(s)? This cannot be undone.")) return;
    trash = [];
    saveTrash();
    render();
}

function renderTrash() {
    trashToggleBtn.textContent = (trashOpen ? "Hide trash" : "Trash") + " (" + trash.length + ")";
    trashPanel.hidden = !trashOpen;

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
        restoreBtn.className = "icon-btn";
        restoreBtn.textContent = "Restore";
        restoreBtn.addEventListener("click", () => restoreTask(index));

        li.appendChild(text);
        li.appendChild(restoreBtn);
        trashList.appendChild(li);
    });
}

trashToggleBtn.addEventListener("click", () => {
    trashOpen = !trashOpen;
    renderTrash();
});

restoreAllBtn.addEventListener("click", restoreAll);
emptyTrashBtn.addEventListener("click", emptyTrash);

function showTodaysDate() {
    const today = new Date();
    todayDateEl.textContent = today.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}

function showFormError(message) {
    if (!message) {
        formError.hidden = true;
        taskInput.classList.remove("invalid");
        return;
    }
    formError.textContent = message;
    formError.hidden = false;
    taskInput.classList.add("invalid");
}

function updateCharCount() {
    const length = taskInput.value.length;
    charCount.textContent = length + " / 120";
    charCount.classList.toggle("near-limit", length >= 100);
}

// excludeId lets the edit feature ignore the task being edited
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
        // Requirement: alert the user if the field is empty
        alert("Please enter a task before adding it.");
        showFormError("Please describe the task before adding it.");
        taskInput.focus();
        return;
    }

    if (isDuplicateTask(text)) {
        showFormError("That task is already on your list.");
        taskInput.focus();
        return;
    }

    tasks.push({
        id: nextId++,
        text,
        completed: false,
        category: categoryInput.value,
        priority: priorityInput.value,
        dueDate: dueDateInput.value || null,
    });

    showFormError(null);
    taskInput.value = "";
    updateCharCount();
    priorityInput.value = "medium";
    categoryInput.value = "";
    dueDateInput.value = "";
    taskInput.focus();

    saveTasks();
    render();
}

function getDateStr(date) {
    return (
        date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0")
    );
}

function loadStreak() {
    try {
        const saved = JSON.parse(localStorage.getItem(STREAK_KEY));
        streakDays = Array.isArray(saved)
            ? [...new Set(saved.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))]
            : [];
    } catch (err) {
        console.error("Could not load streak:", err);
        streakDays = [];
    }
}

function recordCompletion() {
    const today = getDateStr(new Date());
    if (streakDays.includes(today)) return;
    streakDays.push(today);
    try {
        localStorage.setItem(STREAK_KEY, JSON.stringify(streakDays));
    } catch (err) {
        console.error("Could not save streak:", err);
    }
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
    streakEl.textContent = count > 0
        ? "\uD83D\uDD25 " + count + "-day streak"
        : "Complete a task to start your streak";
}

// If nothing is completed today anymore, take today back off the streak
function refreshTodayStreak() {
    const today = getDateStr(new Date());
    if (tasks.some((t) => t.completedOn === today)) return;
    if (!streakDays.includes(today)) return;
    streakDays = streakDays.filter((d) => d !== today);
    try {
        localStorage.setItem(STREAK_KEY, JSON.stringify(streakDays));
    } catch (err) {
        console.error("Could not save streak:", err);
    }
}

function setCompleted(task, value) {
    task.completed = value;
    if (value) {
        task.completedOn = getDateStr(new Date());
        recordCompletion();
    } else {
        delete task.completedOn;
        refreshTodayStreak();
    }
}

// Move a task up (-1) or down (+1) in the list (for touch screens)
function moveTask(id, direction) {
    const from = tasks.findIndex((t) => t.id === id);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= tasks.length) return;
    const [moved] = tasks.splice(from, 1);
    tasks.splice(to, 0, moved);
    saveTasks();
    render();
}

function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setCompleted(task, !task.completed);
    if (task.completed) justCompletedId = id;
    allowConfetti = true;
    saveTasks();
    render();
    justCompletedId = null;
    allowConfetti = false;
}

/* ---------- Undo toast ---------- */

function shorten(text) {
    return text.length > 30 ? text.slice(0, 30) + "\u2026" : text;
}

function hideToast() {
    toastEl.hidden = true;
}

function showToast(message, actionLabel, onAction) {
    clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toastAction.textContent = actionLabel;
    toastAction.onclick = () => {
        hideToast();
        onAction();
    };
    toastEl.hidden = false;
    toastTimer = setTimeout(hideToast, 6000);
}

function undoDelete(task, index) {
    if (isDuplicateTask(task.text)) {
        alert('"' + task.text + '" is already on your list, so it cannot be restored.');
        return;
    }
    const trashIndex = trash.indexOf(task);
    if (trashIndex !== -1) trash.splice(trashIndex, 1);
    tasks.splice(Math.min(index, tasks.length), 0, task);
    if (task.completed && task.completedOn === getDateStr(new Date())) recordCompletion();
    saveTasks();
    saveTrash();
    render();
}

function deleteTask(id, li) {
    // Ignore clicks while the delete animation is already running
    if (li.classList.contains("removing")) return;

    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    const task = tasks[index];

    // Ask before deleting (the Undo toast still appears afterwards)
    if (!confirm('Delete "' + task.text + '"?')) return;

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
    const done = tasks.filter((t) => t.completed);
    if (!confirm("Move " + done.length + " completed task(s) to Trash?")) return;
    moveToTrash(done);
    tasks = tasks.filter((t) => !t.completed);
    refreshTodayStreak();
    saveTasks();
    render();
});

toggleAllBtn.addEventListener("click", () => {
    const allDone = tasks.every((t) => t.completed);
    tasks.forEach((t) => setCompleted(t, !allDone));
    refreshTodayStreak();
    allowConfetti = true;
    saveTasks();
    render();
    allowConfetti = false;
});

/* ---------- Editing ---------- */

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
    body.innerHTML = "";
    actions.style.display = "none";

    const form = document.createElement("div");
    form.className = "edit-form";

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "task-edit-input";
    textInput.value = task.text;
    textInput.maxLength = 120;
    textInput.setAttribute("aria-label", "Task text");

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
            alert("A task can't be empty.");
            textInput.focus();
            return;
        }
        if (isDuplicateTask(newText, task.id)) {
            alert("That task is already on your list.");
            textInput.focus();
            return;
        }
        task.text = newText;
        task.priority = prioritySelect.value;
        task.category = categorySelect.value;
        task.dueDate = dateField.value || null;
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
    form.appendChild(prioritySelect);
    form.appendChild(categorySelect);
    form.appendChild(dateField);
    form.appendChild(buttons);
    body.appendChild(form);

    textInput.focus();
    textInput.select();
}

/* ---------- Filters, sorting, search ---------- */

filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        filterButtons.forEach((b) => {
            const isActive = b === btn;
            b.classList.toggle("active", isActive);
            b.setAttribute("aria-selected", String(isActive));
        });
        render();
    });
});

function sortTasks(list) {
    const copy = [...list];
    const order = { high: 0, medium: 1, low: 2 };
    if (sortBy === "priority") {
        copy.sort((a, b) => order[a.priority] - order[b.priority]);
    }
    if (sortBy === "due") {
        copy.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
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

function getVisibleTasks() {
    let list = tasks;
    if (activeFilter === "active") list = list.filter((t) => !t.completed);
    if (activeFilter === "completed") list = list.filter((t) => t.completed);
    if (searchQuery) list = list.filter((t) => t.text.toLowerCase().includes(searchQuery));
    if (activeCategory !== "all") list = list.filter((t) => t.category === activeCategory);
    return sortTasks(list);
}

searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    render();
});

/* ---------- Dates ---------- */

function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    return task.dueDate < getDateStr(new Date());
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

/* ---------- Rendering ---------- */

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

function updateFilterCounts() {
    const counts = {
        all: tasks.length,
        active: tasks.filter((t) => !t.completed).length,
        completed: tasks.filter((t) => t.completed).length,
    };
    filterButtons.forEach((btn) => {
        const name = btn.dataset.filter;
        const label = name.charAt(0).toUpperCase() + name.slice(1);
        btn.textContent = label + " (" + counts[name] + ")";
    });
}

function render() {
    const visibleTasks = getVisibleTasks();

    taskList.innerHTML = "";
    visibleTasks.forEach((task) => taskList.appendChild(buildTaskItem(task)));

    emptyState.hidden = visibleTasks.length !== 0;
    emptyIcon.textContent = tasks.length === 0 ? "\uD83D\uDCDD" : "\uD83D\uDD0D";
    emptyText.textContent =
        tasks.length === 0
            ? "No tasks yet \u2014 add one above to get started."
            : "Nothing to show in this view.";

    clearCompletedBtn.hidden = !tasks.some((t) => t.completed);
    toggleAllBtn.hidden = tasks.length === 0;
    toggleAllBtn.textContent = tasks.every((t) => t.completed) ? "Mark all active" : "Mark all complete";

    const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
    allDoneMsg.hidden = !allDone;
    // Confetti only when the list actually becomes fully complete (not on page load)
    if (allDone && wasAllDone === false && allowConfetti) launchConfetti();
    wasAllDone = allDone;

    renderStreak();
    updateFilterCounts();
    renderTrash();
    updateProgress();
}

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

function buildTaskItem(task) {
    const canReorder = sortBy === "added" && activeFilter === "all" && !searchQuery && activeCategory === "all";

    const li = document.createElement("li");
    li.className =
        "task-item priority-" + task.priority +
        (task.completed ? " completed" : "") +
        (task.id === justCompletedId ? " just-completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", 'Mark "' + task.text + '" as complete');
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const body = document.createElement("div");
    body.className = "task-body";

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;
    span.addEventListener("dblclick", () => startEditing(li, task));

    const priorityBadge = document.createElement("span");
    priorityBadge.className = "priority-badge " + task.priority;
    priorityBadge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    const topRow = document.createElement("div");
    topRow.className = "task-top";
    topRow.appendChild(span);
    topRow.appendChild(priorityBadge);

    if (task.category) {
        const categoryBadge = document.createElement("span");
        categoryBadge.className = "category-badge cat-" + task.category.toLowerCase();
        categoryBadge.textContent = task.category;
        topRow.appendChild(categoryBadge);
    }

    body.appendChild(topRow);

    if (task.dueDate) {
        const overdue = isOverdue(task);
        const dueToday = !task.completed && task.dueDate === getDateStr(new Date());

        const due = document.createElement("span");
        due.className = "task-due" + (overdue ? " overdue" : "") + (dueToday ? " due-today" : "");
        due.textContent = overdue ? "Overdue \u2014 " + formatDueDate(task.dueDate) : getDueText(task);
        body.appendChild(due);

        if (dueToday) li.classList.add("due-today");
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn edit";
    editBtn.textContent = "Edit";
    editBtn.setAttribute("aria-label", "Edit task");
    editBtn.addEventListener("click", () => startEditing(li, task));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", "Delete task");
    deleteBtn.addEventListener("click", () => deleteTask(task.id, li));

    // Up/down buttons so touch screens can reorder too (CSS shows them only on touch devices)
    if (canReorder) {
        const position = tasks.indexOf(task);

        const upBtn = document.createElement("button");
        upBtn.className = "icon-btn move-btn";
        upBtn.textContent = "\u2191";
        upBtn.setAttribute("aria-label", "Move task up");
        upBtn.disabled = position === 0;
        upBtn.addEventListener("click", () => moveTask(task.id, -1));

        const downBtn = document.createElement("button");
        downBtn.className = "icon-btn move-btn";
        downBtn.textContent = "\u2193";
        downBtn.setAttribute("aria-label", "Move task down");
        downBtn.disabled = position === tasks.length - 1;
        downBtn.addEventListener("click", () => moveTask(task.id, 1));

        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
    }

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    if (canReorder) {
        const handle = document.createElement("span");
        handle.className = "drag-handle";
        handle.textContent = "\u22EE\u22EE";
        handle.title = "Drag to reorder";
        handle.setAttribute("aria-hidden", "true");
        li.appendChild(handle);
    }

    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(actions);

    if (canReorder) {
        setupDrag(li, task);
    }

    return li;
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressLabel.textContent = completed + " of " + total + " tasks completed";
    progressPercent.textContent = percent + "%";
    progressRing.style.strokeDashoffset = RING_LENGTH * (1 - percent / 100);
    progressPercent.closest(".progress-ring").setAttribute("aria-valuenow", percent);
}