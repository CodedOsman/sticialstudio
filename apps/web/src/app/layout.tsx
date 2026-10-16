import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';
import { BoardProvider } from '@/contexts/BoardContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { StudioPreferencesProvider } from '@/contexts/StudioPreferencesContext';
import { UpdateNotifier } from '@/components/layout/UpdateNotifier';

const editorMono = localFont({
  src: './fonts/GeistMonoLatin.woff2',
  variable: '--font-editor-mono',
  display: 'swap',
  fallback: ['Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
});

export const metadata: Metadata = {
  title: 'STEMAIDE IDE',
  description: 'Educational block and text coding platform for hardware projects',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${editorMono.variable} antialiased`}>
        <ThemeProvider>
          <StudioPreferencesProvider>
            <BoardProvider>
              <ProjectProvider>
                {children}
                <UpdateNotifier />
              </ProjectProvider>

            </BoardProvider>
          </StudioPreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
