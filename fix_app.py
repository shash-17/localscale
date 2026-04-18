with open("frontend/src/App.tsx", "r") as f:
    text = f.read()

# fix selected === c.name in ContainerList
with open("frontend/src/components/ContainerList.tsx", "r") as f:
    text_cls = f.read()

# HandleAction error
# Let's see where handleAction is
if "handleAction" in text_cls:
    pass

text_cls = text_cls.replace("const isSelected = selected === c.name", "const isSelected = selected?.includes(c.name)")
with open("frontend/src/components/ContainerList.tsx", "w") as f:
    f.write(text_cls)

# Fix Container import in MetricsChart
with open("frontend/src/components/MetricsChart.tsx", "r") as f:
    text_mc = f.read()
text_mc = text_mc.replace("import { Container }", "import type { Container }")
with open("frontend/src/components/MetricsChart.tsx", "w") as f:
    f.write(text_mc)
