with open("backend/docker_manager.py", "r") as f:
    content = f.read()

extras = """
    def start_container_by_id(self, container_id):
        if not self.client:
            return False
        try:
            container = self.client.containers.get(container_id)
            container.start()
            return True
        except Exception as e:
            print(f"Error starting container {container_id}: {e}")
            return False

    def remove_container(self, container_id):
        if not self.client:
            return False
        try:
            container = self.client.containers.get(container_id)
            container.remove(force=True)
            return True
        except Exception as e:
            print(f"Error removing container {container_id}: {e}")
            return False
"""

if "def remove_container" not in content:
    content += extras

with open("backend/docker_manager.py", "w") as f:
    f.write(content)
