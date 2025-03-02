export type Repository = {
  path: string;
  lastUsed: string;
};

export const getRepositories = (): Repository[] => {
  const repos = localStorage.getItem('repositories');
  return repos ? (JSON.parse(repos) as Repository[]) : [];
};

export const saveRepositories = (repositories: Repository[]): void => {
  localStorage.setItem('repositories', JSON.stringify(repositories));
};
