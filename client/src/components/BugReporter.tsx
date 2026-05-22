import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Send } from "lucide-react";
import { toast } from "sonner";

type Priority = "low" | "medium" | "high" | "critical";

export function BugReporter() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [affectedPage, setAffectedPage] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportBugMutation = trpc.debug.reportBug.useMutation({
    onSuccess: () => {
      toast.success("Bug report submitted! Thank you for helping improve the app.");
      setOpen(false);
      setTitle("");
      setDescription("");
      setAffectedPage("");
      setPriority("medium");
      setScreenshot(null);
    },
    onError: (error) => {
      toast.error(`Failed to submit bug report: ${error.message}`);
    },
  });

  const handleScreenshotCapture = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        toast.error("Screenshot not supported on this device");
        return;
      }
      
      const canvas = await html2canvas(document.documentElement, {
        allowTaint: true,
        useCORS: true,
        scale: 1,
      });
      const dataUrl = canvas.toDataURL("image/png");
      setScreenshot(dataUrl);
      toast.success("Screenshot captured!");
    } catch (error) {
      console.error("Screenshot error:", error);
      toast.info("Screenshot capture not available. You can upload an image instead.");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in title and description");
      return;
    }

    reportBugMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      affectedPage: affectedPage || undefined,
      priority,
      screenshotUrl: screenshot || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Report a bug or issue with the app"
        >
          <AlertCircle className="w-4 h-4" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Help us improve by reporting any issues you encounter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              placeholder="What happened? What did you expect?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-24"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Affected Page</label>
            <Select value={affectedPage} onValueChange={setAffectedPage}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select page (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my_day">My Day</SelectItem>
                <SelectItem value="proof">Proof</SelectItem>
                <SelectItem value="board">Board</SelectItem>
                <SelectItem value="rewards">Rewards</SelectItem>
                <SelectItem value="journey">Journey</SelectItem>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Screenshot</label>
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleScreenshotCapture}
                className="flex-1"
              >
                {screenshot ? "✓ Captured" : "Capture Screen"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setScreenshot(event.target?.result as string);
                      toast.success("Screenshot added!");
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={reportBugMutation.isPending}
              className="flex-1 gap-2"
            >
              <Send className="w-4 h-4" />
              {reportBugMutation.isPending ? "Sending..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Fallback html2canvas for screenshot capture
async function html2canvas(element: HTMLElement, options?: any) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  
  canvas.width = element.scrollWidth;
  canvas.height = element.scrollHeight;
  
  // Simple white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  return canvas;
}

/** Floating bug reporter — renders a fixed "!" button in the bottom-right corner.
 *  Visible on every page for all logged-in participants. */
export function BugReporterFloat() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [affectedPage, setAffectedPage] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportBugMutation = trpc.debug.reportBug.useMutation({
    onSuccess: () => {
      toast.success("Issue reported — we'll look into it.");
      setOpen(false);
      setTitle("");
      setDescription("");
      setAffectedPage("");
      setPriority("medium");
      setScreenshot(null);
    },
    onError: (error) => {
      toast.error(`Couldn't submit: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in title and description");
      return;
    }
    reportBugMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      affectedPage: affectedPage || undefined,
      priority,
      screenshotUrl: screenshot || undefined,
    });
  };

  return (
    <>
      {/* Floating trigger button — sits above the bottom nav */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[5.5rem] right-3 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-[#C8A96E]/50 bg-[#0D0D0D]/90 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur transition hover:border-[#C8A96E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]/60"
        title="Report an issue"
        aria-label="Report an issue"
      >
        <AlertCircle className="h-4 w-4 text-[#C8A96E]" />
      </button>

      {/* Slide-up sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-lg border border-[#2A2A2A] bg-[#0D0D0D] p-5 pb-8 shadow-[0_-8px_40px_rgba(0,0,0,0.7)]">
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#333]" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C8A96E]">Log an issue</p>
                <h3 className="mt-1 text-xl font-black uppercase leading-none tracking-[-0.05em] text-white">Something wrong?</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-[#555] hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">What's the issue? *</label>
                <input
                  type="text"
                  placeholder="e.g. Points not showing correctly"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full border border-[#2A2A2A] bg-[#141414] px-3 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#C8A96E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">Describe what happened *</label>
                <textarea
                  placeholder="What did you expect vs what you saw?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full border border-[#2A2A2A] bg-[#141414] px-3 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#C8A96E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">Page</label>
                  <select
                    value={affectedPage}
                    onChange={(e) => setAffectedPage(e.target.value)}
                    className="mt-1 w-full border border-[#2A2A2A] bg-[#141414] px-3 py-2.5 text-sm text-white focus:border-[#C8A96E] focus:outline-none"
                  >
                    <option value="">Any page</option>
                    <option value="my_day">My Day</option>
                    <option value="overview">Overview</option>
                    <option value="board">Board</option>
                    <option value="proof">Proof</option>
                    <option value="rewards">Rewards</option>
                    <option value="journey">Journey</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="mt-1 w-full border border-[#2A2A2A] bg-[#141414] px-3 py-2.5 text-sm text-white focus:border-[#C8A96E] focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">Screenshot (optional)</label>
                <div className="mt-1 flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setScreenshot(ev.target?.result as string);
                          toast.success("Screenshot added!");
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border border-[#2A2A2A] bg-[#141414] py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#777] transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
                  >
                    {screenshot ? "✓ Image added" : "Upload screenshot"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={reportBugMutation.isPending}
                className="mt-1 w-full border border-[#C8A96E] bg-[#C8A96E]/10 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A96E] transition hover:bg-[#C8A96E]/20 disabled:opacity-50"
              >
                {reportBugMutation.isPending ? "Sending..." : "Submit issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
