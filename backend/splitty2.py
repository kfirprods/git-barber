import os
import click
import inquirer
import requests

API_BASE = "http://localhost:17380"

def get_repo_branches(repo_path):
    response = requests.get(f"{API_BASE}/branches", params={"repo_path": repo_path})
    if response.status_code != 200:
        raise Exception(f"Error fetching branches: {response.json().get('detail', 'Unknown error')}")
    return response.json().get("branches", [])

def get_diff(repo_path, base_branch, target_branch, detailed=False):
    params = {"repo_path": repo_path, "base_branch": base_branch, "target_branch": target_branch, "detailed": detailed}
    response = requests.get(f"{API_BASE}/diff", params=params)
    if response.status_code != 200:
        raise Exception(f"Error fetching diff: {response.json().get('detail', 'Unknown error')}")
    return response.json().get("diff", "")

def checkout_branch(repo_path, branch):
    response = requests.post(f"{API_BASE}/checkout", json={"repo_path": repo_path, "branch": branch})
    if response.status_code != 200:
        raise Exception(f"Error checking out branch {branch}: {response.json().get('detail', 'Unknown error')}")
    return response.json()

def create_branch(repo_path, new_branch):
    response = requests.post(f"{API_BASE}/create-branch", json={"repo_path": repo_path, "new_branch": new_branch})
    if response.status_code != 200:
        raise Exception(f"Error creating branch {new_branch}: {response.json().get('detail', 'Unknown error')}")
    return response.json()

def copy_files(repo_path, source_branch, destination_branch, files):
    payload = {
        "repo_path": repo_path,
        "source_branch": source_branch,
        "destination_branch": destination_branch,
        "files": files
    }
    response = requests.post(f"{API_BASE}/copy-files", json=payload)
    if response.status_code != 200:
        raise Exception(f"Error copying files: {response.json().get('detail', 'Unknown error')}")
    return response.json()

def commit_changes(repo_path, message):
    payload = {"repo_path": repo_path, "message": message}
    response = requests.post(f"{API_BASE}/commit", json=payload)
    if response.status_code != 200:
        raise Exception(f"Error committing changes: {response.json().get('detail', 'Unknown error')}")
    return response.json()

def push_branch(repo_path, branch):
    payload = {"repo_path": repo_path, "branch": branch}
    response = requests.post(f"{API_BASE}/push", json=payload)
    if response.status_code != 200:
        raise Exception(f"Error pushing branch {branch}: {response.json().get('detail', 'Unknown error')}")
    return response.json()

@click.command()
@click.option('--repo-path', default=os.getcwd(), help='Path to the Git repository')

def main(repo_path):
    """
    New CLI tool that uses the Git Operations API to manage branches and file splits.
    """
    try:
        # Get list of branches from the API
        branches = get_repo_branches(repo_path)
        if not branches:
            click.echo('No branches found in the repository.')
            return

        # Sort branches preferring those containing 'base' for base branch selection
        base_sorted = sorted(branches, key=lambda x: ('base' not in x.lower(), x.lower()))
        base_question = [
            inquirer.List('branch',
                           message='⚾️ Select a base branch',
                           choices=base_sorted)
        ]
        base_answer = inquirer.prompt(base_question)
        base_branch = base_answer['branch']
        click.echo(f'Selected base branch: {base_branch}')

        # For the branch to split, exclude the base branch and sort alphabetically
        big_candidates = [b for b in branches if b != base_branch]
        if not big_candidates:
            click.echo('No candidate branch available for splitting.')
            return
        big_sorted = sorted(big_candidates, key=lambda x: x.lower())
        big_question = [
            inquirer.List('branch',
                           message='💇‍♂️ Select the branch you want to split',
                           choices=big_sorted)
        ]
        big_answer = inquirer.prompt(big_question)
        big_branch = big_answer['branch']
        click.echo(f'Selected big branch: {big_branch}')

        # Ask for new sub-base branch name
        new_sub_base_branch = click.prompt('Enter a name for the new "sub-base" branch')

        # Checkout the base branch and create the new sub-base branch using API endpoints
        checkout_branch(repo_path, base_branch)
        create_branch(repo_path, new_sub_base_branch)
        click.echo(f'✅ Created and checked out new branch: {new_sub_base_branch}')

        # Get changed files (diff) between base_branch and big_branch
        diff_output = get_diff(repo_path, base_branch, big_branch, detailed=False)
        changed_files_info = []
        for line in diff_output.splitlines():
            parts = line.split(maxsplit=1)
            if len(parts) < 2:
                continue
            status, filename = parts
            if status == "A":
                marker = "(N)"
            elif status == "M":
                marker = "(M)"
            else:
                marker = f"({status})"
            changed_files_info.append((filename, marker))

        file_choices = [(f"{filename} {marker}", filename) for filename, marker in changed_files_info]
        file_question = [
            inquirer.Checkbox('selected_files',
                                message=f'Select files to copy to {new_sub_base_branch}. (Press SPACE to select, ENTER to submit)',
                                choices=file_choices)
        ]
        file_answer = inquirer.prompt(file_question)
        selected_files = file_answer.get('selected_files', [])

        # Use API to copy selected files from big_branch to new_sub_base_branch and commit them
        if selected_files:
            copy_files(repo_path, big_branch, new_sub_base_branch, selected_files)
            commit_msg = f"copied base files from {big_branch}"
            commit_changes(repo_path, commit_msg)
            click.echo(f"✅ Committed selected files to new sub-base branch: {commit_msg}")
        else:
            click.echo('No files selected for sub-base branch copy.')

        click.echo('--------------------------------')

        # Ask for new sub-feature branch name
        new_sub_feature_branch = click.prompt('Enter a name for the new sub-feature branch')

        # Create new sub-feature branch from new_sub_base_branch via API
        create_branch(repo_path, new_sub_feature_branch)
        click.echo(f'✅ Created and checked out new branch: {new_sub_feature_branch}')

        # Determine remaining files (those not selected for sub-base branch)
        all_files = {filename for filename, _ in changed_files_info}
        remaining_files = list(all_files - set(selected_files))
        if remaining_files:
            copy_files(repo_path, big_branch, new_sub_feature_branch, remaining_files)
            commit_msg = f"copied rest of files from {big_branch}"
            commit_changes(repo_path, commit_msg)
            click.echo(f"✅ Committed remaining files to new sub-feature branch: {commit_msg}")
        else:
            click.echo('No remaining files to copy for sub-feature branch.')

        # Display branch summary
        click.echo('\nBranch Summary:')
        click.echo(f"- {base_branch}")
        click.echo(f"  - {new_sub_base_branch} (NEW)")
        click.echo(f"    - {new_sub_feature_branch} (NEW)")

        # Ask user if they want to push the branches
        push_choice_text = f"Push both branches to origin/{new_sub_feature_branch}"
        push_question = [
            inquirer.List('push_choice',
                           message='Would you like to push the new branches to the remote?',
                           choices=[push_choice_text, "Don't push anything please"])
        ]
        push_answer = inquirer.prompt(push_question)
        if push_answer.get('push_choice') == push_choice_text:
            push_branch(repo_path, new_sub_base_branch)
            push_branch(repo_path, new_sub_feature_branch)
            click.echo('✅ Pushed both branches to origin')
        else:
            click.echo('👌 No branches were pushed')

    except Exception as e:
        click.echo(f'Error: {e}')

if __name__ == '__main__':
    main() 