import { motion } from 'motion/react';
import { IoClose } from 'react-icons/io5';
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
        <motion.div
          key={depth}
          initial={{ opacity: 0, x: depth * -12 }}
          animate={{ opacity: 1, x: depth * 12 }}
          // todo: no delay when adding, only delay on 1st render
          transition={{ duration: 0.3, ease: 'easeOut', delay: depth <= 2 ? depth * 0.2 : 0 }}
          className='flex flex-row items-center gap-1'
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
        </motion.div>
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
