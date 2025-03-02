from fastapi import APIRouter, HTTPException
from git import Repo
from pydantic import BaseModel
import os

router = APIRouter()

class CheckoutModel(BaseModel):
    repo_path: str
    branch: str

@router.post("/checkout")

def checkout_branch(data: CheckoutModel):
    data.repo_path = os.path.expanduser(data.repo_path)
    if not os.path.exists(data.repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(data.repo_path)
        repo.git.checkout(data.branch)
        return {"message": f"Checked out branch {data.branch}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 