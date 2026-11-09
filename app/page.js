"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "todos";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// Date をローカル時間の "YYYY-MM-DD" にする
function dateKey(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ローカル時間での今日の日付を "YYYY-MM-DD" で返す
function todayString() {
  return dateKey(new Date());
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

function PencilIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
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

// タスク行をその場で編集するフォーム（Esc でキャンセル）
function EditForm({ todo, onSave, onCancel }) {
  const [title, setTitle] = useState(todo.title);
  const [due, setDue] = useState(todo.due);
  const trimmed = title.trim();

  const submit = (e) => {
    e.preventDefault();
    if (trimmed) onSave(trimmed, due);
  };

  return (
    <form
      className="add-form edit-form"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="タスク名"
        autoFocus
      />
      <input
        type="date"
        className="due-input"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        aria-label="期限（任意）"
        title="期限（任意）"
      />
      <button type="submit" disabled={!trimmed}>
        保存
      </button>
      <button type="button" className="edit-cancel" onClick={onCancel}>
        キャンセル
      </button>
    </form>
  );
}

// 月表示のカレンダー。今日の日付に依存するため、クライアントでのマウント後に描画すること
function Calendar({ todos, selected, onSelect }) {
  const today = todayString();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const moveMonth = (delta) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const goToday = () => {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
    onSelect(today);
  };

  // 日付ごとのタスク集計（期限のあるタスクのみ）
  const stats = {};
  for (const t of todos) {
    if (!t.due) continue;
    const s = (stats[t.due] ??= { total: 0, active: 0, overdue: 0 });
    s.total += 1;
    if (!t.done) s.active += 1;
    if (dueStatus(t) === "overdue") s.overdue += 1;
  }

  const leadingBlanks = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(view.year, view.month, i + 1);
    return { day: i + 1, key: dateKey(date), weekday: date.getDay() };
  });

  return (
    <section className="calendar" aria-label="カレンダー">
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav"
          onClick={() => moveMonth(-1)}
          aria-label="前の月"
        >
          ‹
        </button>
        <h2 className="calendar-month" aria-live="polite">
          {view.year}年{view.month + 1}月
        </h2>
        <button
          type="button"
          className="calendar-nav"
          onClick={() => moveMonth(1)}
          aria-label="次の月"
        >
          ›
        </button>
        <button type="button" className="calendar-today" onClick={goToday}>
          今日
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`calendar-weekday weekday-${i}`} aria-hidden="true">
            {w}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map(({ day, key, weekday }) => {
          const s = stats[key];
          const isSelected = key === selected;
          const dotType = !s ? null : s.overdue > 0 ? "overdue" : s.active > 0 ? "active" : "done";
          const classes = [
            "calendar-day",
            `weekday-${weekday}`,
            key === today && "is-today",
            isSelected && "is-selected",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              className={classes}
              aria-pressed={isSelected}
              aria-label={`${view.month + 1}月${day}日 タスク${s ? s.total : 0}件`}
              onClick={() => onSelect(isSelected ? null : key)}
            >
              {day}
              {dotType && <span className={`calendar-dot dot-${dotType}`} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
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
    setDue(selectedDate ?? "");
    showToast(`「${title}」を追加しました`);
  };

  // 日付を選択（null で解除）し、追加フォームの期限もその日に合わせる
  const selectDate = (date) => {
    setSelectedDate(date);
    setDue(date ?? "");
  };

  const toggleTodo = (id) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const saveEdit = (id, title, newDue) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, title, due: newDue } : t)));
    setEditingId(null);
    showToast(`「${title}」を更新しました`);
  };

  const deleteTodo = (id) => {
    const target = todos.find((t) => t.id === id);
    setTodos(todos.filter((t) => t.id !== id));
    if (target) showToast(`「${target.title}」を削除しました`, "delete");
  };

  const remaining = todos.filter((t) => !t.done).length;

  // 画面上部の要約は、日付の選択に関係なく全タスクを対象にする
  const dueTodayTotal = todos.filter((t) => dueStatus(t) === "today").length;
  const overdueTotal = todos.filter((t) => dueStatus(t) === "overdue").length;

  // 日付を選択中は、絞り込みの件数と一覧をその日のタスクに限定する
  const dayTodos = selectedDate ? todos.filter((t) => t.due === selectedDate) : todos;
  const counts = {
    all: dayTodos.length,
    active: dayTodos.filter((t) => !t.done).length,
    done: dayTodos.filter((t) => t.done).length,
    overdue: dayTodos.filter((t) => dueStatus(t) === "overdue").length,
  };

  const matchesFilter = (t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    if (filter === "overdue") return dueStatus(t) === "overdue";
    return true;
  };

  const visibleTodos = dayTodos.filter(matchesFilter);

  const dayLabel = selectedDate ? `${formatDue(selectedDate)}の` : "";
  const filterLabel =
    dayTodos.length === 0
      ? ""
      : { active: "未完了の", done: "完了した", overdue: "期限切れの" }[filter] ?? "";
  const emptyMessage = `${dayLabel}${filterLabel}タスクはありません`;

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

      {loaded && (
        <p className="summary">
          <span className={dueTodayTotal > 0 ? "due-today" : ""}>今日まで {dueTodayTotal} 件</span>
          ・
          <span className={overdueTotal > 0 ? "due-overdue" : ""}>期限切れ {overdueTotal} 件</span>
        </p>
      )}

      <p className="count">
        残り {remaining} 件 / 全 {todos.length} 件
      </p>

      {loaded && <Calendar todos={todos} selected={selectedDate} onSelect={selectDate} />}

      {selectedDate && (
        <div className="selected-day">
          <span>{formatDue(selectedDate)}のタスクを表示中</span>
          <button type="button" className="selected-day-clear" onClick={() => selectDate(null)}>
            すべての日を表示
          </button>
        </div>
      )}

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
        {visibleTodos.map((t) =>
          t.id === editingId ? (
            <li key={t.id}>
              <EditForm
                todo={t}
                onSave={(title, newDue) => saveEdit(t.id, title, newDue)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
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
              className="edit"
              onClick={() => setEditingId(t.id)}
              aria-label={`「${t.title}」を編集`}
              title="編集"
            >
              <PencilIcon />
              <span className="btn-label">編集</span>
            </button>
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
          )
        )}
      </ul>
    </main>
  );
}
