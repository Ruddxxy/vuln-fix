"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileEdit, X, MessageSquare, Radar, LoaderCircle } from "lucide-react";
import { Button } from "@/components/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ClaimVerificationStatus, { VerificationStatus } from "./ClaimVerificationStatus";
import { verifyClaimsWithGemini, getVerificationSummary, ClaimVerification } from "@/utils/claim-verification";
import { useSettingStore } from "@/store/setting";
import { useTaskStore } from "@/store/task";

export interface Claim {
  id: string;
  text: string;
  status: VerificationStatus;
  details?: string;
}

interface ClaimsVerificationPanelProps {
  claims: Claim[];
  setClaims: (claims: Claim[]) => void;
}

function ClaimsVerificationPanel({ claims, setClaims }: ClaimsVerificationPanelProps) {
  const taskStore = useTaskStore();
  const [claimText, setClaimText] = useState('');
  const [claimStatus, setClaimStatus] = useState<VerificationStatus>('unverified');
  const [claimDetails, setClaimDetails] = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAutoVerifying, setIsAutoVerifying] = useState(false);

  const resetClaimForm = () => {
    setClaimText('');
    setClaimStatus('unverified');
    setClaimDetails('');
  };

  const handleAddClaim = () => {
    if (!claimText.trim()) return;

    const newClaim: Claim = {
      id: Date.now().toString(),
      text: claimText,
      status: claimStatus,
      details: claimDetails
    };

    setClaims([...claims, newClaim]);
    resetClaimForm();
    setIsDialogOpen(false);
  };

  const handleUpdateClaim = () => {
    if (!selectedClaimId || !claimText.trim()) return;

    setClaims(claims.map(claim =>
      claim.id === selectedClaimId
        ? { ...claim, text: claimText, status: claimStatus, details: claimDetails }
        : claim
    ));

    resetClaimForm();
    setSelectedClaimId(null);
    setIsDialogOpen(false);
  };

  const handleDeleteClaim = (id: string) => {
    setClaims(claims.filter(claim => claim.id !== id));
  };

  const editClaim = (claim: Claim) => {
    setClaimText(claim.text);
    setClaimStatus(claim.status);
    setClaimDetails(claim.details || '');
    setSelectedClaimId(claim.id);
    setIsDialogOpen(true);
  };

  // Auto-verify claims using Gemini
  async function handleAutoVerifyClaims() {
    if (!taskStore.finalReport || taskStore.finalReport.trim().length === 0) {
      toast.error("No article content to verify");
      return;
    }

    if (taskStore.sources.length === 0 && taskStore.tasks.length === 0) {
      toast.error("No sources or learnings available for verification");
      return;
    }

    setIsAutoVerifying(true);

    try {
      const { apiKey, apiProxy } = useSettingStore.getState();

      if (!apiKey) {
        toast.error("API key is required for claim verification");
        return;
      }

      // Get learnings from tasks
      const learnings = taskStore.tasks
        .filter((t) => t.state === "completed" && t.learning)
        .map((t) => t.learning);

      toast.info("Analyzing article and verifying claims...", { duration: 3000 });

      const verifiedClaims = await verifyClaimsWithGemini(
        taskStore.finalReport,
        taskStore.sources,
        learnings,
        {
          apiKey,
          baseURL: apiProxy || "/api/ai/google/v1beta",
        }
      );

      if (verifiedClaims.length === 0) {
        toast.warning("No factual claims could be extracted from the article");
        return;
      }

      // Convert verified claims to the Claim format used by the component
      const newClaims: Claim[] = verifiedClaims.map((vc: ClaimVerification, idx: number) => ({
        id: `auto-${Date.now()}-${idx}`,
        text: vc.claim,
        status: vc.status as VerificationStatus,
        details: vc.evidence.length > 0
          ? `Confidence: ${vc.confidence}% | Evidence: ${vc.evidence.map(e =>
              `${e.supports ? '✓' : '✗'} ${e.excerpt.substring(0, 100)}${e.excerpt.length > 100 ? '...' : ''}`
            ).join('; ')}`
          : `Confidence: ${vc.confidence}%`
      }));

      // Replace existing claims with auto-verified ones
      setClaims(newClaims);

      // Show summary
      const summary = getVerificationSummary(verifiedClaims);
      toast.success(
        `Verified ${summary.total} claims: ${summary.verified} verified, ${summary.disputed} disputed, ${summary.unverified} unverified, ${summary.false} false. Verification rate: ${summary.verificationRate}%`,
        { duration: 5000 }
      );
    } catch (error) {
      console.error("Auto-verification failed:", error);
      toast.error("Failed to verify claims. Please try again.");
    } finally {
      setIsAutoVerifying(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 mb-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              {selectedClaimId ? "Edit Claim" : "Add Claim"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedClaimId ? "Edit Claim" : "Add Verified Claim"}</DialogTitle>
              <DialogDescription>
                Add factual claims that you've verified during your research.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="claim">Claim</Label>
                <Textarea
                  id="claim"
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  placeholder="Enter the factual claim"
                  className="h-24"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Verification Status</Label>
                <Select
                  value={claimStatus}
                  onValueChange={(value) => setClaimStatus(value as VerificationStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Verification status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                    <SelectItem value="needs-context">Needs Context</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="details">Supporting Details (Optional)</Label>
                <Textarea
                  id="details"
                  value={claimDetails}
                  onChange={(e) => setClaimDetails(e.target.value)}
                  placeholder="Add supporting evidence or context"
                  className="h-24"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                resetClaimForm();
                setSelectedClaimId(null);
                setIsDialogOpen(false);
              }}>
                Cancel
              </Button>
              <Button onClick={selectedClaimId ? handleUpdateClaim : handleAddClaim}>
                {selectedClaimId ? "Update" : "Add"} Claim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={isAutoVerifying || !taskStore.finalReport}
                onClick={handleAutoVerifyClaims}
              >
                {isAutoVerifying ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Radar className="mr-2 h-4 w-4" />
                    Auto-verify Claims
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Use AI to automatically extract and verify factual claims from your article</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {claims.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Verified Claims</h4>
          <div className="space-y-2">
            {claims.map((claim) => (
              <div key={claim.id} className="flex items-start gap-2 p-2 border rounded">
                <ClaimVerificationStatus status={claim.status} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{claim.text}</p>
                  {claim.details && (
                    <p className="text-xs text-muted-foreground mt-1">{claim.details}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => editClaim(claim)}
                  >
                    <FileEdit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClaim(claim.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default ClaimsVerificationPanel;
