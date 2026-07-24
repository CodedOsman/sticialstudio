import { create } from 'zustand';
import { EMPTY_CODING_CIRCUIT_SNAPSHOT, type CodingCircuitSnapshot } from '@/lib/blockly/circuitAwareness';

interface CircuitStoreState {
  components: any[];
  nets: any[];
  codingSnapshot: CodingCircuitSnapshot;
}

export const useCircuitStore = create<CircuitStoreState>((set) => ({
  components: [],
  nets: [],
  codingSnapshot: EMPTY_CODING_CIRCUIT_SNAPSHOT,
}));
