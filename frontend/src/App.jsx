import { useEffect, useState } from "react";
import "./App.css";

const API = "http://192.168.0.18:8000";

const columns = [
  {
    id: "todo",
    title: "To Do",
    icon: "○",
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: "◐",
  },
  {
    id: "done",
    title: "Done",
    icon: "✓",
  },
];

function App() {
  const [tasks, setTasks] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [creating, setCreating] = useState(false);

  const [openMenu, setOpenMenu] = useState(null);

  const [darkMode, setDarkMode] = useState(true);

  const [viewMode, setViewMode] = useState("list");

  const [draggedTask, setDraggedTask] = useState(null);

  useEffect(() => {
    loadTasks();
  }, [search, status, priority, sortBy]);

  async function loadTasks() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search) params.append("search", search);
      if (status) params.append("status", status);
      if (priority) params.append("priority", priority);

      const response = await fetch(`${API}/tasks?${params}`);

      if (!response.ok) {
        throw new Error("Ошибка загрузки задач");
      }

      const data = await response.json();

      let sortedData = [...data];

      if (sortBy === "title") {
        sortedData.sort((a, b) =>
          a.title.localeCompare(b.title)
        );
      }

      if (sortBy === "priority") {
        const priorityOrder = {
          high: 1,
          medium: 2,
          low: 3,
        };

        sortedData.sort(
          (a, b) =>
            priorityOrder[a.priority] -
            priorityOrder[b.priority]
        );
      }

      if (sortBy === "due_date") {
        sortedData.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;

          return (
            new Date(a.due_date) -
            new Date(b.due_date)
          );
        });
      }

      if (sortBy === "newest") {
        sortedData.sort((a, b) => b.id - a.id);
      }

      if (sortBy === "oldest") {
        sortedData.sort((a, b) => a.id - b.id);
      }

      setTasks(sortedData);
    } catch (error) {
      console.error("Ошибка загрузки:", error);

      setError(
        "Не удалось загрузить задачи. Проверьте соединение с сервером."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createTask(taskData) {
    try {
      setCreating(true);
      setError("");

      const params = new URLSearchParams();

      params.append("title", taskData.title);
      params.append(
        "description",
        taskData.description || ""
      );
      params.append(
        "priority",
        taskData.priority || "medium"
      );

      if (taskData.due_date) {
        params.append("due_date", taskData.due_date);
      }

      const response = await fetch(
        `${API}/tasks?${params}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось создать задачу");
      }

      const newTask = await response.json();

      setTasks((currentTasks) => [
        ...currentTasks,
        newTask,
      ]);

      setShowModal(false);
    } catch (error) {
      console.error(error);

      alert(
        "Ошибка при создании задачи. Проверьте соединение с сервером."
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateTask(taskId, taskData) {
    try {
      setError("");

      const params = new URLSearchParams();

      params.append("title", taskData.title);
      params.append(
        "description",
        taskData.description || ""
      );
      params.append(
        "status",
        taskData.status || "todo"
      );
      params.append(
        "priority",
        taskData.priority || "medium"
      );

      if (taskData.due_date) {
        params.append("due_date", taskData.due_date);
      }

      const response = await fetch(
        `${API}/tasks/${taskId}?${params}`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось обновить задачу");
      }

      const updatedTask = await response.json();

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? updatedTask
            : task
        )
      );

      setShowModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error(error);

      alert(
        "Ошибка при обновлении задачи. Попробуйте ещё раз."
      );
    }
  }

  async function deleteTask(taskId) {
    const confirmed = window.confirm(
      "Ты точно хочешь удалить эту задачу?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `${API}/tasks/${taskId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось удалить задачу");
      }

      setTasks((currentTasks) =>
        currentTasks.filter(
          (task) => task.id !== taskId
        )
      );

      setOpenMenu(null);
    } catch (error) {
      console.error(error);

      alert(
        "Ошибка при удалении задачи. Попробуйте ещё раз."
      );
    }
  }

  async function changeStatus(task, newStatus) {
    if (task.status === newStatus) return;

    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === task.id
          ? { ...item, status: newStatus }
          : item
      )
    );

    try {
      const params = new URLSearchParams();

      params.append("title", task.title);
      params.append(
        "description",
        task.description || ""
      );
      params.append("status", newStatus);
      params.append(
        "priority",
        task.priority || "medium"
      );

      if (task.due_date) {
        params.append("due_date", task.due_date);
      }

      const response = await fetch(
        `${API}/tasks/${task.id}?${params}`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Не удалось изменить статус"
        );
      }
    } catch (error) {
      console.error(error);

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: task.status,
              }
            : item
        )
      );

      alert(
        "Не удалось сохранить статус. Попробуйте ещё раз."
      );
    }
  }

  async function changePriority(task, newPriority) {
    if (task.priority === newPriority) return;

    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              priority: newPriority,
            }
          : item
      )
    );

    try {
      const params = new URLSearchParams();

      params.append("title", task.title);
      params.append(
        "description",
        task.description || ""
      );
      params.append(
        "status",
        task.status || "todo"
      );
      params.append("priority", newPriority);

      if (task.due_date) {
        params.append("due_date", task.due_date);
      }

      const response = await fetch(
        `${API}/tasks/${task.id}?${params}`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Не удалось изменить приоритет"
        );
      }
    } catch (error) {
      console.error(error);

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                priority: task.priority,
              }
            : item
        )
      );

      alert(
        "Не удалось сохранить приоритет. Попробуйте ещё раз."
      );
    }
  }

  function openEditModal(task) {
    setEditingTask(task);
    setShowModal(true);
    setOpenMenu(null);
  }

  function openCreateModal() {
    setEditingTask(null);
    setShowModal(true);
  }

  function handleDragStart(task) {
    setDraggedTask(task);
  }

  async function handleDrop(newStatus) {
    if (!draggedTask) return;

    await changeStatus(
      draggedTask,
      newStatus
    );

    setDraggedTask(null);
  }

  function getPriorityLabel(priority) {
    if (priority === "high") return "High";
    if (priority === "medium") return "Medium";
    if (priority === "low") return "Low";

    return "Medium";
  }

  function getStatusLabel(status) {
    if (status === "todo") return "To Do";
    if (status === "in_progress")
      return "In Progress";
    if (status === "done") return "Done";

    return "To Do";
  }

  return (
    <div
      className={
        darkMode
          ? "app dark"
          : "app light"
      }
    >

      {/* HEADER */}

      <header className="header">

        <div className="logo">
          <div className="logo-icon">
            ✓
          </div>

          <span>TaskFlow</span>
        </div>

        <div className="header-actions">

          <div className="search-box">

            <span>⌕</span>

            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

          <button
            className="theme-button"
            onClick={() =>
              setDarkMode(!darkMode)
            }
          >
            {darkMode ? "☀" : "☾"}
          </button>

          <div className="profile">
            <div className="profile-avatar">
              A
            </div>
          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="main">

        {/* WELCOME */}

        <section className="welcome">

          <div>

            <h1>
              Good afternoon 👋
            </h1>

            <p>
              Here's what's happening
              with your tasks today.
            </p>

          </div>

          <button
            className="create-button"
            onClick={openCreateModal}
          >
            + New Task
          </button>

        </section>

        {/* STATS */}

        <section className="stats">

          <div className="stat-card">

            <div className="stat-icon total">
              ✓
            </div>

            <div>
              <span>Total Tasks</span>

              <strong>
                {tasks.length}
              </strong>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon progress">
              ◐
            </div>

            <div>

              <span>
                In Progress
              </span>

              <strong>
                {
                  tasks.filter(
                    (task) =>
                      task.status ===
                      "in_progress"
                  ).length
                }
              </strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon completed">
              ✓
            </div>

            <div>

              <span>
                Completed
              </span>

              <strong>
                {
                  tasks.filter(
                    (task) =>
                      task.status ===
                      "done"
                  ).length
                }
              </strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon high">
              !
            </div>

            <div>

              <span>
                High Priority
              </span>

              <strong>
                {
                  tasks.filter(
                    (task) =>
                      task.priority ===
                      "high"
                  ).length
                }
              </strong>

            </div>

          </div>

        </section>

        {/* TOOLBAR */}

        <section className="toolbar">

          <div className="view-switcher">

            <button
              className={
                viewMode === "list"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setViewMode("list")
              }
            >
              ☷ List
            </button>

            <button
              className={
                viewMode === "board"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setViewMode("board")
              }
            >
              ▦ Board
            </button>

          </div>

          <div className="filters">

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
            >

              <option value="">
                All statuses
              </option>

              <option value="todo">
                To Do
              </option>

              <option value="in_progress">
                In Progress
              </option>

              <option value="done">
                Done
              </option>

            </select>

            <select
              value={priority}
              onChange={(e) =>
                setPriority(
                  e.target.value
                )
              }
            >

              <option value="">
                All priorities
              </option>

              <option value="high">
                High
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="low">
                Low
              </option>

            </select>

            {/* SORT */}

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value
                )
              }
            >

              <option value="default">
                Sort by
              </option>

              <option value="title">
                Title A-Z
              </option>

              <option value="priority">
                Priority
              </option>

              <option value="due_date">
                Due date
              </option>

              <option value="newest">
                Newest
              </option>

              <option value="oldest">
                Oldest
              </option>

            </select>

            <button
              className="clear-button"
              onClick={() => {
                setSearch("");
                setStatus("");
                setPriority("");
                setSortBy("default");
                setError("");
              }}
            >
              Clear
            </button>

          </div>

        </section>

        {/* CONTENT */}

        {loading ? (

          <div className="loading">
            Loading tasks...
          </div>

        ) : error ? (

          <div className="empty">

            <div className="empty-icon">
              ⚠️
            </div>

            <h3>
              Something went wrong
            </h3>

            <p>
              {error}
            </p>

            <button
              className="create-button"
              onClick={loadTasks}
            >
              🔄 Retry
            </button>

          </div>

        ) : viewMode === "list" ? (

          <section className="task-grid">

            {tasks.length === 0 ? (

              <div className="empty">

                <div className="empty-icon">
                  ✓
                </div>

                <h3>
                  No tasks found
                </h3>

                <p>
                  Try changing your
                  filters or create a
                  new task.
                </p>

              </div>

            ) : (

              tasks.map((task) => (

                <TaskCard
                  key={task.id}
                  task={task}
                  openMenu={openMenu}
                  setOpenMenu={setOpenMenu}
                  onEdit={openEditModal}
                  onDelete={deleteTask}
                  onStatusChange={
                    changeStatus
                  }
                  onPriorityChange={
                    changePriority
                  }
                  getPriorityLabel={
                    getPriorityLabel
                  }
                  getStatusLabel={
                    getStatusLabel
                  }
                />

              ))

            )}

          </section>

        ) : (

          <section className="board">

            {columns.map((column) => {

              const columnTasks =
                tasks.filter(
                  (task) =>
                    task.status ===
                    column.id
                );

              return (

                <div
                  key={column.id}
                  className="board-column"
                  onDragOver={(e) =>
                    e.preventDefault()
                  }
                  onDrop={() =>
                    handleDrop(
                      column.id
                    )
                  }
                >

                  <div className="board-column-header">

                    <div>

                      <span className="column-icon">
                        {column.icon}
                      </span>

                      <span>
                        {column.title}
                      </span>

                    </div>

                    <span className="column-count">
                      {columnTasks.length}
                    </span>

                  </div>

                  <div className="board-tasks">

                    {columnTasks.length === 0 ? (

                      <div className="drop-zone">
                        Drop tasks here
                      </div>

                    ) : (

                      columnTasks.map(
                        (task) => (

                          <div
                            key={task.id}
                            draggable
                            onDragStart={() =>
                              handleDragStart(
                                task
                              )
                            }
                            className="board-task"
                          >

                            <div className="board-task-top">

                              <span
                                className={`priority ${task.priority}`}
                              >
                                {getPriorityLabel(
                                  task.priority
                                )}
                              </span>

                              <button
                                className="menu-button"
                                onClick={() =>
                                  setOpenMenu(
                                    openMenu ===
                                      task.id
                                      ? null
                                      : task.id
                                  )
                                }
                              >
                                ⋮
                              </button>

                            </div>

                            <h3>
                              {task.title}
                            </h3>

                            {task.description && (
                              <p>
                                {
                                  task.description
                                }
                              </p>
                            )}

                            {task.due_date && (
                              <div className="due-date">
                                📅{" "}
                                {new Date(
                                  task.due_date
                                ).toLocaleDateString()}
                              </div>
                            )}

                            <div className="quick-controls">

                              <select
                                value={
                                  task.status
                                }
                                onChange={(e) =>
                                  changeStatus(
                                    task,
                                    e.target.value
                                  )
                                }
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                              >

                                <option value="todo">
                                  To Do
                                </option>

                                <option value="in_progress">
                                  In Progress
                                </option>

                                <option value="done">
                                  Done
                                </option>

                              </select>

                              <select
                                value={
                                  task.priority
                                }
                                onChange={(e) =>
                                  changePriority(
                                    task,
                                    e.target.value
                                  )
                                }
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                              >

                                <option value="high">
                                  High
                                </option>

                                <option value="medium">
                                  Medium
                                </option>

                                <option value="low">
                                  Low
                                </option>

                              </select>

                            </div>

                            {openMenu ===
                              task.id && (

                              <div className="task-menu">

                                <button
                                  onClick={() =>
                                    openEditModal(
                                      task
                                    )
                                  }
                                >
                                  ✏ Edit
                                </button>

                                <button
                                  onClick={() =>
                                    changeStatus(
                                      task,
                                      "done"
                                    )
                                  }
                                >
                                  ✓ Mark as done
                                </button>

                                <button
                                  className="danger"
                                  onClick={() =>
                                    deleteTask(
                                      task.id
                                    )
                                  }
                                >
                                  🗑 Delete
                                </button>

                              </div>

                            )}

                          </div>

                        )
                      )

                    )}

                  </div>

                </div>

              );
            })}

          </section>

        )}

      </main>

      {/* MODAL */}

      {showModal && (

        <TaskModal
          task={editingTask}
          creating={creating}

          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}

          onCreate={createTask}
          onUpdate={updateTask}
        />

      )}

    </div>
  );
}


/* =========================
   TASK CARD
========================= */

function TaskCard({
  task,
  openMenu,
  setOpenMenu,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  getPriorityLabel,
  getStatusLabel,
}) {

  return (

    <div className="task-card">

      <div className="task-card-header">

        <span
          className={`priority ${task.priority}`}
        >
          {getPriorityLabel(
            task.priority
          )}
        </span>

        <button
          className="menu-button"
          onClick={() =>
            setOpenMenu(
              openMenu === task.id
                ? null
                : task.id
            )
          }
        >
          ⋮
        </button>

        {openMenu === task.id && (

          <div className="task-menu">

            <button
              onClick={() =>
                onEdit(task)
              }
            >
              ✏ Edit
            </button>

            {task.status !== "done" && (

              <button
                onClick={() =>
                  onStatusChange(
                    task,
                    "done"
                  )
                }
              >
                ✓ Mark as done
              </button>

            )}

            <button
              className="danger"
              onClick={() =>
                onDelete(task.id)
              }
            >
              🗑 Delete
            </button>

          </div>

        )}

      </div>

      <h3>
        {task.title}
      </h3>

      {task.description && (

        <p className="description">
          {task.description}
        </p>

      )}

      {task.due_date && (

        <div className="due-date">
          📅{" "}
          {new Date(
            task.due_date
          ).toLocaleDateString()}
        </div>

      )}

      {/* QUICK STATUS */}

      <div className="quick-status">

        <span>Status</span>

        <div className="status-buttons">

          <button
            className={
              task.status === "todo"
                ? "active"
                : ""
            }
            onClick={() =>
              onStatusChange(
                task,
                "todo"
              )
            }
          >
            ○ To Do
          </button>

          <button
            className={
              task.status ===
              "in_progress"
                ? "active"
                : ""
            }
            onClick={() =>
              onStatusChange(
                task,
                "in_progress"
              )
            }
          >
            ◐ In Progress
          </button>

          <button
            className={
              task.status === "done"
                ? "active"
                : ""
            }
            onClick={() =>
              onStatusChange(
                task,
                "done"
              )
            }
          >
            ✓ Done
          </button>

        </div>

      </div>

      {/* QUICK PRIORITY */}

      <div className="quick-priority">

        <span>
          Priority
        </span>

        <select
          value={task.priority}
          onChange={(e) =>
            onPriorityChange(
              task,
              e.target.value
            )
          }
        >

          <option value="high">
            High
          </option>

          <option value="medium">
            Medium
          </option>

          <option value="low">
            Low
          </option>

        </select>

      </div>

      <div className="task-footer">

        <span
          className={`status ${task.status}`}
        >
          {getStatusLabel(
            task.status
          )}
        </span>

        <span className="task-id">
          #{task.id}
        </span>

      </div>

    </div>

  );
}


/* =========================
   TASK MODAL
========================= */

function TaskModal({
  task,
  creating,
  onClose,
  onCreate,
  onUpdate,
}) {

  const isEditing = Boolean(task);

  const [title, setTitle] =
    useState(
      task?.title || ""
    );

  const [description, setDescription] =
    useState(
      task?.description || ""
    );

  const [status, setStatus] =
    useState(
      task?.status || "todo"
    );

  const [priority, setPriority] =
    useState(
      task?.priority || "medium"
    );

  const [dueDate, setDueDate] =
    useState(
      task?.due_date
        ? task.due_date.slice(0, 16)
        : ""
    );

  function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim()) {
      alert(
        "Введите название задачи"
      );
      return;
    }

    const data = {
      title: title.trim(),
      description,
      status,
      priority,
      due_date: dueDate
        ? new Date(
            dueDate
          ).toISOString()
        : null,
    };

    if (isEditing) {
      onUpdate(
        task.id,
        data
      );
    } else {
      onCreate(data);
    }
  }

  return (

    <div
      className="modal-overlay"
      onClick={onClose}
    >

      <div
        className="modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="modal-header">

          <h2>
            {isEditing
              ? "Edit Task"
              : "Create New Task"}
          </h2>

          <button
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <form
          onSubmit={handleSubmit}
        >

          <label>

            Title

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              placeholder="Enter task title..."
              autoFocus
            />

          </label>

          <label>

            Description

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Describe your task..."
              rows="4"
            />

          </label>

          <div className="form-row">

            <label>

              Status

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value
                  )
                }
              >

                <option value="todo">
                  To Do
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="done">
                  Done
                </option>

              </select>

            </label>

            <label>

              Priority

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(
                    e.target.value
                  )
                }
              >

                <option value="high">
                  High
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="low">
                  Low
                </option>

              </select>

            </label>

          </div>

          <label>

            Due date

            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) =>
                setDueDate(
                  e.target.value
                )
              }
            />

          </label>

          <div className="modal-actions">

            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-button"
              disabled={creating}
            >
              {creating
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Task"}
            </button>

          </div>

        </form>

      </div>

    </div>

  );
}

export default App;