import re

with open("frontend/src/services/api.ts", "r") as f:
    content = f.read()

appendix = """
export async function fetchPolicies(): Promise<any[]> {
  try {
    const { data } = await api.get<any[]>('/policies')
    return data
  } catch(e) {
    return []
  }
}

export async function addPolicy(policy: string): Promise<any> {
  const { data } = await api.post('/policies', { policy })
  return data
}
"""

if "fetchPolicies" not in content:
    with open("frontend/src/services/api.ts", "a") as f:
        f.write(appendix)
