"use client";

import * as React from "react";
import { Domain } from "@/types";

interface DomainChipsProps {
  domains: Domain[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// Toggleable pill list for picking any number of domains.
export function DomainChips({ domains, selectedIds, onChange }: DomainChipsProps) {
  if (domains.length === 0) {
    return (
      <p className="text-xs text-amber-600">
        No active domains yet. Add some in the Domains tab first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {domains.map((domain) => {
        const selected = selectedIds.includes(domain.id);
        return (
          <button
            key={domain.id}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              onChange(
                selected
                  ? selectedIds.filter((id) => id !== domain.id)
                  : [...selectedIds, domain.id],
              )
            }
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              selected
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400"
            }`}
          >
            {domain.name}
          </button>
        );
      })}
    </div>
  );
}
