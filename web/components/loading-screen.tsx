import { Loader } from '@/components/loader';
import { cn } from '@/lib/cn';

export function LoadingScreen({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-1 items-center justify-center py-24',
        className,
      )}
    >
      <Loader />
    </div>
  );
}
