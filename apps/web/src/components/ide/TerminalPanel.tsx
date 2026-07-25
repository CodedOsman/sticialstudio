"use client";

import ConsolePanel from './ConsolePanel';
import type { useWebSerial } from '../../hooks/useWebSerial';

interface TerminalPanelProps {
  webSerial: ReturnType<typeof useWebSerial>;
  collapsed?: boolean;
  tone?: 'default' | 'arduino-focus';
}

export default function TerminalPanel({ webSerial, tone = 'default' }: TerminalPanelProps) {
  const isArduinoFocus = tone === 'arduino-focus';

  return (
    <section className="h-full w-full overflow-hidden">
      <ConsolePanel webSerial={webSerial} />
    </section>
  );
}
