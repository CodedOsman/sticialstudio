"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Blocks, BookOpen, CircuitBoard, Code2, LogIn } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/Button";
import { staggerContainer, staggerItem } from "@/components/ui/motion";
const platformPanels = [

  {
    id: "block-coding",
    title: "Block Coding",
    description: "Choose a board and start directly in Blockly without opening Circuit Lab.",
    image: "/home/block-coding-preview.png",
    icon: <Blocks size={18} />,
    accent: "text-violet-300 border-violet-300/20 bg-violet-400/10",
  },
  {
    id: "text-coding",
    title: "Text Coding",
    description: "Choose a board and open the editor. Arduino uses C++; ESP and Pico use MicroPython.",
    image: "/home/text-coding-preview.png",
    icon: <Code2 size={18} />,
    accent: "text-sky-300 border-sky-300/20 bg-sky-400/10",
  },
] as const;

export default function WelcomePage() {
  const { setProjectId } = useProject();

  const panelHref: Record<(typeof platformPanels)[number]["id"], string> = {
    "block-coding": "/projects/select-board?entry=block-home&environment=physical",
    "text-coding": "/projects/select-board?entry=text-home&environment=physical",
  };

  return (
    <MainLayout>
      <OnboardingShell
        headerActions={
          <Link href="/dashboard"><Button variant="inverse">Open Workspace</Button></Link>
        }
        contentClassName="pb-20 pt-8 lg:pt-12"
      >
        <motion.div
          className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-16"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.section variants={staggerItem} className="flex flex-col items-center gap-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/16 bg-sky-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">
              <span className="h-2 w-2 rounded-full bg-sky-300/85" />
              Virtual simulator and real hardware
            </div>

            <h1 className="max-w-[14ch] bg-[linear-gradient(135deg,#68b0ff_0%,#7d6cff_38%,#b176ff_64%,#ff8ca1_100%)] bg-clip-text text-[3.2rem] font-bold leading-[1.02] tracking-[-0.06em] text-transparent sm:text-[4.4rem] lg:text-[5.5rem]">
              Build circuits. Learn faster. Upload for real.
            </h1>

            <p className="max-w-[40rem] text-base leading-8 text-white/60 sm:text-lg">
              Start from the workspace you need right now: Circuit Lab, Blockly, text coding, or a guided lesson path.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/courses"><Button className="min-w-[190px] bg-[linear-gradient(135deg,#66a7ff,#7b61ff)] text-white hover:opacity-90" icon={<BookOpen size={18} />}>Study a Course</Button></Link>
            </div>
          </motion.section>

          <motion.section className="grid gap-5 lg:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
            {platformPanels.map((panel) => (
              <motion.div
                key={panel.id}
                variants={staggerItem}
                className="group"
              >
                <Link
                  href={panelHref[panel.id]}
                  onClick={() => setProjectId(null)}
                  className="block overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/18 hover:shadow-[0_28px_72px_-40px_rgba(0,0,0,0.88)]"
                >
                <div className="aspect-[16/9] overflow-hidden border-b border-white/8 bg-[#0a0c18]">
                  <img src={panel.image} alt={panel.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>

                <div className="flex items-center gap-3 px-6 py-5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border ${panel.accent}`}>
                    {panel.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.03em] text-white">{panel.title}</h3>
                    <p className="text-sm text-white/50">{panel.description}</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/60" />
                </div>
                              </Link>
              </motion.div>
            ))}
          </motion.section>
        </motion.div>
      </OnboardingShell>
    </MainLayout>
  );
}


