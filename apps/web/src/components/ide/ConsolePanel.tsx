import React, { useState, useRef, useEffect } from 'react';
import { Link as LinkIcon, RotateCcw, SendHorizontal, Terminal, Unlink } from 'lucide-react';
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
    emptyTitle = 'No output yet',
    emptyBody = 'Connect a board or run something to see messages here.',
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
                    <span className="inline-flex items-center gap-2 font-bold uppercase tracking-wider text-gray-400">
                        <Terminal size={14} />
                        CMD
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
                            className="bg-black text-gray-300 outline-none disabled:opacity-50"
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
                        title="Clear terminal"
                    >
                        <RotateCcw size={12} className="mr-1" />
                        CLS
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                {visibleMessages.length === 0 ? (
                    <div className="text-gray-600 text-xs">
                        <p>C:\Users\User\Project&gt; {emptyTitle}</p>
                        <p>{emptyBody}</p>
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

            <div className="flex-shrink-0 px-4 py-2 text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">&gt;</span>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!isConnected}
                        className="flex-1 bg-transparent text-gray-200 outline-none placeholder:text-gray-600 disabled:opacity-50"
                        placeholder={isConnected ? '...' : ''}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
}
