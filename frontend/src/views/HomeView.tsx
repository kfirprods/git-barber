import { ReactNode, useState } from 'react';

import { TooltipArrow, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip';

import BranchesList from '@/components/BranchesList';
import BranchTree from '@/components/BranchTree';
import RepositorySelector from '@/components/RepositorySelector';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';

import DiffView from './DiffView';

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
  const [currentSubBranchIndex, setCurrentSubBranchIndex] = useState(0);

  let stepTitle: ReactNode = 'Which repo shall we work with today?';
  let stepContent = <RepositorySelector onSelect={setRepoPath} />;

  if (repoPath) {
    stepTitle = `Choose a messy branch to split up ✂️`;

    // TODO: sort branches by size or at least by recent commit date; make "current branch" appear on top
    stepContent = <BranchesList key='messy-branch' repoPath={repoPath} onSelect={setMessyBranch} />;
  }

  if (repoPath && messyBranch) {
    stepTitle = (
      <span className='font-bold'>
        Choose a&nbsp;
        <TooltipProvider>
          <Tooltip delayDuration={500}>
            <TooltipTrigger
              className='border-b'
              style={{
                borderBottomStyle: 'dashed'
              }}
            >
              base branch
            </TooltipTrigger>
            <TooltipContent className='text-xs'>
              <TooltipArrow />
              this is the branch you'll merge your changes to once they're ready
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        &nbsp;to build upon 🗼
      </span>
    );
    stepContent = (
      <BranchesList
        key='base-branch'
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
    stepContent = (
      <div>
        <p className='my-3'>So instead of just "{messyBranch}", you'll end up with:</p>
        <BranchTree
          value={newBranchesStructure}
          onChange={setNewBranchesStructure}
          placeholders={[`e.g. ${messyBranch}-backend`, `e.g. ${messyBranch}-frontend`]}
        />

        <Button
          variant='outline'
          className='my-4 w-full font-bold'
          disabled={newBranchesStructure.filter((b) => b).length < 3}
          onClick={() => {
            setCurrentSubBranchIndex(1);
          }}
        >
          Next Step: Split up the changes
        </Button>
      </div>
    );
  }

  if (repoPath && baseBranch && messyBranch && currentSubBranchIndex > 0) {
    stepTitle = `Choose what goes into ${newBranchesStructure[currentSubBranchIndex]}`;
    stepContent = (
      <DiffView repoPath={repoPath} baseBranch={baseBranch} mergedBranch={messyBranch} />
    );
  }

  // TODO: use carousel to switch betweep steps + progress bar
  return (
    <div className='flex h-full w-full flex-col'>
      <header className='self-stretch p-4 text-center shadow'>
        <h1 className='text-2xl font-bold'>{stepTitle}</h1>
      </header>
      <main className='flex w-full flex-1 justify-center overflow-y-hidden p-4'>
        <div className='flex w-full justify-center'>{stepContent}</div>
      </main>
    </div>
  );
}
