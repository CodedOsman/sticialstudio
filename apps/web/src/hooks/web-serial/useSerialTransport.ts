import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { SerialChunkListener, SerialMessageSink } from './types';

export interface SerialTransportController {
  isConnected: boolean;
  portRef: MutableRefObject<SerialPort | null>;
  readerRef: MutableRefObject<ReadableStreamDefaultReader<string> | null>;
  writerRef: MutableRefObject<WritableStreamDefaultWriter<Uint8Array> | null>;
  textDecoderRef: MutableRefObject<TextDecoderStream | null>;
  baudRateRef: MutableRefObject<number>;
  keepReadingRef: MutableRefObject<boolean>;
  pipeAbortControllerRef: MutableRefObject<AbortController | null>;
  connect: (baudRate: number) => Promise<void>;
  disconnect: () => Promise<void>;
  writeText: (text: string) => Promise<void>;
  writeBytes: (data: Uint8Array) => Promise<void>;
  setChunkListener: (listener: SerialChunkListener) => void;
  pauseDecodedReadPipeline: () => Promise<void>;
  resumeDecodedReadPipeline: () => Promise<void>;
  reopenPort: (baudRate: number) => Promise<void>;
  reconnect: (baudRate?: number) => Promise<void>;
}

interface UseSerialTransportOptions {
  addMessage: SerialMessageSink;
}

export function useSerialTransport({ addMessage }: UseSerialTransportOptions): SerialTransportController {
  const [isConnected, setIsConnected] = useState(false);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const textDecoderRef = useRef<TextDecoderStream | null>(null);
  const baudRateRef = useRef(9600);
  const keepReadingRef = useRef(true);
  const pipeAbortControllerRef = useRef<AbortController | null>(null);
  const pipePromiseRef = useRef<Promise<void> | null>(null);
  const chunkListenerRef = useRef<SerialChunkListener>(null);

  const readLoop = useCallback(async () => {
    let lineBuffer = '';

    while (portRef.current?.readable && keepReadingRef.current && readerRef.current) {
      try {
        const { value, done } = await readerRef.current.read();
        if (done) {
          break;
        }

        if (!value) {
          continue;
        }

        const handled = chunkListenerRef.current?.(value);

        if (!handled) {
          lineBuffer += value;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() ?? '';

          lines.forEach((line) => {
            if (line.trim() !== '' || line === '\r') {
              addMessage('app', line.replace(/\r$/, ''));
            }
          });
        }
      } catch (error) {
        if (keepReadingRef.current) {
          addMessage('error', `Read error: ${(error as Error).message}`);
        }
        break;
      }
    }
  }, [addMessage]);

  const pauseDecodedReadPipeline = useCallback(async () => {
    keepReadingRef.current = false;

    if (readerRef.current) {
      await readerRef.current.cancel().catch(() => undefined);
      readerRef.current = null;
    }

    if (pipeAbortControllerRef.current) {
      pipeAbortControllerRef.current.abort();
      pipeAbortControllerRef.current = null;
    }

    if (pipePromiseRef.current) {
      await pipePromiseRef.current;
      pipePromiseRef.current = null;
    }

    textDecoderRef.current = null;

    if (writerRef.current) {
      try {
        writerRef.current.releaseLock();
      } catch {
        // Ignore stale writer locks while pausing the line reader.
      }
      writerRef.current = null;
    }
  }, []);

  const resumeDecodedReadPipeline = useCallback(async () => {
    const port = portRef.current;
    if (!port?.readable) {
      return;
    }

    keepReadingRef.current = true;

    const textDecoder = new TextDecoderStream();
    const abortController = new AbortController();
    pipeAbortControllerRef.current = abortController;

    pipePromiseRef.current = port.readable.pipeTo(textDecoder.writable, { signal: abortController.signal }).catch(() => undefined);
    readerRef.current = textDecoder.readable.getReader();
    textDecoderRef.current = textDecoder;

    void readLoop();
  }, [readLoop]);

  const reopenPort = useCallback(async (baudRate: number) => {
    const port = portRef.current;
    if (!port) {
      throw new Error('Port not available.');
    }

    await port.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await port.open({ baudRate });
  }, []);

  const connect = useCallback(async (baudRate: number) => {
    if (!('serial' in navigator)) {
      addMessage('error', 'Web Serial API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate });

      portRef.current = port;
      baudRateRef.current = baudRate;
      setIsConnected(true);

      await resumeDecodedReadPipeline();

      const info = port.getInfo();
      addMessage('system', `Connected to device (VID: ${info.usbVendorId}, PID: ${info.usbProductId}) at ${baudRate} baud`);
    } catch (error) {
      const serialError = error as Error;
      if (serialError.name === 'NotFoundError') {
        addMessage('error', 'No port selected.');
      } else {
        addMessage('error', `Connection failed: ${serialError.message}`);
      }
    }
  }, [addMessage, resumeDecodedReadPipeline]);

  const hasLoggedNoAuthRef = useRef(false);

  const reconnect = useCallback(async (baudRate?: number) => {
    if (!('serial' in navigator)) {
      return;
    }

    const rate = baudRate ?? baudRateRef.current;

    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length === 0) {
        if (!hasLoggedNoAuthRef.current) {
          addMessage('error', 'No previously authorized ports found for auto-reconnect.');
          hasLoggedNoAuthRef.current = true;
        }
        return;
      }

      // Automatically pick the first authorized port
      const port = ports[0];
      await port.open({ baudRate: rate });

      portRef.current = port;
      baudRateRef.current = rate;
      setIsConnected(true);
      hasLoggedNoAuthRef.current = false;

      await resumeDecodedReadPipeline();

      const info = port.getInfo();
      addMessage('system', `Auto-reconnected to device (VID: ${info.usbVendorId}, PID: ${info.usbProductId}) at ${rate} baud`);
    } catch (error) {
      const serialError = error as Error;
      addMessage('error', `Auto-reconnect failed: ${serialError.message}`);
    }
  }, [addMessage, resumeDecodedReadPipeline]);

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;

    try {
      await pauseDecodedReadPipeline();

      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }

      setIsConnected(false);
      addMessage('system', 'Disconnected from device.');
    } catch (error) {
      addMessage('error', `Disconnect error: ${(error as Error).message}`);
    }
  }, [addMessage, pauseDecodedReadPipeline]);

  const writeMutex = useRef<Promise<void>>(Promise.resolve());

  const writeBytes = useCallback(async (data: Uint8Array) => {
    if (!portRef.current?.writable) {
      addMessage('error', 'Port not writable or not connected.');
      return;
    }

    const performWrite = async () => {
      try {
        const writer = portRef.current!.writable.getWriter();
        writerRef.current = writer;
        await writer.write(data);
        writer.releaseLock();
        writerRef.current = null;
      } catch (error) {
        addMessage('error', `WriteBytes error: ${(error as Error).message}`);
      }
    };

    writeMutex.current = writeMutex.current.then(performWrite, performWrite);
    await writeMutex.current;
  }, [addMessage]);

  const writeText = useCallback(async (text: string) => {
    const encoder = new TextEncoder();
    await writeBytes(encoder.encode(`${text}\n`));
    addMessage('sent', text);
  }, [addMessage, writeBytes]);

  const setChunkListener = useCallback((listener: SerialChunkListener) => {
    chunkListenerRef.current = listener;
  }, []);

  useEffect(() => {
    const handleDisconnect = () => {
      setIsConnected(false);
      keepReadingRef.current = false;
      portRef.current = null;
      readerRef.current = null;
      writerRef.current = null;
      textDecoderRef.current = null;
      pipeAbortControllerRef.current = null;
      addMessage('error', 'Device disconnected unexpectedly.');
    };

    if ('serial' in navigator) {
      navigator.serial.addEventListener('disconnect', handleDisconnect);
    }

    return () => {
      if ('serial' in navigator) {
        navigator.serial.removeEventListener('disconnect', handleDisconnect);
      }
    };
  }, [addMessage]);

  return {
    isConnected,
    portRef,
    readerRef,
    writerRef,
    textDecoderRef,
    baudRateRef,
    keepReadingRef,
    pipeAbortControllerRef,
    connect,
    reconnect,
    disconnect,
    writeText,
    writeBytes,
    setChunkListener,
    pauseDecodedReadPipeline,
    resumeDecodedReadPipeline,
    reopenPort,
  };
}