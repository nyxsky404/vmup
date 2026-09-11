import { Loader } from '@/components/loader';

export function LoadingScreen() {
  return (
    <div className="flex min-h-[40vh] flex-1 items-center justify-center py-24">
      <Loader />
    </div>
  );
}
