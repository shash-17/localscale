with open("frontend/src/App.tsx", "r") as f:
    text = f.read()

# Update state selected
text = text.replace("const [selected, setSelected] = useState<string | null>(null)", "const [selected, setSelected] = useState<string[]>([])")

# Update handleSelect to toggle an array
handle_select_old = """  function handleSelect(name: string) {
    setSelected((prev) => (prev === name ? null : name))
  }"""
handle_select_new = """  function handleSelect(name: string) {
    setSelected((prev) => 
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    )
  }"""
text = text.replace(handle_select_old, handle_select_new)

# Update loading step where selected is preset initially
load_old = """        if (!selected && cs.length > 0) {
          setSelected(cs[0].name)
        }"""
load_new = """        if (selected.length === 0 && cs.length > 0) {
          // Default to all selected
          setSelected(cs.map((c: any) => c.name))
        }"""
text = text.replace(load_old, load_new)
text = text.replace("if (!selected && cs.length > 0)", "if (selected.length === 0 && cs.length > 0)") # Just in case

# Fix type issue since I'm passing a string array but ContainerList expected a string | undefined
# Oh wait, ContainerList expects selected?: string
# We need to change ContainerList to accept string[]
import re
text = re.sub(r'selected=\{selected \?\? undefined\}', 'selected={selected}', text)

# Pass containers to MetricsChart filtered by selected
chart_old = """<MetricsChart containerName={selected ?? undefined} />"""
chart_new = """<MetricsChart containers={containers.filter(c => selected.includes(c.name))} />"""
text = text.replace(chart_old, chart_new)

with open("frontend/src/App.tsx", "w") as f:
    f.write(text)

with open("frontend/src/components/ContainerList.tsx", "r") as f:
    text_cls = f.read()

text_cls = text_cls.replace("selected?: string", "selected?: string[]")
text_cls = text_cls.replace("className={`p-3 bg-white dark:bg-gray-800 rounded-lg border cursor-pointer hover:shadow-md transition ${selected === c.name ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700'}`}", 
                            "className={`p-3 bg-white dark:bg-gray-800 rounded-lg border cursor-pointer hover:shadow-md transition ${selected?.includes(c.name) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700'}`}")
with open("frontend/src/components/ContainerList.tsx", "w") as f:
    f.write(text_cls)
