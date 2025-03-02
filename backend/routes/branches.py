from fastapi import APIRouter, HTTPException
from git import Repo
import os

router = APIRouter()

@router.get("/branches")
def get_branches(repo_path: str):
    repo_path = os.path.expanduser(repo_path)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(repo_path)
        branches = []
        for branch in repo.heads:
            # Get the last commit datetime in ISO format
            commit_time = branch.commit.committed_datetime
            branches.append({"name": branch.name, "last_commit_time": commit_time.isoformat()})

        # Sort branches by last_commit_time descendingly
        branches = sorted(branches, key=lambda x: x["last_commit_time"], reverse=True)
        branches = branches[:100]
        return {"branches": branches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
        raise HTTPException(status_code=500, detail=str(e)) 