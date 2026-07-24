export interface CodingCircuitSnapshot {
  components: any[];
  componentMappings: Record<string, any>;
  connectedComponentIds: string[];
  mappedComponentIds: string[];
  usedBoardPins: string[];
  usedSignalPins: string[];
  availableBlockTypes: string[];
}

export const EMPTY_CODING_CIRCUIT_SNAPSHOT: CodingCircuitSnapshot = {
  components: [],
  componentMappings: {},
  connectedComponentIds: [],
  mappedComponentIds: [],
  usedBoardPins: [],
  usedSignalPins: [],
  availableBlockTypes: [],
};

export function isOptionalCircuitBlock(blockType: string) {
  return false;
}

export function getMappedHardwareInstances(
  snapshot: CodingCircuitSnapshot,
  componentType: string
): [string, string][] {
  return [[`${componentType} 1`, `${componentType}1`], [`${componentType} 2`, `${componentType}2`]];
}





