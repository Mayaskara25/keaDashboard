"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const SKILLS = [
  { value: "CONCEPT_RECALL", label: "Concept Recall" },
  { value: "MECHANISM_UNDERSTANDING", label: "Mechanism Understanding" },
  { value: "PRODUCT_PREDICTION", label: "Product Prediction" },
  { value: "FORMULA_APPLICATION", label: "Formula Application" },
  { value: "NUMERICAL_SOLVING", label: "Numerical Solving" },
  { value: "MULTI_STEP_REASONING", label: "Multi-step Reasoning" },
  { value: "GRAPH_INTERPRETATION", label: "Graph Interpretation" },
  { value: "ISOMER_CLASSIFICATION", label: "Isomer Classification" },
  { value: "EXPERIMENTAL_ANALYSIS", label: "Experimental Analysis" },
];

const COUNTS = [5, 10, 15, 20, 30, 40].map((n) => ({ value: String(n), label: String(n) }));
const DIFFICULTIES = [
  { value: "1-2", label: "Easy (1–2)" },
  { value: "2-3", label: "Medium (2–3)" },
  { value: "3-5", label: "Hard (3–5)" },
  { value: "1-5", label: "All" },
];

export default function CustomTestPage() {
  const router = useRouter();
  const [chapters, setChapters] = useState<{ value: string; label: string }[]>([]);
  const [topics, setTopics] = useState<{ value: string; label: string; conceptId: string }[]>([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedConceptId, setSelectedConceptId] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("1-5");
  const [count, setCount] = useState("20");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/concepts?groupBy=chapter")
      .then((r) => r.json())
      .then((data) => setChapters(data.chapters ?? []));
  }, []);

  useEffect(() => {
    if (!selectedChapter) return;
    fetch(`/api/concepts?chapter=${encodeURIComponent(selectedChapter)}`)
      .then((r) => r.json())
      .then((data) =>
        setTopics(
          (data.concepts ?? []).map((c: { conceptId: string; topic: string }) => ({
            value: c.conceptId,
            label: c.topic,
            conceptId: c.conceptId,
          }))
        )
      );
  }, [selectedChapter]);

  async function handleStart() {
    if (!selectedConceptId) { setError("Select a topic."); return; }
    setError(""); setLoading(true);

    const [dMin, dMax] = selectedDifficulty.split("-").map(Number);
    const res = await fetch("/api/tests/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conceptIds: [selectedConceptId],
        skills: selectedSkill ? [selectedSkill] : undefined,
        difficultyMin: dMin,
        difficultyMax: dMax,
        count: parseInt(count),
        type: "CUSTOM",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Failed to generate test."); return; }

    const sessionRes = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: data.testId }),
    });
    const sessionData = await sessionRes.json();
    router.push(`/test/${sessionData.sessionId}/attempt`);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[var(--text)]">Custom Test</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          Choose a topic and build your test.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-5">
          <Select
            label="Chapter"
            options={chapters}
            placeholder="Select chapter"
            value={selectedChapter}
            onChange={(e) => { setSelectedChapter(e.target.value); setSelectedConceptId(""); }}
          />
          <Select
            label="Topic"
            options={topics}
            placeholder="Select topic"
            value={selectedConceptId}
            onChange={(e) => setSelectedConceptId(e.target.value)}
            disabled={!selectedChapter}
          />
          <Select
            label="Skill (optional)"
            options={SKILLS}
            placeholder="All skills"
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Difficulty"
              options={DIFFICULTIES}
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            />
            <Select
              label="Questions"
              options={COUNTS}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-[13px] text-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 rounded-[6px]">
              {error}
            </p>
          )}

          <Button onClick={handleStart} loading={loading} className="w-full">
            Start Test
          </Button>
        </div>
      </Card>
    </div>
  );
}
