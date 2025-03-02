import { IoClose, IoGitBranchOutline } from 'react-icons/io5';
import { LuGitMerge } from 'react-icons/lu';

import { Button } from './ui/button';
import { Input } from './ui/input';

interface Props {
  value: string[];
  onChange: (newStructure: string[]) => void;
  placeholders?: string[];
}

export default function BranchTree({ value, onChange, placeholders }: Props) {
  const addNewItem = () => {
    onChange([...value, '']);
  };

  return (
    <div className='flex min-w-[500px] flex-col gap-2'>
      {value.map((branchName, depth) => (
        <div
          key={depth}
          style={{
            // TODO: fade and smoothly translate each item
            transform: `translateX(${depth * 12}px)`
          }}
          className='flex flex-row items-center gap-1 transition-transform'
        >
          <LuGitMerge />

          <Input
            disabled={depth === 0}
            autoFocus={depth === 1}
            className='max-w-[80%]'
            placeholder={
              (placeholders &&
                depth > 0 &&
                depth <= placeholders.length &&
                placeholders[depth - 1]) ||
              undefined
            }
            value={branchName}
            onChange={(e) => {
              onChange(value.map((v, i) => (i === depth ? e.target.value : v)));
            }}
          />

          {depth > 2 && depth === value.length - 1 && (
            <IoClose
              className='size-6'
              onClick={() => onChange(value.slice(0, value.length - 1))}
            />
          )}
        </div>
      ))}

      <Button className='font-bold' onClick={addNewItem} variant='ghost'>
        <div className='flex flex-row items-center font-bold'>
          +
          <LuGitMerge />
        </div>{' '}
        Add sub-branch
      </Button>
    </div>
  );
}
