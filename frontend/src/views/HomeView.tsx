import { useState } from 'react';

import BranchesList from '@/components/BranchesList';
import BranchTree from '@/components/BranchTree';
import RepositorySelector from '@/components/RepositorySelector';

const preferBaseSort = (b1: string, b2: string) => {
  if (b1.toLowerCase().includes('base')) {
    return -1;
  }
  if (['dev', 'develop', 'development'].includes(b1.toLowerCase())) {
    return -1;
  }
  if (b2.toLowerCase().includes('base')) {
    return 1;
  }
  if (['dev', 'develop', 'development'].includes(b2.toLowerCase())) {
    return 1;
  }

  return b1.localeCompare(b2);
};

export default function HomeView() {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [messyBranch, setMessyBranch] = useState<string | null>(null);
  const [baseBranch, setBaseBranch] = useState<string | null>(null);
  const [newBranchesStructure, setNewBranchesStructure] = useState<string[]>([]);

  let stepTitle = 'Which repo shall we work with today?';
  let stepContent = <RepositorySelector onSelect={setRepoPath} />;

  if (repoPath) {
    stepTitle = `Choose a messy a branch to split up ✂️`;
    stepContent = <BranchesList repoPath={repoPath} onSelect={setMessyBranch} />;
  }

  if (repoPath && messyBranch) {
    // TODO: tooltip on "base branch" to explain what it is
    stepTitle = `Choose a base branch to build upon 🗼`;
    stepContent = (
      <BranchesList
        repoPath={repoPath}
        onSelect={(selectedBaseBranch) => {
          setBaseBranch(selectedBaseBranch);
          setNewBranchesStructure([selectedBaseBranch, '', '']);
        }}
        customSort={preferBaseSort}
        customFilter={(branchName) => branchName !== messyBranch}
      />
    );
  }

  if (baseBranch && messyBranch) {
    // TODO: based on the diff size, recommend # of branches to split to
    stepTitle = `Let's set up the new tree 🌲`;
    stepContent = <BranchTree value={newBranchesStructure} onChange={setNewBranchesStructure} />;
  }

  return (
    <div className='flex h-full w-full flex-col items-center'>
      <header className='self-stretch bg-white p-4 text-center shadow'>
        <h1 className='text-2xl font-bold text-gray-800'>{stepTitle}</h1>
      </header>
      <main className='flex flex-1 overflow-y-hidden p-4'>
        <div className='flex'>{stepContent}</div>
      </main>
    </div>
  );
}
