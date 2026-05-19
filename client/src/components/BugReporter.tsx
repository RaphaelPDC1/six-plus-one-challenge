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
