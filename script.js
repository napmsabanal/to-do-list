const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const dueDateInput = document.getElementById("dueDateInput");
const formError = document.getElementById("formError");
const charCount = document.getElementById("charCount");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const filterButtons = document.querySelectorAll(".filter-btn");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const toggleAllBtn = document.getElementById("toggleAllBtn");
const searchInput = document.getElementById("searchInput");
const sortInput = document.getElementById("sortInput");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const allDoneMsg = document.getElementById("allDoneMsg");
const todayDateEl = document.getElementById("todayDate");
const quoteEl = document.getElementById("quote");
const trashToggleBtn = document.getElementById("trashToggleBtn");
const trashPanel = document.getElementById("trashPanel");
const trashList = document.getElementById("trashList");
const restoreAllBtn = document.getElementById("restoreAllBtn");
const emptyTrashBtn = document.getElementById("emptyTrashBtn");

const STORAGE_KEY = "taskflow.tasks";
const THEME_KEY = "taskflow.theme";
const TRASH_KEY = "taskflow.trash";
const themeButtons = document.querySelectorAll(".theme-btn");
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

let tasks = [];
let nextId = 1;
let activeFilter = "all";
let searchQuery = "";
let sortBy = "added";
let trash = [];
let trashOpen = false;

showTodaysDate();
showRandomQuote();
loadTheme();
loadTasks();
loadTrash();
render();

function showRandomQuote() {
    const index = Math.floor(Math.random() * QUOTES.length);
    quoteEl.textContent = "“" + QUOTES[index] + "”";
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
        theme = localStorage.getItem(THEME_KEY) || "light";
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

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
        console.error("Could not save tasks:", err);
    }
}

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        tasks = saved.map((t) => ({ ...t, id: nextId++ }));
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
        trash = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
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
    const [task] = trash.splice(index, 1);
    tasks.push({ ...task, id: nextId++ });
    saveTasks();
    saveTrash();
    render();
}

function restoreAll() {
    trash.forEach((task) => tasks.push({ ...task, id: nextId++ }));
    trash = [];
    saveTasks();
    saveTrash();
    render();
}

function emptyTrash() {
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

function isDuplicateTask(text) {
    const normalized = text.trim().toLowerCase();
    return tasks.some((t) => t.text.trim().toLowerCase() === normalized);
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
        showFormError("That task is already on your list.");
        taskInput.focus();
        return;
    }

    tasks.push({
        id: nextId++,
        text,
        completed: false,
        priority: priorityInput.value,
        dueDate: dueDateInput.value || null,
    });

    showFormError(null);
    taskInput.value = "";
    updateCharCount();
    dueDateInput.value = "";
    taskInput.focus();

    saveTasks();
    render();
}

function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (task) task.completed = !task.completed;
    saveTasks();
    render();
}

function deleteTask(id, li) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const ok = confirm('Delete "' + task.text + '"? This cannot be undone.');
    if (!ok) return;

    li.classList.add("removing");
        setTimeout(() => {
        moveToTrash([task]);
        tasks = tasks.filter((t) => t.id !== id);
        saveTasks();
        render();
    }, 180);
}

clearCompletedBtn.addEventListener("click", () => {
    const done = tasks.filter((t) => t.completed);
    if (!confirm("Move " + done.length + " completed task(s) to Trash?")) return;
    moveToTrash(done);
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    render();
});

toggleAllBtn.addEventListener("click", () => {
    const allDone = tasks.every((t) => t.completed);
    tasks.forEach((t) => (t.completed = !allDone));
    saveTasks();
    render();
});


function startEditing(li, task) {
    if (li.querySelector(".task-edit-input")) return;

    const body = li.querySelector(".task-body");
    const span = body.querySelector(".task-text");
    const topRow = body.querySelector(".task-top");

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "task-edit-input";
    editInput.value = task.text;
    editInput.maxLength = 120;

    topRow.replaceChild(editInput, span);
    editInput.focus();
    editInput.select();

let finished = false;

function finishEditing(save) {
    if (finished) return;
    finished = true;
    const newText = editInput.value.trim();
    if (save && newText !== "") {
        task.text = newText;
        saveTasks();
    }
    render();
}

    editInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") finishEditing(true);
        if (event.key === "Escape") finishEditing(false);
    });

    editInput.addEventListener("blur", () => finishEditing(true));
}

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

function getVisibleTasks() {
    let list = tasks;
    if (activeFilter === "active") list = list.filter((t) => !t.completed);
    if (activeFilter === "completed") list = list.filter((t) => t.completed);
    if (searchQuery) list = list.filter((t) => t.text.toLowerCase().includes(searchQuery));
    return sortTasks(list);
}

searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    render();
});

function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const now = new Date();
    const todayStr =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");
    return task.dueDate < todayStr;
}

function formatDueDate(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function render() {
    const visibleTasks = getVisibleTasks();

    taskList.innerHTML = "";
    visibleTasks.forEach((task) => taskList.appendChild(buildTaskItem(task)));

    emptyState.hidden = visibleTasks.length !== 0;
    emptyState.textContent =
        tasks.length === 0
            ? "No tasks yet — add one above to get started."
            : "Nothing to show in this view.";

        clearCompletedBtn.hidden = !tasks.some((t) => t.completed);
        toggleAllBtn.hidden = tasks.length === 0;
        toggleAllBtn.textContent = tasks.every((t) => t.completed) ? "Mark all active" : "Mark all complete";
       
        allDoneMsg.hidden = !(tasks.length > 0 && tasks.every((t) => t.completed));

    renderTrash();
    updateProgress();
}

function buildTaskItem(task) {
    const li = document.createElement("li");
    li.className = "task-item priority-" + task.priority + (task.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task complete");
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const body = document.createElement("div");
    body.className = "task-body";

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;
    span.addEventListener("dblclick", () => startEditing(li, task));

        const badge = document.createElement("span");
    badge.className = "priority-badge " + task.priority;
    badge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    const topRow = document.createElement("div");
    topRow.className = "task-top";
    topRow.appendChild(span);
    topRow.appendChild(badge);

    body.appendChild(topRow);

    if (task.dueDate) {
        const due = document.createElement("span");
        due.className = "task-due" + (isOverdue(task) ? " overdue" : "");
        due.textContent = (isOverdue(task) ? "Overdue — " : "Due ") + formatDueDate(task.dueDate);
        body.appendChild(due);
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

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(actions);

    return li;
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressLabel.textContent = completed + " of " + total + " tasks completed";
    progressPercent.textContent = percent + "%";
    progressFill.style.width = percent + "%";
}

const BG_KEY = "taskflow.background";
const bgSelect = document.getElementById("bgSelect");

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
        name = localStorage.getItem(BG_KEY) || "default";
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

loadBackground();