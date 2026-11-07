"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "todos";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// ローカル時間での今日の日付を "YYYY-MM-DD" で返す
function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "YYYY-MM-DD" を「11/6（金）」の形にする（今年以外は年も付ける）
function formatDue(due) {
  const [y, m, d] = due.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const prefix = y === new Date().getFullYear() ? "" : `${y}/`;
  return `${prefix}${m}/${d}（${WEEKDAYS[date.getDay()]}）`;
}

// 期限の状態: overdue（期限切れ）/ today（今日まで）/ upcoming
function dueStatus(todo) {
  if (!todo.due || todo.done) return "upcoming";
  const today = todayString();
  if (todo.due < today) return "overdue";
  if (todo.due === today) return "today";
  return "upcoming";
}

const FILTERS = [
  { key: "all", label: "すべて" },
  { key: "active", label: "未完了" },
  { key: "done", label: "完了" },
  { key: "overdue", label: "期限切れ" },
];

function ChecklistIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3h6v3H9z" />
      <path d="M8.5 11l1.5 1.5 3-3" />
      <path d="M8.5 16.5h7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.2v.3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");
  const toastTimer = useRef(null);

  // 左上に通知を表示し、3秒後に消す
  const showToast = (message, type = "add") => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // 初回表示時に localStorage から読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTodos(JSON.parse(saved));
    } catch {
      // 壊れたデータは無視する
    }
    setLoaded(true);
  }, []);

  // todos が変わるたびに localStorage へ保存する
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, loaded]);

  const addTodo = (e) => {
    e.preventDefault();
    const title = text.trim();
    if (!title) return;
    setTodos([...todos, { id: Date.now(), title, done: false, due }]);
    setText("");
    setDue("");
    showToast(`「${title}」を追加しました`);
  };

  const toggleTodo = (id) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id) => {
    const target = todos.find((t) => t.id === id);
    setTodos(todos.filter((t) => t.id !== id));
    if (target) showToast(`「${target.title}」を削除しました`, "delete");
  };

  const remaining = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - remaining;
  const overdueCount = todos.filter((t) => dueStatus(t) === "overdue").length;
  const counts = {
    all: todos.length,
    active: remaining,
    done: doneCount,
    overdue: overdueCount,
  };

  const matchesFilter = (t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    if (filter === "overdue") return dueStatus(t) === "overdue";
    return true;
  };

  const visibleTodos = todos.filter(matchesFilter);

  const emptyMessage =
    todos.length === 0
      ? "タスクはありません"
      : {
          active: "未完了のタスクはありません",
          done: "完了したタスクはありません",
          overdue: "期限切れのタスクはありません",
        }[filter];

  return (
    <main className="container">
      {toast && (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      <h1 className="title">
        <ChecklistIcon />
        <span>ToDo リスト</span>
      </h1>

      <p className="count">
        残り {remaining} 件 / 全 {todos.length} 件
      </p>

      <form onSubmit={addTodo} className="add-form">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="新しいタスクを入力"
          aria-label="新しいタスク"
        />
        <input
          type="date"
          className="due-input"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="期限（任意）"
          title="期限（任意）"
        />
        <button type="submit" className="add-button">
          <PlusIcon />
          <span>追加</span>
        </button>
      </form>

      <div className="filters" role="group" aria-label="表示の絞り込み">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter-button filter-${f.key}${filter === f.key ? " active" : ""}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.key === "overdue" && <AlertIcon />}
            {f.label}
            <span className="filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {loaded && visibleTodos.length === 0 && <p className="empty">{emptyMessage}</p>}

      <ul className="list">
        {visibleTodos.map((t) => (
          <li key={t.id} className={t.done ? "done" : ""}>
            <label>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTodo(t.id)}
              />
              <span className="task-body">
                <span className="task-title">{t.title}</span>
                {t.due && (
                  <span className={`due due-${dueStatus(t)}`}>
                    期限: {formatDue(t.due)}
                    {dueStatus(t) === "overdue" && "・期限切れ"}
                    {dueStatus(t) === "today" && "・今日まで"}
                  </span>
                )}
              </span>
            </label>
            <button
              className="delete"
              onClick={() => deleteTodo(t.id)}
              aria-label={`「${t.title}」を削除`}
              title="削除"
            >
              <TrashIcon />
              <span className="btn-label">削除</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
