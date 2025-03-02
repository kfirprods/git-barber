from fastapi import APIRouter, HTTPException
from git import Repo
import os

router = APIRouter()

@router.get("/diff")

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