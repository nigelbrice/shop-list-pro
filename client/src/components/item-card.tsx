import { useState } from "react";
import { Package, MoreVertical, Pencil, Trash2, Loader2, Check, Plus, Store } from "lucide-react";
import type { Item } from "@shared/schema";
import { useUpdateItem, useDeleteItem } from "@/hooks/use-items";
import { useStoreContext } from "@/context/store-context";
import { useStores, useStoreList, useAddToStoreList, useRemoveFromStoreList } from "@/hooks/use-stores";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ItemDialog } from "./item-dialog";

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const deleteMutation = useDeleteItem();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { selectedStoreId } = useStoreContext();
  const { data: stores } = useStores();

  const effectiveStoreId = item.defaultStoreId ?? selectedStoreId;
  const { data: storeList } = useStoreList(effectiveStoreId);

  const listItemId = storeList?.find(li => li.itemId === item.id)?.id ?? null;
  const isOnList = listItemId != null;

  const effectiveStore = stores?.find(s => s.id === effectiveStoreId);

  const addToListMutation = useAddToStoreList(effectiveStoreId);
  const removeFromListMutation = useRemoveFromStoreList(effectiveStoreId);
  const isListPending = addToListMutation.isPending || removeFromListMutation.isPending;

  const handleToggleList = () => {
    if (!effectiveStoreId) return;
    if (isOnList) {
      removeFromListMutation.mutate(listItemId);
    } else {
      addToListMutation.mutate({ itemId: item.id, quantity: item.quantity });
    }
  };

  const buttonLabel = () => {
    if (isListPending) return null;
    if (isOnList) return effectiveStore ? `In ${effectiveStore.name} list` : "On List";
    if (effectiveStore) return `Add to ${effectiveStore.name}`;
    return "Add to List";
  };

  return (
    <>
      <div
        className={cn(
          "group relative bg-card rounded-2xl border border-border/40 overflow-hidden transition-all duration-300",
          isOnList ? "shadow-md shadow-primary/5 border-primary/20" : "hover:border-border/80 hover:shadow-lg hover:shadow-black/5",
          "flex flex-col flex-1"
        )}
        data-testid={`item-card-${item.id}`}
      >
        <div className="absolute z-10 top-3 right-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background focus-ring" data-testid={`button-menu-${item.id}`}>
                <MoreVertical className="w-4 h-4 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 p-2 rounded-xl shadow-xl border-border/50">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="rounded-lg cursor-pointer" data-testid={`menu-edit-${item.id}`}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                onClick={() => deleteMutation.mutate(item.id)}
                className="text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer"
                disabled={deleteMutation.isPending}
                data-testid={`menu-delete-${item.id}`}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="w-full aspect-[4/3] bg-secondary/30 flex items-center justify-center overflow-hidden shrink-0">
          {item.imageUrl && !imageError ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <Package className="w-4 h-4 text-muted-foreground/50" />
          )}
        </div>

        <div className="flex flex-col flex-1 p-5">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {item.category && (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${item.id}`}>
                {item.category}
              </Badge>
            )}
            {effectiveStore && (
              <Badge variant="outline" className="text-xs text-primary/70 border-primary/20 bg-primary/5 gap-1" data-testid={`badge-store-${item.id}`}>
                <Store className="w-2.5 h-2.5" />
                {effectiveStore.name}
              </Badge>
            )}
          </div>

          <h3 className="font-bold text-foreground text-lg mb-1" data-testid={`text-name-${item.id}`}>
            {item.name}
          </h3>
          {item.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-4 flex-1">
              {item.notes}
            </p>
          )}

          <div className="mt-auto pt-4 border-t border-border/40">
            {effectiveStoreId ? (
              <Button
                onClick={handleToggleList}
                disabled={isListPending}
                variant={isOnList ? "secondary" : "default"}
                className={cn(
                  "w-full rounded-xl font-medium transition-all duration-300",
                  isOnList ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "hover-lift"
                )}
                data-testid={`button-toggle-list-${item.id}`}
              >
                {isListPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isOnList ? (
                  <><Check className="w-4 h-4 mr-2" />{buttonLabel()}</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" />{buttonLabel()}</>
                )}
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="w-full rounded-xl font-medium"
              >
                <a href="/">Select a store first</a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <ItemDialog
        item={item}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
}
