with open("src/components/PolicyPanel.tsx", "r") as f:
    text = f.read()

# Make it a form
form_old = """      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="border px-3 py-2 flex-1 rounded bg-white dark:bg-gray-800"
          placeholder="e.g. Stop container if CPU uses more than 50% for 5 mins"
        />
        <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded font-medium">Add Rule</button>
      </div>"""

form_new = """      <div className="bg-white dark:bg-gray-800 p-4 border rounded-lg mb-6">
        <h3 className="font-semibold mb-3">Add Custom Threshold</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
             <label className="block text-xs text-gray-500 mb-1">Metric</label>
             <select id="sel-met" className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800">
                <option value="cpu_pct">CPU %</option>
                <option value="mem_mb">Memory (MB)</option>
                <option value="estimated_cost">Cost ($)</option>
             </select>
          </div>
          <div>
             <label className="block text-xs text-gray-500 mb-1">Threshold</label>
             <input id="inp-val" type="number" placeholder="e.g. 50" className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800" />
          </div>
           <div>
             <label className="block text-xs text-gray-500 mb-1">Period</label>
             <select id="sel-per" className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800">
                <option value="None">Instant</option>
                <option value="min">per Minute</option>
                <option value="hr">per Hour</option>
                <option value="day">per Day</option>
             </select>
          </div>
           <div>
             <label className="block text-xs text-gray-500 mb-1">Container Match</label>
             <input id="inp-con" type="text" placeholder="(Optional) name" className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800" />
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="border px-3 py-2 flex-1 rounded bg-white dark:bg-gray-800"
            placeholder="Or write in Natural Language: Stop container if CPU > 50% for 5 mins..."
          />
          <button 
             onClick={() => {
                const met = (document.getElementById('sel-met') as HTMLSelectElement).value;
                const val = (document.getElementById('inp-val') as HTMLInputElement).value;
                const per = (document.getElementById('sel-per') as HTMLSelectElement).value;
                const con = (document.getElementById('inp-con') as HTMLInputElement).value;
                if (val && !draft) {
                   const rawText = `[Form] if ${met} > ${val} ` + (per !== 'None' ? `for 1 ${per}` : '') + (con ? ` in ${con}` : '');
                   const pObj = { metric: met, threshold: Number(val), period: per === 'None' ? null : per, container: con || null, raw: rawText };
                   // Need to use the API directly or set a draft. Since addPolicy takes 'any', we can pass object.
                   handleAddObj(pObj);
                } else {
                   handleAdd();
                }
             }} 
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium"
          >
            Add Rule
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Use the form for precise targets, or Natural Language field.</p>
      </div>"""

text = text.replace(form_old, form_new)

# handleObj injection
obj_inj = """  async function handleAdd() {
    if (!draft.trim()) return
    try {
      await addPolicy(draft)
      setDraft('')
      load()
    } catch (e) {
      console.error(e)
    }
  }
  
  async function handleAddObj(obj: any) {
    try {
      await addPolicy(obj)
      setDraft('')
      load()
    } catch (e) {
      console.error(e)
    }
  }"""
  
text = text.replace("""  async function handleAdd() {
    if (!draft.trim()) return
    try {
      await addPolicy(draft)
      setDraft('')
      load()
    } catch (e) {
      console.error(e)
    }
  }""", obj_inj)

with open("src/components/PolicyPanel.tsx", "w") as f:
    f.write(text)
