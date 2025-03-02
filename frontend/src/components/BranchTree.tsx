import { IoClose } from 'react-icons/io5';
import { LuGitMerge } from 'react-icons/lu';

import Button from './button';
import { Input } from './ui/input';

interface Props {
  value: string[];
  onChange: (newStructure: string[]) => void;
}

function getPlaceholder(depth: number, base: string) {
  if (depth === 1) {
    return `e.g. ${base}-backend`;
  } else if (depth === 2) {
    return `e.g. ${base}-frontend`;
  }
}

export default function BranchTree({ value, onChange }: Props) {
  const addNewItem = () => {
    onChange([...value, '']);
  };

  return (
    <div className='flex min-w-[500px] flex-col gap-2'>
      {value.map((branchName, depth) => (
        <div
          key={depth}
          style={{
            transform: `translateX(${depth * 12}px)`
          }}
          className='flex flex-row items-center gap-1'
        >
          <LuGitMerge />

          <Input
            disabled={depth === 0}
            autoFocus={depth === 1}
            className='max-w-[80%]'
            placeholder={getPlaceholder(depth, value[0])}
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

      <Button text='Add' onClick={addNewItem} />
    </div>
  );
}
