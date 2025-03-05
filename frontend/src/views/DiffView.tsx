import { useEffect, useState } from 'react';

import CodeViewer from 'react-syntax-highlighter';
import { githubGist } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import DiffViewTopBar from '@/components/DiffViewTopBar';
import { Button } from '@/components/ui/button';
import { getDetailedDiff, GitDiffData } from '@/services/local-git-api.service';

interface DiffLine {
  text: string;
  line_type: string;
}

export default function DiffView({
  repoPath,
  baseBranch,
  mergedBranch
}: {
  repoPath: string;
  baseBranch: string;
  mergedBranch: string;
}) {
  const [diffData, setDiffData] = useState<GitDiffData | null>(null);
  const [fileDiffs, setFileDiffs] = useState<
    Array<{
      file: string;
      status: string;
      hunks: Array<{ code: string; lineTypes: string[] }>;
    }>
  >([]);

  useEffect(() => {
    getDetailedDiff(repoPath, baseBranch, mergedBranch).then((diff) => {
      setDiffData(diff);
    });
  }, [repoPath, baseBranch, mergedBranch]);

  useEffect(() => {
    if (diffData && diffData.changed_files) {
      const files = diffData.changed_files.map((file) => {
        let hunks: { code: string; lineTypes: string[] }[] = [];
        if (file.changed_hunks) {
          file.changed_hunks.forEach((hunk) => {
            let lines: DiffLine[] = [];
            // Add hunk header line
            lines.push({ text: hunk.hunk_header, line_type: 'header' });
            // Add each line from the hunk with appropriate prefix
            if (hunk.lines) {
              hunk.lines.forEach((line) => {
                const prefix =
                  line.line_type === 'added' ? '+' : line.line_type === 'deleted' ? '-' : ' ';
                lines.push({ text: prefix + line.text, line_type: line.line_type });
              });
            }
            const code = lines.map((l) => l.text).join('\n');
            const lineTypes = lines.map((l) => l.line_type);
            hunks.push({ code, lineTypes });
          });
        }
        return { file: file.file, status: file.status, hunks };
      });
      setFileDiffs(files);
    }
  }, [diffData]);

  if (!diffData) {
    return <div>Loading diff...</div>;
  }

  return (
    <div className='flex w-full flex-col overflow-y-auto'>
      <DiffViewTopBar
        numberOfFiles={diffData.changed_files.length}
        linesAdded={diffData.lines_added}
        linesRemoved={diffData.lines_deleted}
      />

      {fileDiffs.map((fileDiff, index) => (
        <div key={index} className='mb-[30px] rounded-md border border-gray-300'>
          <div className='flex border-b border-b-gray-300 bg-zinc-100/50 p-3'>
            <h3 style={{ fontFamily: 'monospace' }}>
              {fileDiff.file} ({fileDiff.status})
            </h3>
          </div>
          {fileDiff.hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex} className='relative mb-2'>
              <Button className='absolute right-2 top-2 rounded bg-slate-600 p-2 text-xs font-semibold hover:bg-slate-700'>
                Stage Hunk
              </Button>
              <CodeViewer
                language='javascript'
                style={githubGist}
                className='!p-0'
                wrapLines
                showLineNumbers
                lineNumberStyle={{ display: 'none' }}
                lineProps={(lineNumber: number) => {
                  const lineType = hunk.lineTypes[lineNumber - 1];
                  let background = 'transparent';
                  let className = '';
                  if (lineType === 'added') {
                    background = '#DAFBE1';
                  } else if (lineType === 'deleted') {
                    background = '#FFEBE9';
                  } else if (lineType === 'header') {
                    background = '#eaeaea';
                    className = 'header-code-line';
                  }
                  return {
                    className,
                    style: { background, cursor: 'default', padding: '2px 10px' }
                  };
                }}
              >
                {hunk.code}
              </CodeViewer>
              {hunkIndex < fileDiff.hunks.length - 1 && (
                <div className='my-2 h-[2px] bg-gray-300'></div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
