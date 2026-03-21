import { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, push, set, onValue, remove, update } from "firebase/database";

const SECRET_KEY = "family2026secret";

function App() {
  const params = new URLSearchParams(window.location.search);
  const childParam = params.get("child");
  const key = params.get("key");

  if (childParam && key !== SECRET_KEY) {
    return <h1>アクセスできません</h1>;
  }

  const [names, setNames] = useState({ A: "A", B: "B", C: "C" });
  const [period, setPeriod] = useState({ start: "", end: "" });

  const [task, setTask] = useState("");
  const [price, setPrice] = useState("");
  const [child, setChild] = useState("A");

  const [tasks, setTasks] = useState({ A: {}, B: {}, C: {} });
  const [records, setRecords] = useState([]);

  useEffect(() => {
    onValue(ref(db, "names"), (s) => s.val() && setNames(s.val()));
    onValue(ref(db, "period"), (s) => s.val() && setPeriod(s.val()));

    ["A", "B", "C"].forEach((c) => {
      onValue(ref(db, "tasks/" + c), (s) => {
        setTasks((prev) => ({ ...prev, [c]: s.val() || {} }));
      });
    });

    onValue(ref(db, "records"), (s) => {
      const data = s.val();
      const list = data
        ? Object.entries(data).map(([id, v]) => ({ id, ...v }))
        : [];
      setRecords(list);
    });
  }, []);

  const saveNames = () => set(ref(db, "names"), names);
  const savePeriod = () => set(ref(db, "period"), period);

  const addTask = () => {
    const newRef = push(ref(db, "tasks/" + child));
    set(newRef, { name: task, price: Number(price) });
    setTask("");
    setPrice("");
  };

  const deleteTask = (c, id) => remove(ref(db, `tasks/${c}/${id}`);
  const updateTask = (c, id, p) =>
    update(ref(db, `tasks/${c}/${id}`), { price: Number(p) });

  const toggleRecord = (date, taskName) => {
    const exist = records.find(
      (r) => r.child === childParam && r.date === date && r.task === taskName
    );

    if (exist) {
      remove(ref(db, `records/${exist.id}`));
    } else {
      const newRef = push(ref(db, "records"));
      set(newRef, { child: childParam, date, task: taskName, done: true });
    }
  };

  const getDates = () => {
    if (!period.start || !period.end) return [];
    const dates = [];
    let d = new Date(period.start);
    const end = new Date(period.end);
    while (d <= end) {
      dates.push(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  const isDone = (date, taskName) => {
    return records.some(
      (r) => r.child === childParam && r.date === date && r.task === taskName
    );
  };

  const calcRowSum = (date, childKey) => {
    return Object.values(tasks[childKey]).reduce((sum, t) => {
      if (isDone(date, t.name)) return sum + t.price;
      return sum;
    }, 0);
  };

  const calcTotal = (childKey) => {
    return getDates().reduce((sum, d) => sum + calcRowSum(d, childKey), 0);
  };

  const calcProgress = (childKey) => {
    const total = getDates().length * Object.keys(tasks[childKey]).length;
    const done = records.filter((r) => r.child === childKey).length;
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  if (!childParam) {
    return (
      <div style={{ padding: 20 }}>
        <h1>親ダッシュボード</h1>

        <h2>名前</h2>
        {["A", "B", "C"].map((c) => (
          <input
            key={c}
            value={names[c]}
            onChange={(e) =>
              setNames({ ...names, [c]: e.target.value })
            }
          />
        ))}
        <button onClick={saveNames}>保存</button>

        <h2>期間</h2>
        <input type="date" onChange={(e) =>
          setPeriod({ ...period, start: e.target.value })
        } />
        <input type="date" onChange={(e) =>
          setPeriod({ ...period, end: e.target.value })
        } />
        <button onClick={savePeriod}>保存</button>

        <h2>宿題登録</h2>
        <select onChange={(e) => setChild(e.target.value)}>
          <option>A</option><option>B</option><option>C</option>
        </select>
        <input placeholder="宿題" onChange={(e) => setTask(e.target.value)} />
        <input placeholder="単価" onChange={(e) => setPrice(e.target.value)} />
        <button onClick={addTask}>追加</button>

        {["A", "B", "C"].map((c) => {
          const progress = calcProgress(c);
          return (
            <div key={c} style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "10px",
              margin: "10px"
            }}>
              <h3>{names[c]}</h3>

              <div style={{ background: "#eee", height: "20px" }}>
                <div style={{
                  width: progress + "%",
                  background: "green",
                  height: "100%"
                }} />
              </div>

              <p>{progress}%</p>
              <p>合計：{calcTotal(c)}円</p>
            </div>
          );
        })}
      </div>
    );
  }

  const dates = getDates();
  const taskList = Object.values(tasks[childParam] || {});

  return (
    <div style={{ padding: 10 }}>
      <h1 style={{ textAlign: "center" }}>{names[childParam]}</h1>

      <table style={{ width: "100%", textAlign: "center", fontSize: "18px" }}>
        <thead>
          <tr>
            <th>日付</th>
            {taskList.map((t, i) => <th key={i}>{t.name}</th>)}
            <th>状態</th>
            <th>金額</th>
          </tr>
        </thead>
        <tbody>
          {dates.map((d) => {
            const allDone = taskList.every((t) => isDone(d, t.name));
            const sum = calcRowSum(d, childParam);

            return (
              <tr key={d}>
                <td>{d}</td>
                {taskList.map((t, i) => {
                  const done = isDone(d, t.name);
                  return (
                    <td key={i}
                      style={{
                        background: done ? "#4CAF50" : "#FF6B6B",
                        color: "white",
                        fontSize: "20px",
                        cursor: "pointer",
                        height: "60px"
                      }}
                      onClick={() => toggleRecord(d, t.name)}
                    >
                      {done ? "○" : ""}
                    </td>
                  );
                })}
                <td>{allDone ? "ぜんぶおわり！" : "まだのこっているよ！"}</td>
                <td>{sum}円</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={taskList.length + 2}>合計</td>
            <td>{calcTotal(childParam)}円</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default App;