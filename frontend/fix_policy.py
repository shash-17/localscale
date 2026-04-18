with open("src/services/api.ts", "r") as f:
    text = f.read()

text = text.replace("export async function addPolicy(policy: string)", "export async function addPolicy(policy: any)")
with open("src/services/api.ts", "w") as f:
    f.write(text)

with open("src/components/PolicyPanel.tsx", "r") as f:
    t = f.read()
t = t.replace("import React, { useEffect, useState } from 'react'", "import { useEffect, useState } from 'react'")
with open("src/components/PolicyPanel.tsx", "w") as f:
    f.write(t)
