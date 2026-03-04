import { useState, useEffect, useCallback } from "react";
import { useItems, useReorderItems } from "@/hooks/use-items";
import { ItemCard } from "@/components/item-card";
import { ShoppingBag, Loader2, CheckCircle2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "@shared/schema";

function SortableItem({ item }: { item: Item }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-grab active:cursor-grabbing transition-colors shrink-0"
        data-testid={`drag-handle-${item.id}`}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <ItemCard item={item} viewMode="list" />
      </div>
    </div>
  );
}

export default function ShoppingList() {
  const { data: items, isLoading } = useItems();
  const reorderMutation = useReorderItems();

  const rawShoppingItems = items?.filter(item => item.inShoppingList) || [];

  const [orderedItems, setOrderedItems] = useState<Item[]>([]);

  useEffect(() => {
    if (rawShoppingItems.length === 0) {
      setOrderedItems([]);
      return;
    }
    setOrderedItems(prev => {
      const prevIds = prev.map(i => i.id);
      const newIds = rawShoppingItems.map(i => i.id);
      const addedItems = rawShoppingItems.filter(i => !prevIds.includes(i.id));
      const keptItems = prev
        .filter(i => newIds.includes(i.id))
        .map(prevItem => rawShoppingItems.find(r => r.id === prevItem.id) || prevItem);
      return [...keptItems, ...addedItems];
    });
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedItems(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate(reordered.map(i => i.id));
      return reordered;
    });
  }, [reorderMutation]);

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
          {orderedItems.length === 0 
            ? "Your list is completely clear."
            : `You have ${orderedItems.length} item${orderedItems.length === 1 ? '' : 's'} to pick up.`}
        </p>
      </div>

      {orderedItems.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedItems.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {orderedItems.map((item) => (
                <SortableItem key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
