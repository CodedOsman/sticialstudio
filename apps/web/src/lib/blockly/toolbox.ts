import * as Blockly from 'blockly';
import { isBlockSupportedForBoard } from '@/lib/blockly/blockSupport';
import { BoardKey } from '@/contexts/BoardContext';
import { isOptionalCircuitBlock, type CodingCircuitSnapshot } from '@/lib/blockly/circuitAwareness';
import { defineCustomBlocks } from '@/lib/blockly/blocks';
import { buildToolboxXmlFromRegistry, type RegistryToolboxOptions } from '@/lib/blockly/registry';
import { getGuidedToolboxGroups, type ToolboxLearningLevel } from '@/lib/blockly/guidedToolbox';

export type CircuitAwareWindow = Window & typeof globalThis & {
  __CIRCUIT_DATA?: any;
  __CIRCUIT_CODING_SNAPSHOT?: CodingCircuitSnapshot;
};

export interface ToolboxCategorySummary {
  id: string;
  name: string;
  blockCount: number;
  isDynamic: boolean;
}

export type ToolboxBuildOptions = RegistryToolboxOptions & {
  learningLevel?: ToolboxLearningLevel;
};

export interface GuidedToolboxCategorySummary {
  id: string;
  label: string;
  description: string;
  blockCount: number;
  isDynamic: boolean;
  isEmpty: boolean;
  sourceCategoryNames: string[];
}

export const getToolboxForBoard = (board: BoardKey, circuitData?: any, codingSnapshot?: CodingCircuitSnapshot, options: ToolboxBuildOptions = {}) => {
  defineCustomBlocks();
  const defaultToolbox = buildToolboxXmlFromRegistry(options);
  // Parse and filter the toolbox XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(defaultToolbox, 'text/xml');
  const snapshot =
    codingSnapshot ||
    (typeof window !== 'undefined' ? (window as CircuitAwareWindow).__CIRCUIT_CODING_SNAPSHOT : undefined);
  const blocks = xmlDoc.getElementsByTagName('block');
  const availableOptionalBlocks = new Set(
    (snapshot?.availableBlockTypes || []).filter((blockType) => isOptionalCircuitBlock(blockType))
  );

  // We need to iterate backwards because we'll be removing elements
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const type = block.getAttribute('type');
    if (!type) {
      continue;
    }

    if (!Blockly.Blocks[type] || !isBlockSupportedForBoard(type, board)) {
      block.parentNode?.removeChild(block);
      continue;
    }

    if (isOptionalCircuitBlock(type) && !availableOptionalBlocks.has(type)) {
      block.parentNode?.removeChild(block);
      continue;
    }
  }

  // 3. Inject blocks into "My Components"
  const activeCompCat = xmlDoc.getElementById('ActiveComponents');
  if (activeCompCat) {
    const addedTypes = new Set<string>();
    (snapshot?.components || [])
      .filter((component) => component.isCodeReady)
      .forEach((component) => {
        component.availableBlocks.forEach((blockType: string) => {
          if (addedTypes.has(blockType) || !Blockly.Blocks[blockType] || !isBlockSupportedForBoard(blockType, board)) {
            return;
          }

          const block = xmlDoc.createElement('block');
          block.setAttribute('type', blockType);
          activeCompCat.appendChild(block);
          addedTypes.add(blockType);
        });
      });

    if (activeCompCat.getElementsByTagName('block').length === 0) {
      activeCompCat.parentNode?.removeChild(activeCompCat);
    }
  }

  // Remove empty categories (but keeping dynamic ones that rely on custom attributes)
  const categories = xmlDoc.getElementsByTagName('category');
  for (let i = categories.length - 1; i >= 0; i--) {
    const category = categories[i];
    if (
      !category.hasAttribute('custom') && 
      category.getElementsByTagName('block').length === 0
    ) {
      category.parentNode?.removeChild(category);
    }
  }

  return new XMLSerializer().serializeToString(xmlDoc);
};

export function isLikelyBlocklyXmlDocument(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return false;

  const withoutDeclaration = trimmed.replace(/^<\?xml[\s\S]*?\?>\s*/i, '');
  return /^<xml(\s|>)/i.test(withoutDeclaration);
}

export function normalizeCategoryName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface SensorGroupDefinition {
  key: string;
  aliases: string[];
}

const SENSOR_GROUP_DEFINITIONS: SensorGroupDefinition[] = [
  {
    key: 'motionpresence',
    aliases: ['sensorsmotionpresence', 'motionpresence', 'motionsensors', 'presence']
  },
  {
    key: 'watersoilrain',
    aliases: ['sensorswatersoilrain', 'watersoilrain', 'watersoil', 'rain']
  },
  {
    key: 'environment',
    aliases: ['sensorsenvironment', 'environment']
  },
  {
    key: 'irkeypad',
    aliases: ['sensorsirkeypad', 'irkeypad', 'infraredkeypad']
  },
  {
    key: 'actuators',
    aliases: ['sensorsactuators', 'actuators']
  }
];

function resolveSensorGroupKey(name: string) {
  const normalizedName = normalizeCategoryName(name || '');
  if (!normalizedName) {
    return null;
  }

  const group = SENSOR_GROUP_DEFINITIONS.find((candidate) =>
    candidate.aliases.some((alias) => normalizedName === alias || normalizedName.includes(alias))
  );

  return group ? group.key : null;
}

function buildSensorGroupCategory(categoryNode: Element, sensorGroupKey: string, board: BoardKey) {
  const filteredCategory = categoryNode.cloneNode(false) as Element;

  let activeSensorGroup: string | null = null;
  let hasIncludedBlocks = false;
  let addedGroupLabel = false;

  for (const child of Array.from(categoryNode.children)) {
    const tagName = child.tagName.toLowerCase();

    if (tagName === 'label') {
      activeSensorGroup = resolveSensorGroupKey(child.getAttribute('text') || '');
      if (activeSensorGroup === sensorGroupKey && !addedGroupLabel) {
        filteredCategory.appendChild(child.cloneNode(true));
        addedGroupLabel = true;
      }
      continue;
    }

    if (activeSensorGroup !== sensorGroupKey) {
      continue;
    }

    if (tagName === 'block') {
      const blockType = child.getAttribute('type') || '';
      if (blockType && !isBlockSupportedForBoard(blockType, board)) {
        continue;
      }
      filteredCategory.appendChild(child.cloneNode(true));
      hasIncludedBlocks = true;
      continue;
    }

    if (tagName === 'sep' && hasIncludedBlocks) {
      filteredCategory.appendChild(child.cloneNode(true));
    }
  }

  return filteredCategory;
}

function filterCategoryByBoardSupport(categoryNode: Element, board: BoardKey) {
  const filteredCategory = categoryNode.cloneNode(false) as Element;
  for (const child of Array.from(categoryNode.children)) {
    const tagName = child.tagName.toLowerCase();
    if (tagName === 'block') {
      const blockType = child.getAttribute('type') || '';
      if (!blockType || !isBlockSupportedForBoard(blockType, board) || !Blockly.Blocks[blockType]) {
        continue;
      }
      filteredCategory.appendChild(child.cloneNode(true));
      continue;
    }

    if (tagName === 'label' || tagName === 'sep') {
      filteredCategory.appendChild(child.cloneNode(true));
    }
  }
  return filteredCategory;
}

function matchesCategoryName(itemName: string, requestedName: string) {
  const normalizedItemName = normalizeCategoryName(itemName);

  if (normalizedItemName === requestedName) {
    return true;
  }

  // Sensors catches the full sensors category plus any sensor sub-groups
  if (requestedName === 'sensors' && normalizedItemName.includes('sensors')) {
    return true;
  }

  // Input maps to the 'Input' category
  if (requestedName === 'input' && normalizedItemName === 'input') {
    return true;
  }

  // Communication maps to the 'Communication' category
  if ((requestedName === 'communication' || requestedName === 'comm') && normalizedItemName === 'communication') {
    return true;
  }

  if ((requestedName.includes('actuators') || requestedName.includes('motors')) && normalizedItemName.includes('actuators')) {
    return true;
  }

  if (resolveSensorGroupKey(requestedName) && normalizedItemName.includes('sensors')) {
    return true;
  }

  return normalizedItemName.startsWith(requestedName) || requestedName.startsWith(normalizedItemName);
}

const EMPTY_TOOLBOX_XML = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';

export interface ToolboxWithItems extends Blockly.IToolbox {
  getToolboxItems: () => Blockly.IToolboxItem[];
}

export function hasToolboxItemsApi(toolbox: Blockly.IToolbox): toolbox is ToolboxWithItems {
  return typeof (toolbox as ToolboxWithItems).getToolboxItems === 'function';
}

export function buildCategoryToolboxXml(board: BoardKey, requestedName: string, circuitData?: any, codingSnapshot?: CodingCircuitSnapshot, options: ToolboxBuildOptions = {}) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return EMPTY_TOOLBOX_XML;
  }

  if (!requestedName) {
    return EMPTY_TOOLBOX_XML;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(getToolboxForBoard(board, circuitData, codingSnapshot, options), 'text/xml');
  const categoryNodes = Array.from(doc.getElementsByTagName('category'));
  if (categoryNodes.length === 0) {
    return EMPTY_TOOLBOX_XML;
  }

  const normalizedRequested = normalizeCategoryName(requestedName || '');
  const selectedCategory =
    categoryNodes.find((categoryNode) => {
      const categoryName = categoryNode.getAttribute('name') || '';
      return matchesCategoryName(categoryName, normalizedRequested);
    }) || categoryNodes[0];

  const sensorGroupKey = resolveSensorGroupKey(requestedName || '');
  const selectedCategoryName = selectedCategory.getAttribute('name') || '';

  let categoryToProcess = selectedCategory;
  if (sensorGroupKey && normalizeCategoryName(selectedCategoryName).includes('sensors')) {
    categoryToProcess = buildSensorGroupCategory(selectedCategory, sensorGroupKey, board);
  }

  const filteredCategory = filterCategoryByBoardSupport(categoryToProcess, board);
  const serializer = new XMLSerializer();

  // Special case for dynamic categories: they must stay as <category> nodes.
  if (['VARIABLE', 'PROCEDURE'].includes(filteredCategory.getAttribute('custom') || '')) {
    const serialized = serializer.serializeToString(filteredCategory);
    return `<xml xmlns="https://developers.google.com/blockly/xml">${serialized}</xml>`;
  }
  
  // For others, return a flat list of blocks (Simple Toolbox mode)
  let innerXml = '';
  for (const child of Array.from(filteredCategory.children)) {
    innerXml += serializer.serializeToString(child);
  }

  return `<xml xmlns="https://developers.google.com/blockly/xml">${innerXml}</xml>`;
}

export function hideNativeToolboxUi(workspace: Blockly.WorkspaceSvg) {
  const parentSvg = workspace.getParentSvg();
  const container = parentSvg?.parentElement;
  if (!container) return;

  workspace.getToolbox()?.setVisible(false);

  const hideElement = (element: HTMLElement | null) => {
    if (!element) return;

    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('width', '0px', 'important');
    element.style.setProperty('min-width', '0px', 'important');
    element.style.setProperty('max-width', '0px', 'important');
    element.style.setProperty('padding', '0px', 'important');
    element.style.setProperty('margin', '0px', 'important');
    element.style.setProperty('border', 'none', 'important');
    element.style.setProperty('overflow', 'hidden', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('opacity', '0', 'important');
    element.style.setProperty('pointer-events', 'none', 'important');
    element.style.setProperty('position', 'absolute', 'important');
    element.style.setProperty('z-index', '-9999', 'important');
    element.style.setProperty('transform', 'scale(0)', 'important');
  };

  const styleId = 'blockly-toolbox-hide-style';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .custom-blockly-host .blocklyToolboxDiv,
      .custom-blockly-host div.blocklyToolboxDiv,
      .custom-blockly-host .blocklyToolboxDiv.blocklyNonSelectable,
      .custom-blockly-host .blocklyToolboxContents,
      .custom-blockly-host .blocklyTreeRoot,
      .custom-blockly-host .blocklyTreeRow,
      .custom-blockly-host .blocklyTreeLabel,
      .custom-blockly-host .blocklyTreeIcon {
        display: none !important;
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        visibility: hidden !important;
        opacity: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
      }
    `;
    container.appendChild(style);
  }

  hideElement(container.querySelector<HTMLElement>('.blocklyToolboxDiv'));
  hideElement(container.querySelector<HTMLElement>('.blocklyToolboxContents'));
  Array.from(
    container.querySelectorAll<HTMLElement>('.blocklyTreeRoot, .blocklyTreeRow, .blocklyTreeLabel, .blocklyTreeIcon')
  ).forEach((element) => hideElement(element));

  const host = container as HTMLElement & { __toolboxHideObserver?: MutationObserver };
  if (!host.__toolboxHideObserver) {
    const observer = new MutationObserver(() => {
      workspace.getToolbox()?.setVisible(false);
      hideElement(container.querySelector<HTMLElement>('.blocklyToolboxDiv'));
      hideElement(container.querySelector<HTMLElement>('.blocklyToolboxContents'));
      Array.from(
        container.querySelectorAll<HTMLElement>('.blocklyTreeRoot, .blocklyTreeRow, .blocklyTreeLabel, .blocklyTreeIcon')
      ).forEach((element) => hideElement(element));
    });

    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['style', 'class'],
    });

    host.__toolboxHideObserver = observer;
  }
}








export function getVisibleToolboxCategories(board: BoardKey, circuitData?: any, codingSnapshot?: CodingCircuitSnapshot, options: ToolboxBuildOptions = {}) {
  if (typeof DOMParser === 'undefined') {
    return [] as ToolboxCategorySummary[];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(getToolboxForBoard(board, circuitData, codingSnapshot, options), 'text/xml');
  return Array.from(doc.getElementsByTagName('category'))
    .map((categoryNode) => ({
      id: categoryNode.getAttribute('name') || categoryNode.getAttribute('id') || '',
      name: categoryNode.getAttribute('name') || categoryNode.getAttribute('id') || '',
      blockCount: categoryNode.getElementsByTagName('block').length,
      isDynamic: categoryNode.hasAttribute('custom'),
    }))
    .filter((category) => category.blockCount > 0 || category.isDynamic);
}

function getCategoryNodeByName(categoryNodes: Element[], categoryName: string) {
  const requested = normalizeCategoryName(categoryName);
  return categoryNodes.find((categoryNode) =>
    normalizeCategoryName(categoryNode.getAttribute('name') || '') === requested
  );
}

function isCustomCategory(categoryNode: Element) {
  return ['VARIABLE', 'PROCEDURE'].includes(categoryNode.getAttribute('custom') || '');
}

function buildMergedCategoryXml(categoryNodes: Element[]) {
  if (categoryNodes.length === 0) {
    return EMPTY_TOOLBOX_XML;
  }

  const serializer = new XMLSerializer();
  if (categoryNodes.length === 1 && isCustomCategory(categoryNodes[0])) {
    return `<xml xmlns="https://developers.google.com/blockly/xml">${serializer.serializeToString(categoryNodes[0])}</xml>`;
  }

  let innerXml = '';
  categoryNodes.forEach((categoryNode, index) => {
    if (index > 0) {
      innerXml += '<sep gap="18"></sep>';
    }
    for (const child of Array.from(categoryNode.children)) {
      innerXml += serializer.serializeToString(child);
    }
  });

  return `<xml xmlns="https://developers.google.com/blockly/xml">${innerXml}</xml>`;
}

export function buildGuidedCategoryToolboxXml(
  board: BoardKey,
  requestedId: string,
  circuitData?: any,
  codingSnapshot?: CodingCircuitSnapshot,
  options: ToolboxBuildOptions = {},
) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return EMPTY_TOOLBOX_XML;
  }

  const learningLevel = options.learningLevel || 'starter';
  const guidedGroup = getGuidedToolboxGroups(learningLevel).find((group) => group.id === requestedId);
  if (!guidedGroup) {
    return buildCategoryToolboxXml(board, requestedId, circuitData, codingSnapshot, options);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(getToolboxForBoard(board, circuitData, codingSnapshot, options), 'text/xml');
  const categoryNodes = Array.from(doc.getElementsByTagName('category'));
  const selectedNodes = guidedGroup.categoryNames
    .map((categoryName) => getCategoryNodeByName(categoryNodes, categoryName))
    .filter((categoryNode): categoryNode is Element => Boolean(categoryNode))
    .map((categoryNode) => filterCategoryByBoardSupport(categoryNode, board))
    .filter((categoryNode) => categoryNode.getElementsByTagName('block').length > 0 || isCustomCategory(categoryNode));

  return buildMergedCategoryXml(selectedNodes);
}

export function getGuidedToolboxCategories(
  board: BoardKey,
  circuitData?: any,
  codingSnapshot?: CodingCircuitSnapshot,
  options: ToolboxBuildOptions = {},
) {
  if (typeof DOMParser === 'undefined') {
    return [] as GuidedToolboxCategorySummary[];
  }

  const learningLevel = options.learningLevel || 'starter';
  const parser = new DOMParser();
  const doc = parser.parseFromString(getToolboxForBoard(board, circuitData, codingSnapshot, options), 'text/xml');
  const categoryNodes = Array.from(doc.getElementsByTagName('category'));

  return getGuidedToolboxGroups(learningLevel)
    .map((group) => {
      const sourceNodes = group.categoryNames
        .map((categoryName) => getCategoryNodeByName(categoryNodes, categoryName))
        .filter((categoryNode): categoryNode is Element => Boolean(categoryNode));
      const blockCount = sourceNodes.reduce((total, categoryNode) => total + categoryNode.getElementsByTagName('block').length, 0);

      return {
        id: group.id,
        label: group.label,
        description: group.description,
        blockCount,
        isDynamic: sourceNodes.some((categoryNode) => categoryNode.hasAttribute('custom')),
        isEmpty: blockCount === 0,
        sourceCategoryNames: group.categoryNames,
        keepWhenEmpty: Boolean(group.keepWhenEmpty),
      };
    })
    .filter((group) => !group.isEmpty || group.keepWhenEmpty)
    .map(({ keepWhenEmpty: _keepWhenEmpty, ...group }) => group);
}







