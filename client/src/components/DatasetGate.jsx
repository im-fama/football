import React from "react";
import { Loader2, Database, AlertTriangle } from "lucide-react";
import { useSquad } from "../context/SquadContext";
import { startDatasetLoad } from "../services/api";

const PHASE_LABEL = {
  parsing: "Reading the EA FC CSV dumps",
  parsed: "Building leagues, clubs and player records",
  inserting: "Writing records to MongoDB",
  supporting: "Seeding formations, accounts and demo matches",
  ready: "Ready"
};

/**
 * Blocks the app until the API reports a populated dataset. On a cold start the
 * server ingests ~20k players from the CSV dumps, which takes a while — without
 * this the whole UI would just render empty dropdowns and failed requests.
 */
export default function DatasetGate({ children }) {
  const { dataset } = useSquad();
  const [retrying, setRetrying] = React.useState(false);

  if (dataset.ready) return children;

  const unreachable = dataset.state === "unreachable";
  const failed = dataset.state === "error";

  const retry = async () => {
    setRetrying(true);
    try {
      await startDatasetLoad();
    } catch (err) {
      console.error("Could not start the dataset load", err);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg bg-pitch-900/80 border border-pitch-700 rounded-2xl p-8 text-center shadow-2xl">
        {unreachable || failed ? (
          <AlertTriangle className="h-10 w-10 mx-auto text-pulse-amber mb-4" />
        ) : (
          <Database className="h-10 w-10 mx-auto text-brand-400 mb-4" />
        )}

        <h2 className="font-display text-2xl font-bold text-white">
          {unreachable
            ? "API unreachable"
            : failed
            ? "Dataset load failed"
            : "Loading the player dataset"}
        </h2>

        <p className="mt-2 text-sm text-pitch-300">
          {unreachable
            ? dataset.error || "Cannot reach the taqtiq API. Start it with npm run dev:server."
            : failed
            ? dataset.error
            : PHASE_LABEL[dataset.phase] || "Connecting to the API…"}
        </p>

        {dataset.detail && !failed && !unreachable && (
          <p className="mt-1 font-mono text-xs text-pitch-400">{dataset.detail}</p>
        )}

        {!unreachable && !failed && (
          <div className="mt-6 flex items-center justify-center gap-2 text-brand-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            First run only — this can take a minute.
          </div>
        )}

        {(failed || unreachable) && (
          <button
            onClick={retry}
            disabled={retrying}
            className="mt-6 bg-brand-500 text-pitch-950 font-bold px-5 py-2 rounded-lg hover:bg-brand-400 transition-colors disabled:opacity-50"
          >
            {retrying ? "Starting…" : "Retry dataset load"}
          </button>
        )}

        {dataset.counts?.players > 0 && (
          <p className="mt-4 text-xs text-pitch-400">
            {dataset.counts.players.toLocaleString()} players · {dataset.counts.teams.toLocaleString()} clubs ·{" "}
            {dataset.counts.leagues.toLocaleString()} leagues loaded so far
          </p>
        )}
      </div>
    </div>
  );
}
