import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/PageHeader';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Compass className="h-6 w-6" />
        <span className="font-mono text-sm">404</span>
      </div>
      <PageHeader
        title="Page not found"
        description="This route does not exist in the NepalVerse viewer."
        className="justify-center border-none pb-0 text-center"
      />
      <Button asChild variant="outline">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
