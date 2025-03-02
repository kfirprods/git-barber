from fastapi import APIRouter, HTTPException
from git import Repo
from pydantic import BaseModel
import os

router = APIRouter()

class CommitModel(BaseModel):
    repo_path: str
    message: str

@router.post("/commit")

def commit_changes(data: CommitModel):
    data.repo_path = os.path.expanduser(data.repo_path)
    if not os.path.exists(data.repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(data.repo_path)
        commit = repo.index.commit(data.message)
        return {"message": f"Committed changes with message: {data.message}", "commit": str(commit)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 