const helloMessage = document.querySelector("#hello-message");
const helloFlag = document.querySelector("#hello-flag");
const helloEnabled = document.querySelector("#hello-enabled");
const helloTiming = document.querySelector("#hello-timing");
const helloLog = document.querySelector("#hello-log");
const helloCall = document.querySelector("#hello-call");
const pingStatus = document.querySelector("#ping-status");
const pingTiming = document.querySelector("#ping-timing");
const pingLog = document.querySelector("#ping-log");
const pingCall = document.querySelector("#ping-call");
const todoList = document.querySelector("#todo-list");
const todoEmpty = document.querySelector("#todo-empty");
const todoForm = document.querySelector("#todo-form");
const todoTitle = document.querySelector("#todo-title");
const todosError = document.querySelector("#todos-error");
const appError = document.querySelector("#app-error");

async function readJson(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}${text ? `: ${text}` : ""}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function showError(message) {
  appError.hidden = !message;
  appError.textContent = message ?? "";
}

async function runCall({ path, button, log, onStart, onSuccess }) {
  showError("");
  button.disabled = true;
  onStart();
  log.textContent = `Calling GET ${path}…`;
  const started = performance.now();
  try {
    const response = await fetch(path);
    const elapsed = Math.round(performance.now() - started);
    const data = await readJson(response);
    log.textContent = `${response.status} ${response.statusText} in ${elapsed} ms`;
    onSuccess(data, elapsed, response);
  } catch (error) {
    log.textContent = `Failed: ${error.message}`;
    throw error;
  } finally {
    button.disabled = false;
  }
}

function resetHello() {
  helloMessage.textContent = "Not called yet";
  helloMessage.classList.add("idle");
  helloFlag.textContent = "—";
  helloEnabled.textContent = "—";
  helloTiming.textContent = "—";
  helloLog.textContent = "Press Call to GET /api/hello";
}

function resetPing() {
  pingStatus.textContent = "Not called yet";
  pingStatus.classList.add("idle", "status");
  pingStatus.classList.remove("ok", "busy");
  pingTiming.textContent = "Last call: —";
  pingLog.textContent = "Press Call to GET /api/ping";
}

async function callHello() {
  await runCall({
    path: "/api/hello",
    button: helloCall,
    log: helloLog,
    onStart() {
      helloMessage.textContent = "Calling…";
      helloMessage.classList.remove("idle");
      helloFlag.textContent = "—";
      helloEnabled.textContent = "—";
      helloTiming.textContent = "—";
    },
    onSuccess(data, elapsed) {
      helloMessage.textContent = data.message;
      helloFlag.textContent = data.featureFlag;
      helloEnabled.textContent = data.featureEnabled ? "true" : "false";
      helloTiming.textContent = `${elapsed} ms`;
    }
  });
}

async function callPing() {
  await runCall({
    path: "/api/ping",
    button: pingCall,
    log: pingLog,
    onStart() {
      pingStatus.textContent = "Calling…";
      pingStatus.classList.add("busy");
      pingStatus.classList.remove("idle", "ok");
      pingTiming.textContent = "Last call: —";
    },
    onSuccess(data, elapsed) {
      pingStatus.textContent = data.status;
      pingStatus.classList.remove("busy", "idle");
      pingStatus.classList.toggle("ok", data.status === "pong");
      pingTiming.textContent = `Last call: ${elapsed} ms`;
    }
  });
}

function renderTodos(items) {
  todoList.replaceChildren();
  todoEmpty.hidden = items.length > 0;
  if (!items.length) {
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    if (item.isComplete) {
      li.classList.add("done");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.isComplete;
    checkbox.setAttribute("aria-label", `Complete ${item.title}`);
    checkbox.addEventListener("change", () => updateTodo(item, checkbox.checked));

    const title = document.createElement("span");
    title.textContent = item.title;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteTodo(item.id));

    li.append(checkbox, title, remove);
    todoList.append(li);
  }
}

async function loadTodos() {
  todosError.hidden = true;
  const items = await readJson(await fetch("/api/todos"));
  renderTodos(items);
}

async function updateTodo(item, isComplete) {
  await readJson(await fetch(`/api/todos/${item.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: item.title, isComplete })
  }));
  await loadTodos();
}

async function deleteTodo(id) {
  const response = await fetch(`/api/todos/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Delete failed (${response.status})`);
  }
  await loadTodos();
}

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  todosError.hidden = true;
  try {
    const response = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: todoTitle.value })
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      const detail = problem?.errors?.title?.[0] ?? `Could not create todo (${response.status})`;
      todosError.hidden = false;
      todosError.textContent = detail;
      return;
    }
    todoTitle.value = "";
    await loadTodos();
  } catch (error) {
    todosError.hidden = false;
    todosError.textContent = error.message;
  }
});

document.querySelector("#hello-call").addEventListener("click", () => callHello().catch((error) => showError(error.message)));
document.querySelector("#hello-reset").addEventListener("click", resetHello);
document.querySelector("#ping-call").addEventListener("click", () => callPing().catch((error) => showError(error.message)));
document.querySelector("#ping-reset").addEventListener("click", resetPing);

loadTodos().catch((error) => showError(error.message));
