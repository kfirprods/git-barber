import { useEffect, useState } from 'react';

import { IoGitBranchOutline } from 'react-icons/io5';

interface BranchesListProps {
  repoPath: string;
  onSelect: (branchName: string) => void;

  customSort?: (branchName1: string, branchName2: string) => number;
  customFilter?: (branchName: string) => boolean;
}

function BranchesList({ repoPath, onSelect, customFilter, customSort }: BranchesListProps) {
  const [branches, setBranches] = useState<{ name: string; last_commit_time: string }[]>([]);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const url = new URL('http://localhost:17380/branches');
        if (repoPath) {
          url.searchParams.append('repo_path', repoPath);
        }
        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(`Error fetching branches: ${res.statusText}`);
        }
        const data = (await res.json()) as {
          branches: { name: string; last_commit_time: string }[];
        };
        if (data.branches) {
          setBranches(data.branches);
        } else {
          throw new Error('No branches found');
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err) || 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [repoPath]);

  function formatCommitTime(isoDate: string): string {
    const then = new Date(isoDate);
    const now = new Date();
    const diffInSeconds = (now.getTime() - then.getTime()) / 1000;
    if (diffInSeconds < 3600) {
      // less than 1 hour, show minutes
      return Math.floor(diffInSeconds / 60) + 'm';
    } else if (diffInSeconds < 86400) {
      // less than 1 day, show hours
      return Math.floor(diffInSeconds / 3600) + 'h';
    } else if (diffInSeconds < 86400 * 30) {
      // less than 30 days, show days
      return Math.floor(diffInSeconds / 86400) + 'd';
    } else {
      // otherwise show months
      return Math.floor(diffInSeconds / (86400 * 30)) + 'mo';
    }
  }

  const filteredBranches = branches
    .filter((branch) => {
      if (customFilter && !customFilter(branch.name)) {
        return false;
      }

      return branch.name.toLowerCase().includes(filterText.toLowerCase());
    })
    .sort((b1, b2) => (customSort ? customSort(b1.name, b2.name) : 0));

  return (
    <div className='flex w-[40vw] min-w-[400px] max-w-[600px] flex-col px-4'>
      <input
        type='text'
        placeholder='Filter branches...'
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className='mb-4 w-full shrink-0 rounded border border-gray-300 p-2'
      />
      {loading && <p>Loading branches...</p>}
      {error && <p className='text-red-500'>Error: {error}</p>}
      <ul className='flex-grow-1 space-y-4 overflow-y-auto pr-4'>
        {filteredBranches.map((branch) => (
          <li key={branch.name}>
            <a
              href='#'
              className='flex flex-row items-center gap-1 text-blue-500'
              onClick={() => onSelect(branch.name)}
            >
              <IoGitBranchOutline className='shrink-0' />
              <span className='flex-1 break-all'>{branch.name}</span>
              <span className='ml-2 shrink-0 text-xs text-gray-500'>
                last commit {formatCommitTime(branch.last_commit_time)} ago
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BranchesList;
