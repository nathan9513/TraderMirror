import { BUILD_INFO } from "@/lib/build-info";

interface WatermarkProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export function Watermark({ position = 'bottom-right', className = '' }: WatermarkProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 pointer-events-none select-none ${className}`}>
      <div className="bg-orange-100/90 dark:bg-orange-900/50 backdrop-blur-sm border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 shadow-lg">
        <div className="text-xs space-y-1 text-orange-800 dark:text-orange-200">
          <div className="flex items-center space-x-2">
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-bold">
              PRE-ALPHA
            </span>
            <span className="font-mono font-medium">
              Build {BUILD_INFO.fullVersion}
            </span>
          </div>
          <div className="text-[10px] text-orange-700 dark:text-orange-300 max-w-[200px] leading-tight">
            This version is intended for development purposes only.
            Not suitable for production use.
          </div>
          <div className="text-[9px] text-orange-600 dark:text-orange-400 font-medium">
            Developed by NatGio
          </div>
        </div>
      </div>
    </div>
  );
}

export function InlineWatermark({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-2 py-1 rounded text-xs font-medium">
        PRE-ALPHA
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
        Build {BUILD_INFO.fullVersion}
      </span>
    </div>
  );
}