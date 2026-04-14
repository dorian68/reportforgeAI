import React, { useEffect, useState } from "react";

import { GeneratedTextFile } from "../shared/types";
import { CollapsiblePanel } from "./CollapsiblePanel";

interface FileTabsProps {
  files: GeneratedTextFile[];
}

export function FileTabs({ files }: FileTabsProps) {
  const [activeFile, setActiveFile] = useState(files[0]?.filename ?? "");

  useEffect(() => {
    if (files.length === 0) {
      setActiveFile("");
      return;
    }

    if (!files.some((file) => file.filename === activeFile)) {
      setActiveFile(files[0].filename);
    }
  }, [activeFile, files]);

  const currentFile = files.find((file) => file.filename === activeFile) ?? files[0];

  if (!currentFile) {
    return <p className="rf-muted">No files generated yet.</p>;
  }

  return (
    <div className="rf-file-tabs">
      <div className="rf-file-tabs__list">
        {files.map((file) => (
          <button
            key={file.filename}
            type="button"
            className={file.filename === currentFile.filename ? "is-active" : ""}
            onClick={() => setActiveFile(file.filename)}
          >
            {file.filename}
          </button>
        ))}
      </div>
      <CollapsiblePanel
        title={currentFile.filename}
        summary={`${currentFile.language.toUpperCase()} source`}
      >
        <pre className="rf-code-block">
          <code>{currentFile.content}</code>
        </pre>
      </CollapsiblePanel>
    </div>
  );
}
