with open("backend/main.py", "r") as f:
    content = f.read()

# Update DeployRequest class
old_deploy_request = """class DeployRequest(BaseModel):
    image: str
    name: str
    replicas: int = 1
    ports: Optional[Dict[str, Any]] = None"""
new_deploy_request = """class DeployRequest(BaseModel):
    image: str
    name: str
    replicas: int = 1
    ports: Optional[Dict[str, Any]] = None
    environment: Optional[Dict[str, str]] = None"""
content = content.replace(old_deploy_request, new_deploy_request)

# Update PolicyCreate to accept Union dict or str
old_policy_create = """class PolicyCreate(BaseModel):
    policy: str"""
new_policy_create = """class PolicyCreate(BaseModel):
    policy: Any"""
content = content.replace(old_policy_create, new_policy_create)

# add new endpoints before @app.post("/deploy")
endpoints = """
@app.post("/containers/{container_id}/stop")
def stop_container(container_id: str):
    docker_required()
    success = manager.stop_container(container_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to stop container")
    return {"status": "ok"}

@app.post("/containers/{container_id}/start")
def start_existing_container(container_id: str):
    docker_required()
    success = manager.start_container_by_id(container_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start container")
    return {"status": "ok"}

@app.delete("/containers/{container_id}")
def remove_container(container_id: str):
    docker_required()
    success = manager.remove_container(container_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to remove container")
    return {"status": "ok"}

@app.post("/deploy")"""

if 'def stop_container' not in content:
    content = content.replace('@app.post("/deploy")', endpoints)

# Note: manager.scale_container takes 'environment' now
deploy_scale_old = """    results = manager.scale_container(req.name, req.replicas, image=req.image, ports=req.ports)"""
deploy_scale_new = """    results = manager.scale_container(req.name, req.replicas, image=req.image, ports=req.ports, environment=req.environment)"""
content = content.replace(deploy_scale_old, deploy_scale_new)

with open("backend/main.py", "w") as f:
    f.write(content)
