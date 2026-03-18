import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pin, PinOff, Pencil, Trash2, Globe, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { websitesApi } from '@/lib/api/websites';
import type { Website, CreateWebsiteInput } from '@/types/prompt';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const ICON_OPTIONS = ['🌐', '💻', '🚀', '📊', '📈', '🎯', '⚡', '🔥', '💼', '🛒', '📱', '🎨', '📝', '🔧', '🏠', '🤖'];
const COLOR_OPTIONS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export default function Websites() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateWebsiteInput>({
    name: '',
    url: '',
    description: '',
    icon: '🌐',
    color: '#8b5cf6',
  });

  const { data: websites, isLoading } = useQuery({
    queryKey: ['websites'],
    queryFn: async () => {
      const { data, error } = await websitesApi.list();
      if (error) throw error;
      return (data || []) as Website[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWebsiteInput) => {
      const { error } = await websitesApi.create(input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast.success('Website added');
      closeDialog();
    },
    onError: () => toast.error('Failed to add website'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateWebsiteInput> }) => {
      const { error } = await websitesApi.update(id, input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast.success('Website updated');
      closeDialog();
    },
    onError: () => toast.error('Failed to update website'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await websitesApi.delete(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast.success('Website deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete website'),
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await websitesApi.togglePin(id, isPinned);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    },
  });

  function openCreateDialog() {
    setEditingId(null);
    setForm({ name: '', url: '', description: '', icon: '🌐', color: '#8b5cf6' });
    setDialogOpen(true);
  }

  function openEditDialog(website: Website) {
    setEditingId(website.id);
    setForm({
      name: website.name,
      url: website.url || '',
      description: website.description || '',
      icon: website.icon,
      color: website.color,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ name: '', url: '', description: '', icon: '🌐', color: '#8b5cf6' });
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const pinned = websites?.filter(w => w.is_pinned) || [];
  const unpinned = websites?.filter(w => !w.is_pinned) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Websites</h2>
          <p className="text-muted-foreground">Organize your prompts by website or project</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Website
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Website' : 'Add Website'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the website details.' : 'Add a new website to organize your prompts.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Website"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the website..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`h-9 w-9 rounded-lg border text-lg flex items-center justify-center transition-colors ${
                      form.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={`h-9 w-9 rounded-lg border-2 transition-all ${
                      form.color === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : websites && websites.length > 0 ? (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Pinned</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map(renderCard)}
              </div>
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">All Websites</h3>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unpinned.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              No websites yet. Add your first website to organize your prompts.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Website
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => setDeleteId(open ? deleteId : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Website</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this website? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function renderCard(website: Website) {
    return (
      <Card key={website.id} className="group relative overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: website.color }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">{website.icon}</span>
              <CardTitle className="text-base truncate cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/improve')}>
                {website.name}
              </CardTitle>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => pinMutation.mutate({ id: website.id, isPinned: !website.is_pinned })}>
                {website.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(website)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog open={deleteId === website.id} onOpenChange={(open) => setDeleteId(open ? website.id : null)}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Website</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{website.name}&quot;? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate(website.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          {website.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{website.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {website.url && (
              <span className="flex items-center gap-1 truncate">
                <ExternalLink className="h-3 w-3 shrink-0" />
                {website.url.replace(/^https?:\/\//, '')}
              </span>
            )}
            <span>{website.prompt_count} prompts</span>
            {website.last_used_at && (
              <span className="ml-auto">{format(new Date(website.last_used_at), 'MMM d')}</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
}
