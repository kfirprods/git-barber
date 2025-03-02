import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:17380'
});

export async function isGitRepo(repoPath: string): Promise<boolean> {
  const response = await axiosInstance.get(`/is-git-repo?repo_path=${repoPath}`);
  return response.data.is_git_repo;
}
