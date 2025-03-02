from fastapi import APIRouter, HTTPException
from git import Repo
import os

router = APIRouter()

@router.get("/is-git-repo")

def is_git_repo(repo_path: str):
    repo_path = os.path.expanduser(repo_path)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Path does not exist")
    try:
        repo = Repo(repo_path)
        if repo.git_dir:
            return {"is_git_repo": True}
        else:
            return {"is_git_repo": False}
    except Exception:
        return {"is_git_repo": False} 