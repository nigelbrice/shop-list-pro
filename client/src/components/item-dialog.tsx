import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema, type Item, type InsertItem } from "@shared/schema";
import { useCreateItem, useUpdateItem } from "@/hooks/use-items";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";

interface ItemDialogProps {
  item?: Item;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ItemDialog({ item, trigger, open, onOpenChange }: ItemDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  
  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!item;

  const form = useForm<InsertItem>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      name: "",
      notes: "",
      imageUrl: "",
      inShoppingList: false,
    },
  });

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (dialogOpen) {
      if (item) {
        form.reset({
          name: item.name,
          notes: item.notes || "",
          imageUrl: item.imageUrl || "",
          inShoppingList: item.inShoppingList,
        });
      } else {
        form.reset({
          name: "",
          notes: "",
          imageUrl: "",
          inShoppingList: false,
        });
      }
    }
  }, [dialogOpen, item, form]);

  const onSubmit = async (data: InsertItem) => {
    if (isEditing && item) {
      await updateMutation.mutateAsync({ id: item.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="hover-lift">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[500px] border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditing ? "Edit Item" : "Create New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the details of your item below." 
              : "Add a new item to your database to use in shopping lists."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. Organic Avocados"
                {...form.register("name")}
                className="bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:bg-background transition-colors"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Brand preferences, aisles, or quantity..."
                {...form.register("notes")}
                className="resize-none min-h-[100px] bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:bg-background transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/image.jpg"
                {...form.register("imageUrl")}
                className="bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:bg-background transition-colors"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/30">
              <div className="space-y-0.5">
                <Label htmlFor="inShoppingList" className="text-base">Add to Shopping List</Label>
                <p className="text-sm text-muted-foreground">
                  Include this item in your active shopping list right away.
                </p>
              </div>
              <Switch
                id="inShoppingList"
                checked={form.watch("inShoppingList")}
                onCheckedChange={(checked) => form.setValue("inShoppingList", checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="hover-lift min-w-[120px]">
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Item"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
