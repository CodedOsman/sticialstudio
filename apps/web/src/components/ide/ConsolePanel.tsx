import React, { useState, useRef, useEffect } from 'react';
import { Link as LinkIcon, RotateCcw, SendHorizontal, TerminalSquare, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { SerialMessage, useWebSerial } from '../../hooks/useWebSerial';

interface ConsolePanelProps {
    webSerial: ReturnType<typeof useWebSerial>;
    messages?: SerialMessage[];
    emptyTitle?: string;
    emptyBody?: string;
}

export default function ConsolePanel({
    webSerial,
    messages: filteredMessages,
    emptyTitle = 'Serial Monitor Ready',
    emptyBody = 'Connect a board to start sending and receiving serial data.',
}: ConsolePanelProps) {
    const { isConnected, messages, connect, disconnect, writeText, clearMessages } = webSerial;
    const visibleMessages = filteredMessages ?? messages;
    const [baudRate, setBaudRate] = useState(9600);
    const [inputValue, setInputValue] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visibleMessages]);

    const handleConnectClick = () => {
        if (isConnected) {
            disconnect();
        } else {
            connect(baudRate);
        }
    };

    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const handleSend = () => {
        if (inputValue.trim()) {
            writeText(inputValue);
            setHistory(prev => [inputValue, ...prev].slice(0, 50));
            setHistoryIndex(-1);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length > 0 && historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInputValue(history[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(history[newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInputValue('');
            }
        }
    };

    return (
        <div
            className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-black font-mono text-gray-300"
        >
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-800 px-4 py-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 font-bold uppercase tracking-wider text-gray-300">
                        <TerminalSquare size={14} className="text-emerald-400" />
                        SERIAL MONITOR
                    </span>
                    <Button
                        variant="ghost"
                        icon={isConnected ? <Unlink size={12} /> : <LinkIcon size={12} />}
                        onClick={handleConnectClick}
                        className={`min-h-6 rounded-none px-2 py-1 text-[10px] ${
                            isConnected
                                ? 'text-green-500 hover:bg-gray-900'
                                : 'text-gray-400 hover:bg-gray-900'
                        }`}
                    >
                        {isConnected ? 'CONNECTED' : 'CONNECT'}
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-[10px]">
                        <span className="text-gray-500">BAUD</span>
                        <select
                            value={baudRate}
                            onChange={(e) => setBaudRate(Number(e.target.value))}
                            disabled={isConnected}
                            className="bg-black text-gray-300 outline-none disabled:opacity-50 cursor-pointer"
                        >
                            <option value={9600}>9600</option>
                            <option value={19200}>19200</option>
                            <option value={38400}>38400</option>
                            <option value={57600}>57600</option>
                            <option value={115200}>115200</option>
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={clearMessages}
                        className="inline-flex items-center justify-center text-[10px] text-gray-500 transition-colors hover:text-gray-300"
                        title="Clear output"
                    >
                        <RotateCcw size={12} className="mr-1" />
                        CLEAR
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                {visibleMessages.length === 0 ? (
                    <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-center text-gray-500 text-xs">
                        <TerminalSquare size={24} className="mb-2 text-gray-700" />
                        <p className="font-semibold uppercase tracking-wider text-gray-400">{emptyTitle}</p>
                        <p className="mt-1 max-w-sm text-gray-600">{emptyBody}</p>
                    </div>
                ) : (
                    <div className="space-y-0 text-xs leading-5">
                        {visibleMessages.map((msg, index: number) => {
                            let prefix = '';
                            let colorClass = 'text-gray-300';

                            switch (msg.type) {
                                case 'system':
                                    prefix = '[SYSTEM] ';
                                    colorClass = 'text-sky-300';
                                    break;
                                case 'error':
                                    prefix = '[ERROR] ';
                                    colorClass = 'text-red-400';
                                    break;
                                case 'sent':
                                    prefix = '> ';
                                    colorClass = 'text-green-400';
                                    break;
                            }

                            return (
                                <div key={`${msg.timestamp}-${index}`} className={`whitespace-pre-wrap break-all ${colorClass}`}>
                                    <span className="opacity-70">{prefix}</span>
                                    {msg.text}
                                </div>
                            );
                        })}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 border-t border-gray-800 bg-gray-950 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!isConnected}
                        className="flex-1 rounded border border-gray-800 bg-black px-3 py-1.5 text-gray-200 outline-none placeholder:text-gray-600 focus:border-indigo-500 disabled:opacity-50"
                        placeholder={isConnected ? 'Type message to send to board... (press Enter)' : 'Connect a board to send serial data'}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!isConnected || !inputValue.trim()}
                        className="inline-flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
                    >
                        <SendHorizontal size={13} />
                        <span>Send</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
