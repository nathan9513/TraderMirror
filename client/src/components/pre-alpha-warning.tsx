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
      title: "🚨 ZONA PERICOLO IN VISTA! 🚨",
      message: "Benvenuto anima coraggiosa! Stai per entrare nel far west dello sviluppo software. Questa versione pre-alpha è così instabile che fa sembrare un castello di carte più solido di Fort Knox.",
      color: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
    },
    {
      icon: <Bug className="w-6 h-6 text-red-500" />,
      title: "🐛 Safari dei Bug! 🐛",
      message: "Incontrerai più bug di un campeggio estivo! Le funzioni potrebbero sparire senza preavviso, i dati potrebbero svanire nel vuoto, e i pulsanti potrebbero ribellarsi ai tuoi clic.",
      color: "border-red-500 bg-red-50 dark:bg-red-900/20"
    },
    {
      icon: <Zap className="w-6 h-6 text-purple-500" />,
      title: "⚡ Solo per Sviluppo! ⚡",
      message: "Questa versione è destinata solo a sviluppatori masochisti. Se ti aspetti un'esperienza fluida, sei nel posto sbagliato. Pensala come 'test software estremo'.",
      color: "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
    },
    {
      icon: <Skull className="w-6 h-6 text-orange-500" />,
      title: "💀 Usa a Tuo Rischio e Pericolo! 💀",
      message: "Procedendo, riconosci che qualsiasi perdita di dati, angoscia mentale o improvvisi impulsi di buttare il computer dalla finestra sono interamente di tua responsabilità. Ti abbiamo avvertito!",
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
              <strong>Avviso Finale:</strong> Questo software è più sperimentale del laboratorio di uno scienziato pazzo. 
              Procedi solo se hai senso dell'umorismo e basse aspettative!
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <span className="text-xs text-gray-500">
              {step + 1} di {warnings.length}
            </span>
          </div>
          <div className="space-x-2">
            {step > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSkip}
              >
                Ho Capito, Salta!
              </Button>
            )}
            <Button 
              onClick={handleNext}
              className={step === warnings.length - 1 ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {step === warnings.length - 1 ? "Entra a Tuo Rischio e Pericolo!" : "Prossimo Avviso"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}