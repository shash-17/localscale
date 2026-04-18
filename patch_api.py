with open("frontend/src/services/api.ts", "r") as f:
    content = f.read()

content = content.replace("ports?: Record<string, any>", "ports?: Record<string, any>\n  environment?: Record<string, string>")

extras = """

export async function stopContainer(id: string): Promise<any> {
  const { data } = await api.post(`/containers/${id}/stop`)
  return data
}

export async function startContainer(id: string): Promise<any> {
  const { data } = await api.post(`/containers/${id}/start`)
  return data
}

export async function removeContainer(id: string): Promise<any> {
  const { data } = await api.delete(`/containers/${id}`)
  return data
}
"""

if "stopContainer" not in content:
    content += extras

with open("frontend/src/services/api.ts", "w") as f:
    f.write(content)

