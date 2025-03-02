from fastapi import APIRouter, HTTPException
from git import Repo
from pydantic import BaseModel
import os

router = APIRouter()

class CreateBranchModel(BaseModel):
    repo_path: str
    new_branch: str

@router.post("/create-branch")

def create_branch(data: CreateBranchModel):
    data.repo_path = os.path.expanduser(data.repo_path)
    if not os.path.exists(data.repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(data.repo_path)
        repo.git.checkout('-b', data.new_branch)
        return {"message": f"Created and checked out new branch {data.new_branch}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 