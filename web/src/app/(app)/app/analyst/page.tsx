"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import { PageHeader } from "@/components/domain/page-header";
import { ErrorState } from "@/components/domain/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api/client";
import type { AnalystAnswer, Fact } from "@/lib/api/types";
import { fmtEur, fmtNum } from "@/lib/format";

const SUGGESTED = [
  "Which club supplies the most national teams?",
  "Who are the most undervalued midfielders?",
  "Which nation has the highest supplier concentration?",
  "How is the valuation model evaluated?",
];

const VERSION_LABELS = new Set(["model_version", "feature_version", "scored_at", "graph_version"]);

/** Facts arrive as strings from SQL; show them as a reader would expect. */
function showFact(f: Fact): string {
  const n = Number(f.value);
  if (!Number.isFinite(n) || f.value.trim() === "") return f.value;
  if (/eur|value/i.test(f.label)) return fmtEur(n);
  if (/hhi|share|concentration/i.test(f.label) && n <= 1) return n.toFixed(2);
  return Number.isInteger(n) ? fmtNum(n) : n.toFixed(2);
}

/** Retrieved doc text is Markdown; strip the syntax for a readable excerpt. */
function cleanExcerpt(answer: string): string | null {
  const i = answer.indexOf("Context:");
  if (i < 0) return null;
  return answer
    .slice(i + "Context:".length)
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function AnswerCard({ a }: { a: AnalystAnswer }) {
  const facts = a.facts.filter((f) => !VERSION_LABELS.has(f.label));
  const versions = a.facts.filter((f) => VERSION_LABELS.has(f.label));
  const excerpt = cleanExcerpt(a.answer);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{a.question}</CardTitle>
        {a.grounded ? (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-pitch">
            <CheckCircle size={16} weight="fill" aria-hidden="true" /> Every number traced to SQL
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-caution">
            <Warning size={16} weight="fill" aria-hidden="true" /> Contains numbers it couldn&rsquo;t verify
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {facts.length ? (
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {facts.map((f, j) => (
              <div key={`${f.label}-${j}`} className="border-t border-ink pt-2">
                <dt className="text-[13px] text-ink-2">{f.label.replace(/\s*\(EUR\)/, "")}</dt>
                <dd className="score text-2xl">{showFact(f)}</dd>
                <dd className="text-[12px] text-ink-3">from {f.source}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[15px] leading-relaxed">{a.answer}</p>
        )}
        {excerpt ? (
          <blockquote className="border-l-2 border-rule-strong pl-4 text-[14px] leading-relaxed text-ink-2">
            {excerpt.length > 320 ? `${excerpt.slice(0, 320)}…` : excerpt}
          </blockquote>
        ) : null}
        {a.citations.length ? (
          <div>
            <h3 className="mb-1 text-[13px] font-semibold text-ink-2">Sources in the project docs</h3>
            <ul className="flex flex-col gap-1 text-[13px]">
              {a.citations.map((c, j) => (
                <li key={`${c.source_path}-${j}`}>
                  <span className="font-medium">{c.source_path}</span>
                  <span className="text-ink-3"> · {c.section.split(" > ").pop()}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <details className="text-[13px] text-ink-3">
          <summary className="cursor-pointer py-1">Raw answer and versions from the API</summary>
          <p className="mt-2 whitespace-pre-wrap break-words">{a.answer}</p>
          <p className="mt-2">
            Route: {a.route}
            {versions.map((v) => `, ${v.label} ${v.value}`).join("")}
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

export default function AnalystPage() {
  const [question, setQuestion] = useState("");
  const [last, setLast] = useState("");
  const [history, setHistory] = useState<AnalystAnswer[]>([]);

  const ask = useMutation({
    mutationFn: (q: string) => apiPost<AnalystAnswer>("/v1/analyst/ask", { question: q }),
    onSuccess: (result) => {
      setHistory((h) => [result.data, ...h]);
      setQuestion("");
    },
  });

  function submit(q: string) {
    const clean = q.trim();
    if (!clean || ask.isPending) return;
    setLast(clean);
    ask.mutate(clean);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ask the analyst"
        description="Ask about players, valuations, clubs or the model. Numbers in the answer come from SQL run against the warehouse, and each one says which table it came from. If a number can't be traced, the answer says so."
      />

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
      >
        <label htmlFor="q" className="sr-only">
          Your question
        </label>
        <Input
          id="q"
          name="question"
          autoComplete="off"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="For example: which club supplies the most national teams?"
          maxLength={500}
        />
        <Button type="submit" disabled={ask.isPending || !question.trim()}>
          {ask.isPending ? "Working…" : "Ask"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2" aria-label="Example questions">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            disabled={ask.isPending}
            className="min-h-10 cursor-pointer rounded-[3px] border border-rule-strong px-3 text-left text-[14px] text-ink-2 hover:border-ink hover:text-ink disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="flex flex-col gap-5">
        {ask.isPending ? (
          <p className="text-[15px] text-ink-2">
            Answering &ldquo;{last}&rdquo;. If the API has been asleep, the first answer can take up to a minute.
          </p>
        ) : null}
        {ask.isError ? <ErrorState error={ask.error} onRetry={() => submit(last)} /> : null}
        {history.map((a, i) => (
          <AnswerCard key={`${a.question}-${history.length - i}`} a={a} />
        ))}
      </div>
    </div>
  );
}
