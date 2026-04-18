with open("frontend/src/components/ControlPanel.tsx", "r") as f:
    content = f.read()

# Add env state
content = content.replace("const [replicas, setReplicas] = useState<number>(1)", "const [replicas, setReplicas] = useState<number>(1)\n  const [envVars, setEnvVars] = useState('')")

# Update deploy function
handle_deploy_old = """    try {
      await deployService({ image, name, replicas })"""

handle_deploy_new = """    try {
      let environment: Record<string, string> | undefined = undefined;
      if (envVars) {
        environment = {}
        envVars.split('\\n').forEach(line => {
          const [k, ...v] = line.split('=')
          if (k && k.trim()) environment![k.trim()] = v.join('=').trim()
        })
      }
      await deployService({ image, name, replicas, environment })"""

content = content.replace(handle_deploy_old, handle_deploy_new)

# Update UI for form
form_old = """        <div className="flex gap-2">
          <input value={image} onChange={(e) => setImage(e.target.value)} className="border px-2 py-1 flex-1" placeholder="image:tag" />
          <input value={name} onChange={(e) => setName(e.target.value)} className="border px-2 py-1 w-40" placeholder="name" />
          <input type="number" value={replicas} onChange={(e) => setReplicas(Number(e.target.value))} className="border px-2 py-1 w-24" min={1} />
          <button className="bg-indigo-600 text-white px-3 py-1 rounded">Deploy</button>
        </div>"""

form_new = """        <div className="flex gap-2">
          <input value={image} onChange={(e) => setImage(e.target.value)} className="border px-2 py-1 flex-1" placeholder="image:tag" />
          <input value={name} onChange={(e) => setName(e.target.value)} className="border px-2 py-1 w-32" placeholder="name" />
          <input type="number" value={replicas} onChange={(e) => setReplicas(Number(e.target.value))} className="border px-2 py-1 w-16" min={1} />
        </div>
        <textarea value={envVars} onChange={(e) => setEnvVars(e.target.value)} className="border px-2 py-1 w-full text-sm font-mono h-16" placeholder={`KEY=value\\nOTHER_KEY=something`} />
        <button className="bg-indigo-600 text-white px-3 py-1 rounded w-full">Deploy Configured Container</button>"""

content = content.replace(form_old, form_new)

with open("frontend/src/components/ControlPanel.tsx", "w") as f:
    f.write(content)
