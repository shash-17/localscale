import re

with open('frontend/src/App.tsx', 'r') as f:
    app_code = f.read()

# add import
if 'PolicyPanel' not in app_code:
    app_code = app_code.replace("import ControlPanel from './components/ControlPanel'\n", "import ControlPanel from './components/ControlPanel'\nimport PolicyPanel from './components/PolicyPanel'\n")

# Replace main content to be conditional
main_regex = re.compile(r'(<main className="flex-1 p-4">).*?(</main>)', re.DOTALL)

replacement = """\\1
          {nav === 'dashboard' && (
            <>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold">Dashboard</h1>
                  <p className="text-sm text-gray-500">Overview of running containers</p>
                </div>
                <div className="w-full md:w-96">
                  <EconomicsPanel />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ContainerList containers={containers} selected={selected ?? undefined} onSelect={handleSelect} />
                </div>
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border h-64 md:h-80">
                    <MetricsChart containerName={selected ?? undefined} />
                  </div>
                  <ControlPanel onDone={reloadNow} />
                </div>
              </div>
            </>
          )}

          {nav === 'economics' && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Economics & Scale</h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EconomicsPanel />
              </div>
            </>
          )}

          {nav === 'settings' && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Settings & Policies</h1>
              <PolicyPanel />
            </>
          )}
\\2"""

app_code = main_regex.sub(replacement, app_code)

with open('frontend/src/App.tsx', 'w') as f:
    f.write(app_code)

