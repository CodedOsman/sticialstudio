import { useMemo } from 'react';
import { useArduinoFlash } from './web-serial/useArduinoFlash';
import { useMicroPythonProtocol } from './web-serial/useMicroPythonProtocol';
import { useSerialMessages } from './web-serial/useSerialMessages';
import { useSerialTransport } from './web-serial/useSerialTransport';

export type { SerialMessage } from './web-serial/types';

export function useWebSerial() {
  const { messages, addMessage, clearMessages } = useSerialMessages();
  const transport = useSerialTransport({ addMessage });
  const { executeMicroPythonRaw, runMicroPythonCommand } = useMicroPythonProtocol({
    isConnected: transport.isConnected,
    addMessage,
    transport,
  });
  const { isFlashing, flashArduino } = useArduinoFlash({
    addMessage,
    transport,
  });

  return useMemo(() => ({
    isConnected: transport.isConnected,
    isFlashing,
    messages,
    connect: transport.connect,
    reconnect: transport.reconnect,
    disconnect: transport.disconnect,
    writeText: transport.writeText,
    writeBytes: transport.writeBytes,
    executeMicroPythonRaw,
    runMicroPythonCommand,
    flashArduino,
    clearMessages,
    addMessage,
  }), [
    addMessage,
    clearMessages,
    executeMicroPythonRaw,
    flashArduino,
    isFlashing,
    messages,
    runMicroPythonCommand,
    transport.connect,
    transport.reconnect,
    transport.disconnect,
    transport.isConnected,
    transport.writeBytes,
    transport.writeText,
  ]);
}

export type WebSerialController = ReturnType<typeof useWebSerial>;