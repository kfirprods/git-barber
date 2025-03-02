export default function DiffViewTopBar({
  numberOfFiles,
  linesAdded,
  linesRemoved
}: {
  numberOfFiles: number;
  linesAdded: number;
  linesRemoved: number;
}) {
  return (
    <div className='flex w-full items-center justify-between py-3'>
      <div className='flex items-center gap-2 font-semibold'>
        <span>{numberOfFiles} files changed</span>
      </div>

      <div className='flex items-center gap-2 font-semibold'>
        <span className='text-green-500'>+{linesAdded}</span>
        <span className='text-red-500'>-{linesRemoved}</span>
      </div>
    </div>
  );
}
