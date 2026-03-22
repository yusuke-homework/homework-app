import { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, push, set, onValue, remove } from "firebase/database";

const SECRET_KEY = "family2026secret"; // ★【① URLの鍵】

function App() {

  // ★【② URLルールの取得部分】←超重要
  const params = new URLSearchParams(window.location.search);
  const childParam = params.get("child"); // ← child=Aなど
  const key = params.get("key");           // ← key=xxxxx

  // ★【③ アクセス制御】
  if (childParam && key !== SECRET_KEY) {
    return <h1>アクセスできません</h1>;
  }

  const today = new Date().toISOString().split("T")[0];

  const playSound = () => {
    const audio = new Audio("/coin.mp3");
    audio.play();
  };

  const [allowEditAll, setAllowEditAll] = useState(false);
  const [usePrice, setUsePrice] = useState(true); // ★追加

  const [names, setNames] = useState({ A: "A", B: "B", C: "C" });
  const [period, setPeriod] = useState({ start: "", end: "" });

  const [task, setTask] = useState("");
  const [memo, setMemo] = useState("");
  const [price, setPrice] = useState("");
  const [child, setChild] = useState("A");

  const [tasks, setTasks] = useState({ A: {}, B: {}, C: {} });
  const [records, setRecords] = useState([]);

  useEffect(() => {
    onValue(ref(db, "names"), s => s.val() && setNames(s.val()));
    onValue(ref(db, "period"), s => s.val() && setPeriod(s.val()));

    onValue(ref(db, "settings"), s => {
      if (s.val()) {
        setAllowEditAll(s.val().allowEditAll);
        setUsePrice(s.val().usePrice ?? true);
      }
    });

    ["A","B","C"].forEach(c=>{
      onValue(ref(db,"tasks/"+c), s=>{
        setTasks(prev=>({...prev,[c]:s.val()||{}}))
      })
    })

    onValue(ref(db,"records"), s=>{
      const data=s.val()
      const list=data?Object.entries(data).map(([id,v])=>({id,...v})):[]
      setRecords(list)
    })
  },[])

  const saveNames=()=>set(ref(db,"names"),names)
  const savePeriod=()=>set(ref(db,"period"),period)

  const saveSetting=()=>{
    set(ref(db,"settings"),{
      allowEditAll,
      usePrice
    })
  }

  const addTask=()=>{
    const r=push(ref(db,"tasks/"+child))
    set(r,{name:task,memo:memo,price:Number(price)})
    setTask("");setMemo("");setPrice("")
  }

  const deleteTask = (c, id) => remove(ref(db, `tasks/${c}/${id}`));

  const getDates=()=>{
    if(!period.start||!period.end)return[]
    let d=new Date(period.start)
    const end=new Date(period.end)
    const arr=[]
    while(d<=end){
      arr.push(d.toISOString().split("T")[0])
      d.setDate(d.getDate()+1)
    }
    return arr
  }

  const formatDate=(d)=>{
    const dt=new Date(d)
    return `${dt.getMonth()+1}/${dt.getDate()}`
  }

  const isDone=(date,task)=>{
    return records.some(r=>r.child===childParam&&r.date===date&&r.task===task)
  }

  const toggle=(date,task)=>{
    if(!allowEditAll && date!==today)return

    const exist=records.find(r=>r.child===childParam&&r.date===date&&r.task===task)
    if(exist){
      remove(ref(db,"records/"+exist.id))
    }else{
      const r=push(ref(db,"records"))
      set(r,{child:childParam,date,task,done:true})
      playSound();
    }
  }

  const calcRow=(date,c)=>{
    return Object.values(tasks[c]).reduce((sum,t)=>{
      if(records.some(r=>r.child===c&&r.date===date&&r.task===t.name)){
        return sum+t.price
      }
      return sum
    },0)
  }

  const calcTotal=(c)=>{
    return getDates().reduce((s,d)=>s+calcRow(d,c),0)
  }

  const calcAllTotal=()=>{
    return ["A","B","C"].reduce((sum,c)=>sum+calcTotal(c),0)
  }

  // 👨 親画面
  if(!childParam){
    return(
      <div style={{padding:20,textAlign:"left"}}>
        <h1>親ダッシュボード</h1>

        <h2>名前</h2>
        {["A","B","C"].map(c=>(
          <input key={c} value={names[c]}
            onChange={e=>setNames({...names,[c]:e.target.value})}/>
        ))}
        <button onClick={saveNames}>保存</button>

        <h2>期間</h2>
        <input type="date" onChange={e=>setPeriod({...period,start:e.target.value})}/>
        <input type="date" onChange={e=>setPeriod({...period,end:e.target.value})}/>
        <button onClick={savePeriod}>保存</button>

        <h2>機能設定</h2>
        <label>
          <input type="checkbox" checked={allowEditAll}
            onChange={e=>setAllowEditAll(e.target.checked)}/>
          過去・未来入力OK
        </label>

        <br/>

        <label>
          <input type="checkbox" checked={usePrice}
            onChange={e=>setUsePrice(e.target.checked)}/>
          金額機能ON/OFF
        </label>

        <br/>
        <button onClick={saveSetting}>保存</button>

        <h2>宿題登録</h2>
        <select onChange={e=>setChild(e.target.value)}>
          <option>A</option><option>B</option><option>C</option>
        </select>

        <input placeholder="宿題" value={task} onChange={e=>setTask(e.target.value)}/>
        <input placeholder="補足" value={memo} onChange={e=>setMemo(e.target.value)}/>
        {usePrice && (
          <input placeholder="単価" value={price} onChange={e=>setPrice(e.target.value)}/>
        )}

        <button onClick={addTask}>追加</button>

        {["A","B","C"].map(c=>(
          <div key={c}>
            <h3>{names[c]}</h3>

            {usePrice && <p>合計：{calcTotal(c)}円</p>}

            {tasks[c] && Object.entries(tasks[c]).map(([id,t])=>(
              <div key={id}>
                {t.name} {usePrice && `（${t.price}円）`}
                <button onClick={()=>deleteTask(c,id)}>削除</button>
              </div>
            ))}
          </div>
        ))}

        {usePrice && <h2>全体合計：{calcAllTotal()}円</h2>}
      </div>
    )
  }

  // 👦 子供画面
  const dates=getDates()
  const list=Object.values(tasks[childParam]||{})

  return(
    <div style={{
      overflowX:"auto",
      background:"linear-gradient(to right,#89f7fe,#66a6ff)",
      minHeight:"100vh",
      padding:"10px"
    }}>
      <h1 style={{textAlign:"center",color:"white"}}>
        🎮 {names[childParam]}
      </h1>

      <table style={{
        minWidth:"900px",
        textAlign:"center",
        background:"white"
      }}>
        <thead>
          <tr>
            <th>日付</th>
            {list.map((t,i)=>(
              <th key={i}>
                <div>{t.name}</div>
                <div style={{fontSize:"12px"}}>
                  {t.memo?.slice(0,4)}
                </div>
              </th>
            ))}
            <th>状態</th>
            {usePrice && <th>金額</th>}
          </tr>
        </thead>

        <tbody>
          {dates.map(d=>{
            const sum=calcRow(d,childParam)
            const allDone=list.every(t=>isDone(d,t.name))

            return(
              <tr key={d}>
                <td>{formatDate(d)}</td>

                {list.map((t,i)=>{
                  const done=isDone(d,t.name)
                  return(
                    <td key={i}
                      onClick={()=>toggle(d,t.name)}
                      style={{
                        background:done?"#4CAF50":"#FF6B6B",
                        color:"#fff",
                        height:"70px",
                        cursor:"pointer"
                      }}>
                      {done?"⭐":""}
                    </td>
                  )
                })}

                <td>{allDone?"🎉ぜんぶおわり！":"まだのこってる！"}</td>
                {usePrice && <td>{sum}円</td>}
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={list.length+2}>合計</td>
            {usePrice && <td>{calcTotal(childParam)}円</td>}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default App;