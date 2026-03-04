import { useItems, useUpdateItem } from "@/hooks/use-items";
import { ItemCard } from "@/components/item-card";
import { ShoppingBag, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShoppingList() {
  const { data: items, isLoading } = useItems();
  const updateMutation = useUpdateItem();

  const shoppingItems = items?.filter(item => item.inShoppingList) || [];

  const handleCheckOff = (id: number) => {
    updateMutation.mutate({
      id,
      inShoppingList: false,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary/50" />
        <p className="font-medium animate-pulse">Loading your list...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="text-center sm:text-left pt-4 pb-2 border-b border-border/50">
        <h1 className="text-3xl sm:text-5xl font-bold font-display text-foreground flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 justify-center sm:justify-start">
          <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
          Shopping List
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          {shoppingItems.length === 0 
            ? "Your list is completely clear."
            : `You have ${shoppingItems.length} item${shoppingItems.length === 1 ? '' : 's'} to pick up.`}
        </p>
      </div>

      {shoppingItems.length > 0 ? (
        <div className="space-y-3">
          {shoppingItems.map((item) => (
            <div key={item.id} className="animate-in fade-in zoom-in-95 duration-300">
              <ItemCard item={item} viewMode="list" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-gradient-to-b from-card to-secondary/20 rounded-3xl border border-border/50 shadow-sm mt-8 min-h-[400px]">
          <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold font-display text-foreground mb-3">All caught up!</h3>
          <p className="text-muted-foreground text-lg max-w-sm mb-8">
            You don't have anything on your shopping list right now.
          </p>
          <Button asChild className="hover-lift rounded-xl px-8 h-12 text-base">
            <a href="/database">Browse Database</a>
          </Button>
        </div>
      )}
    </div>
  );
}
