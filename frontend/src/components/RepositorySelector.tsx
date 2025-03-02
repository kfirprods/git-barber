import type { Repository } from '@/services/local-storage.service';

import React, { useEffect, useState } from 'react';

import { isGitRepo } from '@/services/local-git-api.service';
import { getRepositories, saveRepositories } from '@/services/local-storage.service';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface RepositorySelectorProps {
  onSelect: (repoPath: string) => void;
}

const RepositorySelector: React.FC<RepositorySelectorProps> = ({ onSelect }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setRepositories(getRepositories());
  }, []);

  const handleSelect = async (path: string) => {
    try {
      const isValid = await isGitRepo(path);
      if (isValid) {
        onSelect(path);
        setError('');
        const updatedRepositories = repositories.filter((repo) => repo.path !== path);
        updatedRepositories.push({ path, lastUsed: new Date().toISOString() });
        saveRepositories(updatedRepositories);
        setRepositories(updatedRepositories);
      } else {
        setError('The selected path is not a valid git repository.');
      }
    } catch (err) {
      setError('An error occurred while validating the repository path.');
    }
  };

  return (
    <div className='max-w-[50vw]'>
      <ul className='flex flex-col justify-start'>
        {repositories.map((repo) => (
          <li key={repo.path}>
            <a href='#' className='text-blue-500' onClick={() => handleSelect(repo.path)}>
              {repo.path}
            </a>
          </li>
        ))}

        {repositories.length > 0 && <hr className='my-2 text-blue-500'></hr>}

        <li className='justify-self-center text-center'>
          <a
            href='#'
            className='text-blue-500'
            // TODO: make this dynamic or assume git-barber to run in the correct repo without need for selection at all
            onClick={() => handleSelect('~/projects/aligned-monorepo')}
          >
            + Add New Repository
          </a>
        </li>
      </ul>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
};

export default RepositorySelector;
