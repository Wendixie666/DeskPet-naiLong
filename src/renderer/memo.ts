import {
  DEFAULT_TODO_DATE_DEADLINE_TIME,
  type AppTheme,
  type TodoDeadlinePrecision,
  type TodoItem,
} from "../shared/types.js";

const newTodoButton = document.querySelector<HTMLButtonElement>("#new-todo")!;
const listElement = document.querySelector<HTMLElement>("#todo-list")!;
const emptyState = document.querySelector<HTMLElement>("#empty-state")!;
const statusElement = document.querySelector<HTMLElement>("#status")!;

let todos: TodoItem[] = [];
let editingDeadlineId: string | undefined;
let focusTodoId: string | undefined;

function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

function showError(error: unknown): void {
  statusElement.classList.add("error");
  statusElement.textContent = error instanceof Error ? error.message : "操作失败";
}

function clearStatus(): void {
  statusElement.classList.remove("error");
  statusElement.textContent = "";
}

function formatDeadline(todo: TodoItem): string {
  const deadline = new Date(todo.deadline!);
  const date = `${String(deadline.getMonth() + 1).padStart(2, "0")}/${String(
    deadline.getDate(),
  ).padStart(2, "0")}`;
  if (todo.deadlinePrecision === "date") {
    return `${date}（当天 ${DEFAULT_TODO_DATE_DEADLINE_TIME}）`;
  }
  return `${date} ${String(deadline.getHours()).padStart(2, "0")}:${String(
    deadline.getMinutes(),
  ).padStart(2, "0")}`;
}

function localDeadline(dateValue: string, timeValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = (timeValue || DEFAULT_TODO_DATE_DEADLINE_TIME)
    .split(":")
    .map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function inputValues(
  deadline: string,
  precision: TodoDeadlinePrecision | undefined,
): { date: string; time: string } {
  const value = new Date(deadline);
  return {
    date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate(),
    ).padStart(2, "0")}`,
    time: precision === "date"
      ? ""
      : `${String(value.getHours()).padStart(2, "0")}:${String(
        value.getMinutes(),
      ).padStart(2, "0")}`,
  };
}

function render(): void {
  const activeTodos = todos.filter((todo) => !todo.completed);
  listElement.replaceChildren();
  emptyState.hidden = activeTodos.length > 0;

  for (const todo of activeTodos) {
    const item = document.createElement("article");
    item.className = "todo-item";
    item.dataset.id = todo.id;

    const row = document.createElement("div");
    row.className = "todo-row";

    const completeButton = document.createElement("button");
    completeButton.className = "complete-button";
    completeButton.dataset.action = "complete";
    completeButton.type = "button";
    completeButton.title = "完成任务";
    completeButton.setAttribute("aria-label", "完成任务");
    completeButton.textContent = "○";

    const textInput = document.createElement("input");
    textInput.className = "todo-text";
    textInput.dataset.action = "text";
    textInput.dataset.id = todo.id;
    textInput.value = todo.text;
    textInput.setAttribute("aria-label", "任务内容");

    const deadlineButton = document.createElement("button");
    deadlineButton.className = "item-action";
    deadlineButton.dataset.action = "deadline";
    deadlineButton.type = "button";
    deadlineButton.textContent = "DDL";

    const deleteButton = document.createElement("button");
    deleteButton.className = "item-action delete-button";
    deleteButton.dataset.action = "delete";
    deleteButton.type = "button";
    deleteButton.textContent = "删除";

    row.append(completeButton, textInput, deadlineButton, deleteButton);
    item.append(row);

    if (todo.deadline) {
      const deadlineLabel = document.createElement("div");
      deadlineLabel.className = "deadline-label";
      if (Date.parse(todo.deadline) <= Date.now()) {
        deadlineLabel.classList.add("overdue");
        deadlineLabel.textContent = `已逾期 · ${formatDeadline(todo)}`;
      } else {
        deadlineLabel.textContent = `截止 ${formatDeadline(todo)}`;
      }
      item.append(deadlineLabel);
    }

    if (editingDeadlineId === todo.id) {
      item.append(createDeadlineEditor(todo));
    }
    listElement.append(item);
  }

  if (focusTodoId) {
    const input = Array.from(listElement.querySelectorAll<HTMLInputElement>(".todo-text"))
      .find((element) => element.dataset.id === focusTodoId);
    input?.focus();
    input?.select();
    focusTodoId = undefined;
  }
}

function createDeadlineEditor(todo: TodoItem): HTMLElement {
  const editor = document.createElement("div");
  editor.className = "deadline-editor";
  editor.dataset.id = todo.id;
  const values = todo.deadline
    ? inputValues(todo.deadline, todo.deadlinePrecision)
    : { date: "", time: "" };

  const fields = document.createElement("div");
  fields.className = "deadline-fields";
  fields.innerHTML = `
    <label>日期<input type="date" class="deadline-date" value="${values.date}" /></label>
    <label>时间<input type="time" class="deadline-time" value="${values.time}" /></label>
  `;

  const actions = document.createElement("div");
  actions.className = "deadline-actions";
  actions.innerHTML = `
    <button type="button" data-action="save-deadline">保存 DDL</button>
    <button type="button" data-action="clear-deadline">不设置 DDL</button>
  `;

  const hint = document.createElement("p");
  hint.className = "editor-hint";
  hint.textContent = `仅选日期时按当天 ${DEFAULT_TODO_DATE_DEADLINE_TIME} 提醒。`;
  editor.append(fields, actions, hint);
  return editor;
}

async function reload(): Promise<void> {
  todos = await window.desktopMemo.list();
  render();
}

async function mutate(action: () => Promise<unknown>): Promise<void> {
  try {
    clearStatus();
    await action();
    await reload();
  } catch (error) {
    showError(error);
  }
}

newTodoButton.addEventListener("click", () => {
  void mutate(async () => {
    const todo = await window.desktopMemo.create("新任务");
    focusTodoId = todo.id;
  });
});

listElement.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const button = target.closest<HTMLButtonElement>("button[data-action]");
  const item = target.closest<HTMLElement>(".todo-item");
  if (!button || !item?.dataset.id) {
    return;
  }
  const id = item.dataset.id;
  const action = button.dataset.action;
  if (action === "complete") {
    void mutate(() => window.desktopMemo.complete(id));
  } else if (action === "delete") {
    void mutate(() => window.desktopMemo.remove(id));
  } else if (action === "deadline") {
    editingDeadlineId = editingDeadlineId === id ? undefined : id;
    render();
  } else if (action === "save-deadline") {
    const dateInput = item.querySelector<HTMLInputElement>(".deadline-date")!;
    const timeInput = item.querySelector<HTMLInputElement>(".deadline-time")!;
    if (!dateInput.value) {
      showError("请先选择日期");
      return;
    }
    const precision: TodoDeadlinePrecision = timeInput.value ? "date-time" : "date";
    void mutate(async () => {
      await window.desktopMemo.updateDeadline(
        id,
        localDeadline(dateInput.value, timeInput.value),
        precision,
      );
      editingDeadlineId = undefined;
    });
  } else if (action === "clear-deadline") {
    void mutate(async () => {
      await window.desktopMemo.updateDeadline(id);
      editingDeadlineId = undefined;
    });
  }
});

listElement.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.dataset.action !== "text") {
    return;
  }
  const id = input.dataset.id;
  if (id) {
    void mutate(() => window.desktopMemo.updateText(id, input.value));
  }
});

listElement.addEventListener("keydown", (event) => {
  const input = event.target;
  if (event.key === "Enter" && input instanceof HTMLInputElement
    && input.dataset.action === "text") {
    input.blur();
  }
});

reload().catch(showError);

window.desktopMemo.onThemeChanged(applyTheme);
window.desktopMemo.getTheme().then(applyTheme).catch(showError);
