import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Skull, Zap, Bug } from "lucide-react";
import { BUILD_INFO } from "@/lib/build-info";

interface PreAlphaWarningProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreAlphaWarning({ isOpen, onClose }: PreAlphaWarningProps) {
  const [step, setStep] = useState(0);

  const warnings = [
    {
      icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
      title: "🚨 DANGER ZONE AHEAD! 🚨",
      message: "Welcome brave soul! You're about to enter the wild west of software development. This pre-alpha version is so unstable, it makes a house of cards look like Fort Knox.",
      color: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
    },
    {
      icon: <Bug className="w-6 h-6 text-red-500" />,
      title: "🐛 Bug Safari Time! 🐛",
      message: "You'll encounter more bugs than a summer camping trip! Features may disappear without warning, data might vanish into the void, and buttons might rebel against your clicks.",
      color: "border-red-500 bg-red-50 dark:bg-red-900/20"
    },
    {
      icon: <Zap className="w-6 h-6 text-purple-500" />,
      title: "⚡ Development Only! ⚡",
      message: "This version is intended for masochistic developers only. If you're expecting a smooth experience, you're in the wrong place. Think of it as 'extreme software testing'.",
      color: "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
    },
    {
      icon: <Skull className="w-6 h-6 text-orange-500" />,
      title: "💀 Use at Your Own Risk! 💀",
      message: "By proceeding, you acknowledge that any data loss, mental anguish, or sudden urges to throw your computer out the window are entirely your responsibility. We warned you!",
      color: "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
    }
  ];

  const handleNext = () => {
    if (step < warnings.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('preAlphaWarningShown', 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('preAlphaWarningShown', 'true');
    onClose();
  };

  const currentWarning = warnings[step];

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-center">
            {currentWarning.icon}
            <span>{currentWarning.title}</span>
          </DialogTitle>
          <DialogDescription className="text-center">
            Pre-Alpha Build {BUILD_INFO.fullVersion}
          </DialogDescription>
        </DialogHeader>

        <div className={`border-2 rounded-lg p-4 ${currentWarning.color}`}>
          <p className="text-sm leading-relaxed text-center">
            {currentWarning.message}
          </p>
        </div>

        {step === warnings.length - 1 && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertDescription className="text-xs text-center">
              <strong>Final Warning:</strong> This software is more experimental than a mad scientist's laboratory. 
              Proceed only if you have a sense of humor and low expectations!
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <span className="text-xs text-gray-500">
              {step + 1} of {warnings.length}
            </span>
          </div>
          <div className="space-x-2">
            {step > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSkip}
              >
                I Get It, Skip!
              </Button>
            )}
            <Button 
              onClick={handleNext}
              className={step === warnings.length - 1 ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {step === warnings.length - 1 ? "Enter at My Own Risk!" : "Next Warning"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}