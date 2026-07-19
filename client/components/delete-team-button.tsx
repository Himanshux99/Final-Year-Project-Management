'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {mentorAllocationApi} from '@/lib/api';
type Props = {
  groupId: string;
};

export function DeleteTeamButton({ groupId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await mentorAllocationApi.removeTeam(groupId);
      setOpen(false);
      router.refresh();
      router.push('/dashboard/faculty');
    } catch (error) {
      console.error(error);
      setError('Could not delete the team.');
    } finally {
      setLoading(false);
      
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Team</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this team?</DialogTitle>
          <DialogDescription>
            This will remove the mentor assignment and delete related approval,
            review, evaluation, and attachment records for this team.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button className="bg-red-500 hover:bg-red-900" onClick={handleDelete} disabled={loading}>
            {loading ? 'Removing...' : 'Remove Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}