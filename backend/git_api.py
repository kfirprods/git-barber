from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import os
from git import Repo
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class RepoPathModel(BaseModel):
    repo_path: str

class CheckoutModel(RepoPathModel):
    branch: str

class CreateBranchModel(RepoPathModel):
    new_branch: str

class CopyFilesModel(RepoPathModel):
    source_branch: str
    destination_branch: str
    files: List[str]

class CommitModel(RepoPathModel):
    message: str

class PushModel(RepoPathModel):
    branch: str

# Endpoint 1: Get all branches from the given repository path
@app.get("/branches")
def get_branches(repo_path: str):
    repo_path = os.path.expanduser(repo_path)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(repo_path)
        branches = [branch.name for branch in repo.heads]
        return {"branches": branches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint 2: Get a diff between two branches
# TODO: improve the response body to contain:
#   1) # of lines added
#   2) # of lines deleted
#   3) per-file structure
@app.get("/diff")
def diff(repo_path: str, base_branch: str, target_branch: str, detailed: bool = False, mode: str = "pr"):
    repo_path = os.path.expanduser(repo_path)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
    try:
        repo = Repo(repo_path)
        if mode == "pr":
            merge_base = repo.git.merge_base(base_branch, target_branch).strip()
            diff_range = f"{merge_base}..{target_branch}"
        elif mode == "absolute":
            diff_range = f"{base_branch}..{target_branch}"
        else:
            raise HTTPException(status_code=400, detail="Invalid mode. Use 'pr' or 'absolute'.")

        if detailed:
            diff_text = repo.git.diff(diff_range)
            total_added = 0
            total_deleted = 0
            changed_files = []
            current_file = None
            current_hunk = None

            for line in diff_text.splitlines():
                if line.startswith("diff --git"):
                    if current_file:
                        if current_hunk:
                            current_file["changed_hunks"].append(current_hunk)
                            current_hunk = None
                        changed_files.append(current_file)
                    parts = line.split()
                    filename = parts[3][2:] if len(parts) >= 4 else "unknown"
                    current_file = {"file": filename, "lines_added": 0, "lines_deleted": 0, "changed_hunks": [], "status": "modified"}
                    current_hunk = None
                elif current_file is not None:
                    if line.startswith("@@"):
                        if current_hunk:
                            current_file["changed_hunks"].append(current_hunk)
                        current_hunk = {"hunk_header": line, "lines": []}
                    elif line.startswith("new file mode"):
                        current_file["status"] = "added"
                    elif line.startswith("deleted file mode"):
                        current_file["status"] = "deleted"
                    elif line.startswith("rename from"):
                        current_file["status"] = "renamed"
                        current_file["old_file"] = line.replace("rename from", "").strip()
                    elif line.startswith("rename to"):
                        current_file["new_file"] = line.replace("rename to", "").strip()
                    elif line.startswith('+++') or line.startswith('---') or line.startswith('index '):
                        continue
                    else:
                        if current_hunk is None:
                            current_hunk = {"hunk_header": "", "lines": []}
                        if line.startswith('+') and not line.startswith('+++'):
                            current_hunk["lines"].append({"text": line[1:], "line_type": "added"})
                            current_file["lines_added"] += 1
                            total_added += 1
                        elif line.startswith('-') and not line.startswith('---'):
                            current_hunk["lines"].append({"text": line[1:], "line_type": "deleted"})
                            current_file["lines_deleted"] += 1
                            total_deleted += 1
                        elif line.startswith(' '):
                            current_hunk["lines"].append({"text": line[1:], "line_type": "context"})
                        else:
                            current_hunk["lines"].append({"text": line, "line_type": "context"})
            if current_file:
                if current_hunk:
                    current_file["changed_hunks"].append(current_hunk)
                changed_files.append(current_file)

            diff_output = {
                "lines_added": total_added,
                "lines_deleted": total_deleted,
                "changed_files": changed_files
            }
        else:
            diff_output = repo.git.diff("--name-status", diff_range)
        return {"diff": diff_output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint 3: Checkout a branch
@app.post("/checkout")
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

# Endpoint 4: Create a new branch (and checkout the new branch)
@app.post("/create-branch")
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

# Endpoint 5: Copy specified files from a source branch to a destination branch and stage them
@app.post("/copy-files")
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

# Endpoint 6: Commit staged changes with a commit message
@app.post("/commit")
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

# Endpoint 7: Push a branch to remote
@app.post("/push")
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

# Endpoint 8: Check if a given path is a git repository
@app.get("/is-git-repo")
def is_git_repo(repo_path: str):
    repo_path = os.path.expanduser(repo_path)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Path does not exist")
    try:
        repo = Repo(repo_path)
        # If the path is a git repository, it should have a .git directory
        if repo.git_dir:
            return {"is_git_repo": True}
        else:
            return {"is_git_repo": False}
    except Exception:
        return {"is_git_repo": False}

# Endpoint 9: Get the name of the current checked-out branch
@app.get("/current-branch")
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
