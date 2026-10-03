"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Copy, FileText, Lightbulb, Printer, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type FormState = { assignment: string; subject: string; prompt: string; uses: string[]; aiContribution: string; studentContribution: string; answers: string[]; generatedAt: string };
type ModelContextTool = { name: string; title?: string; description: string; inputSchema: Record<string, unknown>; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute: (input: unknown) => unknown | Promise<unknown> };
declare global { interface Document { modelContext?: { registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => void | Promise<void> } } }

const EMPTY_FORM: FormState = { assignment: "", subject: "", prompt: "", uses: [], aiContribution: "", studentContribution: "", answers: [""], generatedAt: "" };
const DEMO_FORM: FormState = {
  assignment: "Should schools limit student phone use?",
  subject: "English / Civics",
  prompt: "Write a 700-word argument about whether U.S. high schools should restrict smartphones during the school day. Use evidence and address one counterargument.",
  uses: ["Brainstorming", "Explaining", "Editing"],
  aiContribution: "AI suggested possible arguments, explained the difference between a claim and a counterclaim, and flagged two unclear sentences.",
  studentContribution: "I chose the position, found the school-policy examples, rejected an AI claim that had no source, rewrote the introduction, and made the final argument more balanced.",
  answers: ["I rejected the idea of a total ban because it ignored emergencies and accessibility needs. I chose a limited-use policy instead, after comparing both sides myself."],
  generatedAt: "",
};
const USE_OPTIONS = ["Brainstorming", "Explaining", "Outlining", "Research check", "Editing", "Coding"];
const STEPS = [
  { label: "Assignment", note: "Set the context" },
  { label: "AI use", note: "Be specific" },
  { label: "Knowledge check", note: "Show understanding" },
  { label: "Receipt", note: "Share the evidence" },
];

export default function Home() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [copied, setCopied] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("clearuse-draft");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormState>;
        // This is a one-time hydration from the browser's draft store.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({ ...EMPTY_FORM, ...parsed, answers: [parsed.answers?.[0] ?? ""] });
      }
    } catch {
      /* storage is optional */
    } finally {
      setRestored(true);
    }
  }, []);
  useEffect(() => { if (restored) localStorage.setItem("clearuse-draft", JSON.stringify(form)); }, [form, restored]);

  useEffect(() => {
    const loadDemo = () => { setForm(DEMO_FORM); setStep(0); };
    const buildReceipt = (event: Event) => {
      const detail = (event as CustomEvent<Partial<FormState>>).detail ?? {};
      setForm((current) => ({ ...current, ...detail, answers: [detail.answers?.[0] ?? current.answers[0] ?? ""], generatedAt: new Date().toISOString() }));
      setStep(3);
    };
    window.addEventListener("clearuse:load-demo", loadDemo);
    window.addEventListener("clearuse:build-receipt", buildReceipt);
    return () => { window.removeEventListener("clearuse:load-demo", loadDemo); window.removeEventListener("clearuse:build-receipt", buildReceipt); };
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: ModelContextTool[] = [
      {
        name: "load_clearuse_demo", title: "Load ClearUse demo", description: "Load a complete sample assignment into the visible ClearUse workflow.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async () => { window.dispatchEvent(new Event("clearuse:load-demo")); return { status: "loaded", assignment: DEMO_FORM.assignment }; },
      },
      {
        name: "create_ai_use_receipt", title: "Create AI Use Receipt", description: "Complete the visible ClearUse workflow with assignment and reflection data, then open the receipt.",
        inputSchema: {
          type: "object",
          properties: { assignment: { type: "string" }, subject: { type: "string" }, prompt: { type: "string" }, uses: { type: "array", items: { type: "string" } }, aiContribution: { type: "string" }, studentContribution: { type: "string" }, answers: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 1 } },
          required: ["assignment", "subject", "prompt", "uses", "aiContribution", "studentContribution", "answers"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: async (input) => {
          if (!input || typeof input !== "object") throw new Error("Receipt data must be an object.");
          const data = input as Partial<FormState>;
          if (!data.assignment || !data.prompt || !data.studentContribution || !Array.isArray(data.answers) || data.answers.length !== 1) throw new Error("Complete the assignment, contribution, and reflection answer.");
          window.dispatchEvent(new CustomEvent("clearuse:build-receipt", { detail: data }));
          return { status: "created", assignment: data.assignment };
        },
      },
    ];
    for (const tool of tools) { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* optional capability */ } }
    return () => lifecycle.abort();
  }, []);

  const questions = useMemo(
    () => ["What was the most important decision you made while working on this assignment, and why?"],
    [],
  );

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(form.assignment.trim() && form.subject.trim() && form.prompt.trim());
    if (step === 1) return Boolean(form.uses.length && form.aiContribution.trim() && form.studentContribution.trim());
    if (step === 2) return form.answers.every((answer) => answer.trim().length > 12);
    return true;
  }, [form, step]);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const next = () => { if (!canContinue) return; if (step === 2) update("generatedAt", new Date().toISOString()); setStep((current) => Math.min(3, current + 1)); };
  const loadDemo = () => { setForm(DEMO_FORM); setStep(0); };
  const reset = () => { setForm(EMPTY_FORM); setStep(0); localStorage.removeItem("clearuse-draft"); };
  const receiptText = `CLEARUSE — AI USE RECEIPT\n${form.assignment}\nSubject: ${form.subject}\nAI used for: ${form.uses.join(", ")}\n\nAI contributed:\n${form.aiContribution}\n\nStudent contributed:\n${form.studentContribution}\n\nUnderstanding check:\n${questions.map((question, index) => `${index + 1}. ${question}\n${form.answers[index]}`).join("\n\n")}\n\nThis receipt documents process and reflection. It is not proof of authorship.`;
  const copyReceipt = async () => { await navigator.clipboard.writeText(receiptText); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };

  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#10251f]">
      <div className="noise min-h-screen">
        <header className="no-print border-b border-[#17382f]/10 bg-[#f4f1e9]/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-[13px] bg-[#12372d] text-[#d8ff69] shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"><ClipboardCheck className="size-5" /></div>
              <div><p className="text-[17px] font-black tracking-[-0.04em]">ClearUse</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#557169]">Use AI. Show your thinking.</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={loadDemo} className="hidden rounded-full text-[#35564d] sm:inline-flex"><Sparkles /> Load demo</Button>
              <Button variant="outline" onClick={reset} className="rounded-full border-[#17382f]/15 bg-white/45"><RefreshCw /> <span className="hidden sm:inline">Start over</span></Button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1380px] gap-5 px-4 py-5 sm:px-8 sm:py-8 lg:grid-cols-[286px_minmax(0,1fr)]">
          <aside className="no-print overflow-hidden rounded-[24px] bg-[#12372d] p-5 text-white shadow-[0_24px_70px_rgba(19,55,45,.16)] lg:min-h-[720px] lg:p-6">
            <div className="mb-6 rounded-[18px] border border-white/10 bg-white/[.06] p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-white/55"><span>Your progress</span><span>{step + 1}/4</span></div>
              <Progress value={(step + 1) * 25} className="h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#d8ff69]" />
            </div>
            <nav aria-label="Receipt steps" className="grid grid-cols-4 gap-1 lg:block lg:space-y-2">
              {STEPS.map((item, index) => {
                const active = index === step; const done = index < step;
                return (
                  <button key={item.label} type="button" onClick={() => index <= step && setStep(index)} disabled={index > step} className={`group flex w-full flex-col items-center gap-2 rounded-[16px] px-2 py-3 text-left transition lg:flex-row lg:gap-3 lg:px-3 ${active ? "bg-[#d8ff69] text-[#10251f]" : "text-white/70 hover:bg-white/[.06] disabled:cursor-default disabled:hover:bg-transparent"}`}>
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs font-black ${active ? "border-[#10251f]/15 bg-[#10251f] text-[#d8ff69]" : done ? "border-[#d8ff69]/40 bg-[#d8ff69]/15 text-[#d8ff69]" : "border-white/15"}`}>{done ? <Check className="size-4" /> : index + 1}</span>
                    <span className="hidden lg:block"><span className="block text-sm font-bold">{item.label}</span><span className={`text-xs ${active ? "text-[#36534b]" : "text-white/40"}`}>{item.note}</span></span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-8 hidden border-t border-white/10 pt-6 lg:block"><ShieldCheck className="mb-3 size-6 text-[#d8ff69]" /><p className="text-sm font-bold">Built for trust, not surveillance.</p><p className="mt-2 text-xs leading-5 text-white/50">ClearUse never claims to detect cheating. It helps students make their process visible.</p></div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-[24px] border border-[#17382f]/10 bg-[#fbfaf5] shadow-[0_24px_70px_rgba(19,55,45,.08)]">
            {step < 3 && (
              <div className="no-print border-b border-[#17382f]/10 px-5 py-7 sm:px-9 sm:py-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div><p className="mb-2 text-[11px] font-black uppercase tracking-[0.17em] text-[#6a7f77]">Step {step + 1} · {STEPS[step].label}</p><h1 className="max-w-3xl text-3xl font-black tracking-[-0.045em] text-[#10251f] sm:text-4xl">{step === 0 && "What are you working on?"}{step === 1 && "Draw the line between AI and you."}{step === 2 && "Show what you understand."}</h1></div>
                  <Badge className="w-fit border-[#98b02c]/30 bg-[#eafaad] px-3 py-1 text-[#334600]"><span className="mr-1 size-1.5 rounded-full bg-[#617700]" /> Draft autosaved</Badge>
                </div>
              </div>
            )}

            <div className={step === 3 ? "p-0" : "no-print p-5 sm:p-9"}>
              {step === 0 && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div className="grid gap-5 sm:grid-cols-[1.6fr_1fr]">
                    <Field label="Assignment title" hint="Keep it recognizable"><Input value={form.assignment} onChange={(event) => update("assignment", event.target.value)} placeholder="e.g. Phone policy argument" className="h-12 rounded-xl border-[#17382f]/15 bg-white px-4 focus-visible:border-[#4b6a61] focus-visible:ring-[#4b6a61]/15" /></Field>
                    <Field label="Class / subject" hint="Any subject works"><Input value={form.subject} onChange={(event) => update("subject", event.target.value)} placeholder="e.g. English 10" className="h-12 rounded-xl border-[#17382f]/15 bg-white px-4 focus-visible:border-[#4b6a61] focus-visible:ring-[#4b6a61]/15" /></Field>
                  </div>
                  <Field label="Assignment prompt" hint="Paste the instructions your teacher gave you"><Textarea value={form.prompt} onChange={(event) => update("prompt", event.target.value)} placeholder="What are you being asked to create, explain, solve, or argue?" className="min-h-44 resize-none rounded-2xl border-[#17382f]/15 bg-white p-4 leading-6 focus-visible:border-[#4b6a61] focus-visible:ring-[#4b6a61]/15" /></Field>
                  <Tip>ClearUse uses this context to ask one relevant reflection question—not to judge your final answer.</Tip>
                </div>
              )}
              {step === 1 && (
                <div className="mx-auto max-w-3xl space-y-7">
                  <Field label="I used AI for..." hint="Choose every role it actually played"><div className="flex flex-wrap gap-2.5">
                    {USE_OPTIONS.map((option) => { const selected = form.uses.includes(option); return <button key={option} type="button" aria-pressed={selected} onClick={() => update("uses", selected ? form.uses.filter((item) => item !== option) : [...form.uses, option])} className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition ${selected ? "border-[#12372d] bg-[#12372d] text-white" : "border-[#17382f]/15 bg-white text-[#36534b] hover:border-[#17382f]/35"}`}>{selected && <Check className="size-3.5 text-[#d8ff69]" />}{option}</button>; })}
                  </div></Field>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Field label="What did AI contribute?" hint="Ideas, explanations, feedback—be concrete"><Textarea value={form.aiContribution} onChange={(event) => update("aiContribution", event.target.value)} placeholder="AI suggested... / explained... / helped me notice..." className="min-h-48 resize-none rounded-2xl border-[#17382f]/15 bg-white p-4 leading-6 focus-visible:border-[#4b6a61] focus-visible:ring-[#4b6a61]/15" /></Field>
                    <Field label="What did you contribute?" hint="Your judgment, research, choices, and revisions"><Textarea value={form.studentContribution} onChange={(event) => update("studentContribution", event.target.value)} placeholder="I decided... / checked... / rejected... / changed..." className="min-h-48 resize-none rounded-2xl border-[#8ba12b]/35 bg-[#f8fbdc] p-4 leading-6 focus-visible:border-[#718520] focus-visible:ring-[#718520]/15" /></Field>
                  </div>
                  <Tip>Your strongest evidence is a decision only you could explain.</Tip>
                </div>
              )}
              {step === 2 && (
                <div className="mx-auto max-w-3xl space-y-5">
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#8ba12b]/25 bg-[#f5f9d7] p-4"><Sparkles className="mt-0.5 size-5 shrink-0 text-[#65791c]" /><p className="text-sm leading-6 text-[#43554f]">One question, generated from your assignment. A short, honest answer is better than a polished one.</p></div>
                  {questions.map((question, index) => (
                    <div key={question} className="rounded-[20px] border border-[#17382f]/12 bg-white p-5 sm:p-6">
                      <div className="mb-4 flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#12372d] text-xs font-black text-[#d8ff69]">{index + 1}</span><p className="font-bold leading-6 text-[#17382f]">{question}</p></div>
                      <Textarea value={form.answers[index]} onChange={(event) => { const answers = [...form.answers]; answers[index] = event.target.value; update("answers", answers); }} placeholder="Answer in your own words..." className="min-h-24 resize-none rounded-xl border-[#17382f]/12 bg-[#faf9f4] p-4 leading-6 focus-visible:border-[#4b6a61] focus-visible:ring-[#4b6a61]/15" />
                    </div>
                  ))}
                </div>
              )}
              {step === 3 && <Receipt form={form} questions={questions} copied={copied} onCopy={copyReceipt} />}
            </div>
            {step < 3 && (
              <footer className="no-print flex items-center justify-between border-t border-[#17382f]/10 bg-white/40 px-5 py-4 sm:px-9">
                <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="rounded-full px-5 text-[#48635b]"><ArrowLeft /> Back</Button>
                <div className="flex items-center gap-3">{!canContinue && <span className="hidden text-xs text-[#7b8b86] sm:inline">Complete this step to continue</span>}<Button onClick={next} disabled={!canContinue} className="h-11 rounded-full bg-[#12372d] px-6 text-white hover:bg-[#1d4b3f]">{step === 2 ? "Create receipt" : "Continue"}{step === 2 ? <FileText /> : <ArrowRight />}</Button></div>
              </footer>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex flex-wrap items-baseline justify-between gap-1"><span className="text-sm font-black text-[#17382f]">{label}</span><span className="text-xs text-[#7a8b85]">{hint}</span></span>{children}</label>;
}
function Tip({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-[#17382f]/10 bg-[#edf1eb] p-4 text-sm leading-6 text-[#48635b]"><Lightbulb className="mt-0.5 size-5 shrink-0 text-[#6e821c]" /><p>{children}</p></div>;
}

function Receipt({ form, questions, copied, onCopy }: { form: FormState; questions: string[]; copied: boolean; onCopy: () => void }) {
  const date = form.generatedAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(form.generatedAt)) : "Draft receipt";
  return (
    <div className="receipt-wrap bg-[#12372d] p-4 sm:p-8 lg:p-10">
      <div className="no-print mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="text-white"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#d8ff69]">Receipt ready</p><h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">Your thinking is visible.</h1></div><div className="flex gap-2"><Button variant="outline" onClick={onCopy} className="rounded-full border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white">{copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}</Button><Button onClick={() => window.print()} className="rounded-full bg-[#d8ff69] text-[#10251f] hover:bg-[#e5ff96]"><Printer /> Print / PDF</Button></div></div>
      <article className="receipt mx-auto max-w-3xl overflow-hidden bg-[#fffefa] text-[#142b24] shadow-[0_30px_80px_rgba(0,0,0,.2)]">
        <div className="border-b-2 border-dashed border-[#17382f]/18 px-6 py-7 sm:px-10 sm:py-9">
          <div className="flex items-start justify-between gap-6"><div><div className="mb-5 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-[10px] bg-[#12372d] text-[#d8ff69]"><ClipboardCheck className="size-4" /></span><span className="font-black tracking-[-0.035em]">ClearUse</span></div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#698078]">AI Use Receipt</p><h2 className="mt-2 max-w-xl text-2xl font-black tracking-[-0.04em] sm:text-3xl">{form.assignment}</h2><p className="mt-2 text-sm text-[#587068]">{form.subject}</p></div><CheckCircle2 className="size-9 shrink-0 text-[#6f8615]" /></div>
          <div className="mt-6 flex flex-wrap gap-2">{form.uses.map((use) => <Badge key={use} variant="outline" className="border-[#17382f]/15 bg-[#edf2e7] px-3 py-1 text-[#315147]">{use}</Badge>)}</div>
        </div>
        <div className="grid border-b-2 border-dashed border-[#17382f]/18 md:grid-cols-2"><ReceiptBlock eyebrow="AI contributed" text={form.aiContribution} /><ReceiptBlock eyebrow="Student contributed" text={form.studentContribution} accent /></div>
        <div className="border-b-2 border-dashed border-[#17382f]/18 px-6 py-7 sm:px-10 sm:py-9">
          <div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#698078]">Understanding check</p><h3 className="mt-1 text-lg font-black">In the student&apos;s own words</h3></div><span className="font-mono text-xs text-[#6e817a]">1 / 1 answered</span></div>
          <div className="space-y-6">{questions.map((question, index) => <div key={question} className="grid gap-2 sm:grid-cols-[28px_1fr]"><span className="grid size-7 place-items-center rounded-full bg-[#eafaad] text-xs font-black text-[#405500]">{index + 1}</span><div><p className="text-sm font-bold leading-5">{question}</p><p className="mt-2 text-sm leading-6 text-[#49645b]">{form.answers[index]}</p></div></div>)}</div>
        </div>
        <footer className="flex flex-col justify-between gap-4 bg-[#f0f1e8] px-6 py-5 text-xs text-[#647770] sm:flex-row sm:items-end sm:px-10"><p className="max-w-lg leading-5">This receipt documents process and reflection. It is not proof of authorship and should not be used as an AI detector.</p><p className="shrink-0 font-mono">Created {date}</p></footer>
      </article>
    </div>
  );
}

function ReceiptBlock({ eyebrow, text, accent = false }: { eyebrow: string; text: string; accent?: boolean }) {
  return <div className={`px-6 py-7 sm:px-10 sm:py-9 ${accent ? "bg-[#f5f9d7]" : "border-b border-[#17382f]/10 md:border-b-0 md:border-r"}`}><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#698078]">{eyebrow}</p><p className="mt-3 text-sm leading-6 text-[#3f5b52]">{text}</p></div>;
}
