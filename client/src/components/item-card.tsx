import { useState } from "react";
import { Package, MoreVertical, Pencil, Trash2, Loader2, Check } from "lucide-react";
import type { Item } from "@shared/schema";
import { useUpdateItem, useDeleteItem } from "@/hooks/use-items";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "./item-dialog";

interface ItemCardProps {
  item: Item;
  viewMode?: "grid" | "list";
}

export function ItemCard({ item, viewMode = "grid" }: ItemCardProps) {
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const toggleShoppingList = () => {
    updateMutation.mutate({
      id: item.id,
      inShoppingList: !item.inShoppingList,
    });
  };

  const isList = viewMode === "list";

  return (
    <>
      <div 
        className={cn(
          "group relative bg-card rounded-2xl border border-border/40 overflow-hidden transition-all duration-300",
          item.inShoppingList ? "shadow-md shadow-primary/5 border-primary/20" : "hover:border-border/80 hover:shadow-lg hover:shadow-black/5",
          isList ? "flex flex-row items-center p-3 sm:p-4 gap-4" : "flex flex-col flex-1"
        )}
      >
        {/* Actions Dropdown */}
        <div className={cn(
          "absolute z-10 transition-opacity duration-200",
          isList ? "right-2 top-1/2 -translate-y-1/2" : "top-3 right-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background focus-ring">
                <MoreVertical className="w-4 h-4 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 p-2 rounded-xl shadow-xl border-border/50">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="rounded-lg cursor-pointer">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={() => deleteMutation.mutate(item.id)}
                className="text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Image / Thumbnail */}
        <div className={cn(
          "bg-secondary/30 flex items-center justify-center overflow-hidden shrink-0",
          isList ? "w-16 h-16 rounded-xl" : "w-full aspect-[4/3]"
        )}>
          {item.imageUrl && !imageError ? (
            <img 
              src={item.imageUrl} 
              alt={item.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <Package className="w-8 h-8 text-muted-foreground/50" />
          )}
        </div>

        {/* Content */}
        <div className={cn(
          "flex flex-col flex-1",
          isList ? "justify-center mr-10" : "p-5"
        )}>
          <h3 className={cn(
            "font-bold text-foreground transition-colors",
            isList ? "text-base" : "text-lg mb-1"
          )}>
            {item.name}
          </h3>
          
          {!isList && item.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-4 flex-1">
              {item.notes}
            </p>
          )}

          {isList && item.notes && (
            <p className="text-xs text-muted-foreground truncate max-w-[250px] sm:max-w-[400px]">
              {item.notes}
            </p>
          )}

          {!isList && (
            <div className="mt-auto pt-4 border-t border-border/40">
              <Button 
                onClick={toggleShoppingList}
                disabled={updateMutation.isPending}
                variant={item.inShoppingList ? "secondary" : "default"}
                className={cn(
                  "w-full rounded-xl font-medium transition-all duration-300",
                  item.inShoppingList ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "hover-lift"
                )}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : item.inShoppingList ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    On List
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to List
                  </>
                )}
              </Button>
            </div>
          )}
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
