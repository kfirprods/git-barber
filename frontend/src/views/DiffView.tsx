import { useEffect, useState } from 'react';

import CodeViewer from 'react-syntax-highlighter';
import { a11yLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import DiffViewTopBar from '@/components/DiffViewTopBar';
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
      code: string;
      lineTypes: string[];
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
        let lines: DiffLine[] = [];
        if (file.changed_hunks) {
          file.changed_hunks.forEach((hunk) => {
            // Add hunk header line
            lines.push({ text: hunk.hunk_header, line_type: 'header' });
            // Add each line from the hunk, prefixing with '+' for added, '-' for deleted, ' ' for context
            if (hunk.lines) {
              hunk.lines.forEach((line) => {
                const prefix =
                  line.line_type === 'added' ? '+' : line.line_type === 'deleted' ? '-' : ' ';
                lines.push({ text: prefix + line.text, line_type: line.line_type });
              });
            }
          });
        }
        const code = lines.map((l) => l.text).join('\n');
        const lineTypes = lines.map((l) => l.line_type);
        return { file: file.file, status: file.status, code, lineTypes };
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
        <div key={index} className='mb-[30px] rounded-md border border-gray-300 bg-zinc-100/50'>
          <div className='flex border-b border-b-gray-300 p-3'>
            <h3 style={{ fontFamily: 'monospace' }}>
              {fileDiff.file} ({fileDiff.status})
            </h3>
          </div>
          <CodeViewer
            language='javascript'
            style={a11yLight}
            className='!p-0'
            showLineNumbers
            wrapLines
            lineProps={(lineNumber: number) => {
              const lineType = fileDiff.lineTypes[lineNumber - 1];
              let background = 'transparent';
              let className = '';
              if (lineType === 'added') {
                background = 'lightgreen';
              } else if (lineType === 'deleted') {
                background = '#ffcccc';
              } else if (lineType === 'header') {
                background = '#eaeaea';
                className = 'header-code-line';
              }
              return { className, style: { background, cursor: 'default', padding: '2px 10px' } };
            }}
          >
            {fileDiff.code}
          </CodeViewer>
        </div>
      ))}
    </div>
  );
}
