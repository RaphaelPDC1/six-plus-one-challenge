import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#070707] p-4 text-white">
      <section className="relative w-full max-w-lg overflow-hidden border border-[#C8A96E]/45 bg-[#101010] p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.75)]">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#C8A96E] to-transparent" aria-hidden="true" />
        <div className="mb-6 flex justify-center">
          <div className="relative grid h-20 w-20 place-items-center border border-[#C0392B]/65 bg-[#190B0A]">
            <div className="absolute inset-3 animate-pulse bg-[#C0392B]/15" />
            <AlertCircle className="relative h-10 w-10 text-[#FFB3A8]" />
          </div>
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A96E]">Route not in play</p>
        <h1 className="mt-3 text-6xl font-black uppercase leading-none tracking-[-0.1em] text-white">404</h1>
        <h2 className="mt-3 text-2xl font-black uppercase leading-none tracking-[-0.06em] text-white">Page off the board.</h2>

        <p className="mx-auto mt-4 max-w-sm text-sm font-bold leading-6 text-[#A7A7A7]">
          That link is outside the challenge. Return to base and keep the work moving.
        </p>

        <div id="not-found-button-group" className="mt-8 flex justify-center">
          <Button
            onClick={handleGoHome}
            className="border border-[#C8A96E] bg-[#C8A96E] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[0_0_28px_rgba(200,169,110,0.22)] transition hover:bg-[#D8BD82]"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to base
          </Button>
        </div>
      </section>
    </div>
  );
}
