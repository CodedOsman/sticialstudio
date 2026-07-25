"use client";

import type { WorkspaceSvg } from "blockly";

import BlockEditor from "./BlockEditor";

interface BlocklyWorkspaceProps {
  generatorType: string;
  initialXml: string;
  onCodeChange: (code: string) => void;
  onXmlChange: (xml: string) => void;
  onWorkspaceReady?: (workspace: WorkspaceSvg | null) => void;
  selectedCategoryName?: string;
  onSelectCategory?: (category: string) => void;
  sourceCode?: string;
  isCompact?: boolean;
}

export default function BlocklyWorkspace({
  generatorType,
  initialXml,
  onCodeChange,
  onXmlChange,
  onWorkspaceReady,
  selectedCategoryName,
  onSelectCategory,
  sourceCode,
  isCompact = false,
}: BlocklyWorkspaceProps) {
  return (
    <section className="relative flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,#10131f_0%,#090c16_100%)]">
      <BlockEditor
        generatorType={generatorType}
        initialXml={initialXml}
        onCodeChange={onCodeChange}
        onXmlChange={onXmlChange}
        onWorkspaceReady={onWorkspaceReady}
        selectedCategoryName={selectedCategoryName}
        onSelectCategory={onSelectCategory}
        sourceCode={sourceCode}
        isCompactLayout={isCompact}
      />
    </section>
  );
}
