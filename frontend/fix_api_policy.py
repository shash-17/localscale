with open("src/services/api.ts", "r") as f:
    text = f.read()

text = text.replace("export async function addPolicy(rule: string)", "export async function addPolicy(rule: any)")
with open("src/services/api.ts", "w") as f:
    f.write(text)

with open("src/components/PolicyPanel.tsx", "r") as f:
    t = f.read()
t = t.replace("import { useEffect, useState, FormEvent } from 'react'", "import React, { useEffect, useState } from 'react'\nimport type { FormEvent } from 'react'")
with open("src/components/PolicyPanel.tsx", "w") as f:
    f.write(t)
