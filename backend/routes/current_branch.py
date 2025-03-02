from fastapi import APIRouter, HTTPException
from git import Repo
import os

router = APIRouter()

@router.get("/current-branch")

def get_current_branch(repo_path: str):
    repo_path = os.path.expanduser(repo_path)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(repo_path)
        current_branch = repo.active_branch.name
        return {"current_branch": current_branch}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 