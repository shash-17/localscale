import re

with open("frontend/src/components/ContainerList.tsx", "r") as f:
    content = f.read()

# Make sure to import startContainer, stopContainer, removeContainer
import_replace = """import { fetchContainers, fetchStats, startContainer, stopContainer, removeContainer } from '../services/api'"""
content = content.replace("import { fetchContainers, fetchStats } from '../services/api'", import_replace)

# Define action methods inside ContainerList before return
actions = """
  async function handleAction(e: React.MouseEvent, action: string, id: string) {
    e.stopPropagation()
    setLoading(true)
    try {
      if (action === 'start') await startContainer(id)
      if (action === 'stop') await stopContainer(id)
      if (action === 'remove') await removeContainer(id)
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      load()
    }
  }

  return (
"""
content = content.replace("  return (\n", actions)

# Add the UI for actions in the card
card_bottom = """
              <div className="mt-3 pt-3 border-t flex justify-end gap-2 text-xs">
                {c.status !== 'running' ? (
                  <button onClick={(e) => handleAction(e, 'start', c.id)} className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">Start</button>
                ) : (
                  <button onClick={(e) => handleAction(e, 'stop', c.id)} className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Stop</button>
                )}
                <button onClick={(e) => handleAction(e, 'remove', c.id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Remove</button>
              </div>
            </div>"""

content = content.replace("</div>\n          )\n        })}\n", card_bottom + "\n          )\n        })}\n")

with open("frontend/src/components/ContainerList.tsx", "w") as f:
    f.write(content)
