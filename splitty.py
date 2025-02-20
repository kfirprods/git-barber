import click
from git import Repo
import os
import inquirer

def select_branch(repo, prompt):
    branches = [head.name for head in repo.heads]
    question = [
        inquirer.List('branch',
                      message=prompt,
                      choices=branches)
    ]
    answer = inquirer.prompt(question)
    return answer['branch']

def get_changed_files(repo, base_branch, big_branch):
    diff = repo.git.diff(f'{base_branch}..{big_branch}', name_only=True)
    return diff.splitlines()

@click.command()
@click.option('--repo-path', default=os.getcwd(), help='Path to the Git repository')
def main(repo_path):
    """
    CLI tool to manage Git branches and files.
    """
    try:
        repo = Repo(repo_path)
        if repo.bare:
            click.echo('Error: Not a valid Git repository')
            return

        # Select base_branch
        base_branch = select_branch(repo, 'Select a base branch')
        click.echo(f'Selected base branch: {base_branch}')

        # Select big_branch
        big_branch = select_branch(repo, 'Select a big branch')
        click.echo(f'Selected big branch: {big_branch}')

        # Ask for new_sub_base_branch name
        new_sub_base_branch = click.prompt('Enter a name for the new sub-base branch')

        # Checkout base_branch and create new_sub_base_branch
        repo.git.checkout(base_branch)
        repo.git.checkout('-b', new_sub_base_branch)
        click.echo(f'Created and checked out new branch: {new_sub_base_branch}')

        # Get changed files
        changed_files = get_changed_files(repo, base_branch, big_branch)
        click.echo('Changed files:')
        for file in changed_files:
            click.echo(file)

        # Prompt user to select files to copy using inquirer
        file_question = [
            inquirer.Checkbox('selected_files',
                             message='Select files to copy to new sub-base branch',
                             choices=changed_files)
        ]
        selected_files = inquirer.prompt(file_question)['selected_files']

        # Checkout selected files from big_branch
        for file in selected_files:
            repo.git.checkout(big_branch, '--', file)

        # Stage and commit selected files
        repo.index.add(selected_files)
        commit_message = f'copied base files from {big_branch}'
        repo.index.commit(commit_message)
        click.echo(f'Committed selected files to new sub-base branch: {commit_message}')

        # Ask for new_sub_feature_branch name
        new_sub_feature_branch = click.prompt('Enter a name for the new sub-feature branch')

        # Create new_sub_feature_branch from new_sub_base_branch
        repo.git.checkout(new_sub_base_branch)
        repo.git.checkout('-b', new_sub_feature_branch)
        click.echo(f'Created and checked out new branch: {new_sub_feature_branch}')

        # Copy remaining files to new_sub_feature_branch
        remaining_files = set(changed_files) - set(selected_files)
        for file in remaining_files:
            repo.git.checkout(big_branch, '--', file)

        # Stage and commit remaining files
        repo.index.add(remaining_files)
        commit_message = f'copied rest of files from {big_branch}'
        repo.index.commit(commit_message)
        click.echo(f'Committed remaining files to new sub-feature branch: {commit_message}')

        # Show a summary of the branches created
        click.echo('\nBranch Summary:')
        click.echo(f'- {base_branch}')
        click.echo(f'  - {new_sub_base_branch} (NEW)')
        click.echo(f'    - {new_sub_feature_branch} (NEW)')

        # Ask the user if they want to push the branches
        push_question = [
            inquirer.List('push_choice',
                          message='Would you like to push the new branches to origin?',
                          choices=[
                              'Push both branches to origin/<name>',
                              "Don't push anything please"
                          ])
        ]
        push_choice = inquirer.prompt(push_question)['push_choice']

        if push_choice == 'Push both branches to origin':
            repo.git.push('origin', new_sub_base_branch)
            repo.git.push('origin', new_sub_feature_branch)
            click.echo('Pushed both branches to origin')
        else:
            click.echo('No branches were pushed')

    except Exception as e:
        click.echo(f'Error: {e}')

if __name__ == '__main__':
    main()
