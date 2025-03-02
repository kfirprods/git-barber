from fastapi import APIRouter, HTTPException
from git import Repo
from pydantic import BaseModel
import os

router = APIRouter()

class PushModel(BaseModel):
    repo_path: str
    branch: str

@router.post("/push")

def push_branch(data: PushModel):
    data.repo_path = os.path.expanduser(data.repo_path)
    if not os.path.exists(data.repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(data.repo_path)
        push_result = repo.git.push('origin', data.branch)
        return {"message": f"Pushed branch {data.branch} to origin", "result": push_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 