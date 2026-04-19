import docker
from docker.errors import DockerException, NotFound, APIError

class ContainerManager:
    def __init__(self):
        try:
            self.client = docker.from_env()
        except DockerException as e:
            self.client = None
            print(f"Docker client initialization failed: {e}")
        self.last_error: str | None = None

    @staticmethod
    def _image_label(container) -> str:
        """Best-effort image label that does not fail when image metadata is missing."""
        try:
            img = container.image
            if img.tags:
                return img.tags[0]
            if getattr(img, "short_id", None):
                return img.short_id
        except Exception:
            pass
        try:
            cfg = (container.attrs or {}).get("Config") or {}
            if cfg.get("Image"):
                return str(cfg.get("Image"))
            if (container.attrs or {}).get("Image"):
                return str((container.attrs or {}).get("Image"))
        except Exception:
            pass
        return "<unknown-image>"

    def list_containers(self):
        if not self.client:
            return []
        try:
            containers = self.client.containers.list()
            result = []
            for c in containers:
                try:
                    image_label = self._image_label(c)
                # Extract port mappings, e.g. {'80/tcp': [{'HostPort': '8080'}]} -> '8080'
                    port_mappings = []
                    if c.ports:
                        for container_port, host_bindings in c.ports.items():
                            if host_bindings:
                                for binding in host_bindings:
                                    if 'HostPort' in binding:
                                        port_mappings.append(f"{binding['HostPort']}->{container_port.split('/')[0]}")

                    result.append({
                        'ID': c.id,
                        'Name': c.name,
                        'Status': c.status,
                        'Image': image_label,
                        'Ports': port_mappings
                    })
                except Exception as e:
                    # Skip malformed container metadata but keep API responsive.
                    print(f"Error parsing container {getattr(c, 'id', '<unknown>')}: {e}")
                    continue
            return result
        except DockerException as e:
            print(f"Error listing containers: {e}")
            return []

    def get_container_stats(self, container_id):
        if not self.client:
            return {}
        try:
            container = self.client.containers.get(container_id)
            stats = container.stats(stream=False)
            # Safely compute CPU percentage
            cpu_stats = stats.get('cpu_stats', {})
            precpu_stats = stats.get('precpu_stats', {})
            cpu_usage = cpu_stats.get('cpu_usage', {})
            precpu_usage = precpu_stats.get('cpu_usage', {})
            total_usage = cpu_usage.get('total_usage', 0)
            precpu_total = precpu_usage.get('total_usage', 0)
            cpu_delta = total_usage - precpu_total
            system_cpu = cpu_stats.get('system_cpu_usage') or 0
            precpu_system = precpu_stats.get('system_cpu_usage') or 0
            system_delta = system_cpu - precpu_system
            percpu = cpu_usage.get('percpu_usage')
            try:
                percpu_count = int(cpu_stats.get('online_cpus') or (len(percpu) if percpu is not None else 1))
            except Exception:
                percpu_count = 1
            cpu_percent = 0.0
            if system_delta > 0 and cpu_delta > 0:
                try:
                    cpu_percent = (cpu_delta / system_delta) * percpu_count * 100.0
                except Exception:
                    cpu_percent = 0.0

            # Memory
            mem_stats = stats.get('memory_stats', {})
            mem_usage = mem_stats.get('usage', 0)
            mem_limit = mem_stats.get('limit') or 1
            mem_percent = (mem_usage / mem_limit) * 100.0 if mem_limit else 0.0

            # Network
            net = stats.get('networks') or {}
            net_rx = sum([v.get('rx_bytes', 0) for v in net.values()]) if net else 0
            net_tx = sum([v.get('tx_bytes', 0) for v in net.values()]) if net else 0
            return {
                'CPU %': round(cpu_percent, 2),
                'Memory Usage': f"{mem_usage / (1024 ** 2):.2f} MiB / {mem_limit / (1024 ** 2):.2f} MiB ({mem_percent:.2f}%)",
                'Network I/O': f"{net_rx / (1024 ** 2):.2f} MiB / {net_tx / (1024 ** 2):.2f} MiB"
            }
        except (DockerException, NotFound) as e:
            print(f"Error getting stats for container {container_id}: {e}")
            return {}

    def start_container(self, image, name, ports=None, environment=None):
        if not self.client:
            return None
        try:
            self.last_error = None
            container = self.client.containers.run(
                image,
                name=name,
                ports=ports,
                environment=environment,
                detach=True
            )
            return container.id
        except (DockerException, APIError) as e:
            self.last_error = str(e)
            print(f"Error starting container: {e}")
            return None

    def stop_container(self, container_id):
        if not self.client:
            return False
        try:
            container = self.client.containers.get(container_id)
            container.stop()
            return True
        except (DockerException, NotFound) as e:
            print(f"Error stopping container {container_id}: {e}")
            return False

    def scale_container(self, name, replicas, image=None, ports=None, environment=None):
        if not self.client:
            return []
        results = []
        try:
            # List all containers with the base name or suffixed names
            containers = self.client.containers.list(all=True, filters={"name": f"^{name}-?\\d*$"})
            running = {c.name: c for c in containers}
            # Start new containers if needed
            for i in range(1, replicas + 1):
                cname = f"{name}-{i}"
                if cname not in running:
                    if image:
                        replica_ports = ports
                        # Avoid host-port collisions when scaling replicas for fixed host bindings.
                        if ports and i > 1:
                            replica_ports = {}
                            for container_port, host_binding in ports.items():
                                if host_binding in (None, "", 0):
                                    replica_ports[container_port] = None
                                else:
                                    replica_ports[container_port] = None

                        cid = self.start_container(image, cname, replica_ports, environment)
                        if cid:
                            results.append({'name': cname, 'action': 'started', 'id': cid})
                        else:
                            results.append({
                                'name': cname,
                                'action': 'failed',
                                'id': None,
                                'error': self.last_error or 'failed to start container',
                            })
                else:
                    c = running[cname]
                    if c.status != 'running':
                        c.start()
                        results.append({'name': cname, 'action': 'started', 'id': c.id})
            # Stop extra containers
            for cname, c in running.items():
                try:
                    if cname.startswith(name + '-'):
                        idx = int(cname.split('-')[-1])
                        if idx > replicas:
                            c.stop()
                            results.append({'name': cname, 'action': 'stopped', 'id': c.id})
                except Exception:
                    continue
            return results
        except DockerException as e:
            print(f"Error scaling containers: {e}")
            return results

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

    def get_container_logs(self, container_id, tail=100):
        if not self.client:
            return ""
        try:
            container = self.client.containers.get(container_id)
            logs = container.logs(tail=tail, stdout=True, stderr=True)
            return logs.decode('utf-8')
        except Exception as e:
            print(f"Error getting logs for container {container_id}: {e}")
            return str(e)
