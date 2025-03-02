from fastapi import APIRouter, HTTPException
from git import Repo
from pydantic import BaseModel
from typing import List
import os

router = APIRouter()

class CopyFilesModel(BaseModel):
    repo_path: str
    source_branch: str
    destination_branch: str
    files: List[str]

@router.post("/copy-files")

def copy_files(data: CopyFilesModel):
    data.repo_path = os.path.expanduser(data.repo_path)
    if not os.path.exists(data.repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(data.repo_path)
        # Checkout destination branch first
        repo.git.checkout(data.destination_branch)
        # For each file, copy it from the source branch
        for file in data.files:
            repo.git.checkout(data.source_branch, '--', file)
        # Stage the files
        repo.index.add(data.files)
        return {"message": f"Copied and staged files from {data.source_branch} to {data.destination_branch}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 