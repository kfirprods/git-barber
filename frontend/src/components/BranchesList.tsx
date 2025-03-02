import { useEffect, useState } from 'react';

import { IoGitBranchOutline } from 'react-icons/io5';

interface BranchesListProps {
  repoPath: string;
  onSelect: (branchName: string) => void;

  customSort?: (branchName1: string, branchName2: string) => number;
  customFilter?: (branchName: string) => boolean;
}

function BranchesList({ repoPath, onSelect, customFilter, customSort }: BranchesListProps) {
  const [branches, setBranches] = useState<string[]>([]);
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
        const data = (await res.json()) as { branches: string[] };
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

  const filteredBranches = branches
    .filter((branch) => {
      if (customFilter && !customFilter(branch)) {
        return false;
      }

      return branch.toLowerCase().includes(filterText.toLowerCase());
    })
    .sort((b1, b2) => (customSort ? customSort(b1, b2) : b1.localeCompare(b2)));

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
          <li key={branch}>
            <a
              href='#'
              className='flex flex-row items-center gap-1 text-blue-500'
              onClick={() => onSelect(branch)}
            >
              <IoGitBranchOutline className='shrink-0' />
              {branch}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BranchesList;
