import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:17380'
});

export async function isGitRepo(repoPath: string): Promise<boolean> {
  const response = await axiosInstance.get(
    `/is-git-repo?repo_path=${encodeURIComponent(repoPath)}`
  );
  return response.data.is_git_repo;
}

export type GitDiffData = {
  changed_files: {
    file: string;
    status: string;
    changed_hunks: {
      hunk_header: string;
      lines: {
        line_type: string;
        text: string;
      }[];
    }[];
  }[];
  lines_added: number;
  lines_deleted: number;
};

export async function getDetailedDiff(
  repoPath: string,
  baseBranch: string,
  mergedBranch: string
): Promise<GitDiffData> {
  const response = await axiosInstance.get('/diff', {
    params: {
      repo_path: repoPath,
      base_branch: baseBranch,
      target_branch: mergedBranch,
      detailed: true
    }
  });
  return response.data.diff;
}
